/**
 * Cryptographic Waiver Signing and Verification Service
 * 
 * Provides tamper-proof digital signature generation (HMAC-SHA256)
 * and verification for policy waivers, supporting offline verification,
 * verifiable tokens (rlw_*), and tamper detection.
 */

import { createHmac, timingSafeEqual } from 'crypto';

export interface WaiverPayload {
  waiverId: string;
  organizationId: string;
  repositoryId?: string | null;
  ruleId: string;
  scope: 'repo' | 'branch' | 'path';
  scopeValue?: string | null;
  reason: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string | null;
}

export interface SignedWaiverCertificate {
  version: '1.0';
  algorithm: 'HMAC-SHA256';
  keyId: string;
  issuedAt: string;
  signature: string;
  payload: WaiverPayload;
  token: string;
}

export interface WaiverVerificationResult {
  valid: boolean;
  isExpired: boolean;
  reason?: string;
  payload?: WaiverPayload;
  algorithm?: string;
  issuedAt?: string;
  expiresAt?: Date | null;
}

const MINIMUM_SIGNING_KEY_BYTES = 32;

/**
 * Resolve waiver signing secret from environment
 */
export function getWaiverSigningSecret(customSecret?: string): string {
  const secret = customSecret ||
    process.env.WAIVER_SIGNING_KEY ||
    process.env.READY_LAYER_MASTER_KEY ||
    process.env.READY_LAYER_KMS_KEY ||
    process.env.ENCRYPTION_KEY;

  if (!secret) {
    throw new Error(
      'Waiver signing is not configured. Set WAIVER_SIGNING_KEY or READY_LAYER_MASTER_KEY.'
    );
  }

  if (Buffer.byteLength(secret, 'utf8') < MINIMUM_SIGNING_KEY_BYTES) {
    throw new Error(
      `Waiver signing key must contain at least ${MINIMUM_SIGNING_KEY_BYTES} bytes`
    );
  }

  return secret;
}

/**
 * Deterministically serialize a waiver payload into a canonical string for signing.
 */
export function serializeCanonicalWaiver(payload: WaiverPayload): string {
  const normRepo = payload.repositoryId ? payload.repositoryId.trim() : '';
  const normScopeVal = payload.scopeValue ? payload.scopeValue.trim() : '';
  const normExpires = payload.expiresAt ? new Date(payload.expiresAt).toISOString() : '';
  const normCreated = new Date(payload.createdAt).toISOString();

  // Canonical representation format
  return [
    `v1`,
    `id:${payload.waiverId}`,
    `org:${payload.organizationId}`,
    `repo:${normRepo}`,
    `rule:${payload.ruleId}`,
    `scope:${payload.scope}`,
    `scopeVal:${normScopeVal}`,
    `author:${payload.createdBy}`,
    `created:${normCreated}`,
    `expires:${normExpires}`,
    `reason:${payload.reason.trim()}`,
  ].join('|');
}

/**
 * Sign a waiver payload using HMAC-SHA256.
 */
export function signWaiver(
  payload: WaiverPayload,
  options?: { secret?: string; keyId?: string; issuedAt?: string }
): SignedWaiverCertificate {
  const secret = getWaiverSigningSecret(options?.secret);
  const keyId = options?.keyId || 'v1';
  const issuedAt = options?.issuedAt || new Date().toISOString();

  const canonicalString = serializeCanonicalWaiver(payload);
  const dataToSign = `${keyId}|${issuedAt}|${canonicalString}`;

  const hmac = createHmac('sha256', secret);
  hmac.update(dataToSign, 'utf8');
  const signature = hmac.digest('hex');

  const container = {
    p: payload,
    iat: issuedAt,
  };
  const tokenPayloadEncoded = Buffer.from(JSON.stringify(container), 'utf8').toString('base64url');
  const sigEncoded = Buffer.from(signature, 'hex').toString('base64url');
  const token = `rlw_${keyId}_${tokenPayloadEncoded}.${sigEncoded}`;

  return {
    version: '1.0',
    algorithm: 'HMAC-SHA256',
    keyId,
    issuedAt,
    signature,
    payload,
    token,
  };
}

/**
 * Verify a waiver signature against a waiver payload.
 */
export function verifyWaiverSignature(
  payload: WaiverPayload,
  signature: string,
  options?: { secret?: string; keyId?: string; issuedAt?: string }
): WaiverVerificationResult {
  try {
    const secret = getWaiverSigningSecret(options?.secret);
    const keyId = options?.keyId || 'v1';

    // Check expiration
    let isExpired = false;
    let expiresAt: Date | null = null;
    if (payload.expiresAt) {
      expiresAt = new Date(payload.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) {
        return {
          valid: false,
          isExpired: false,
          reason: 'Malformed expiresAt timestamp',
        };
      }
      if (expiresAt.getTime() <= Date.now()) {
        isExpired = true;
      }
    }

    const canonicalString = serializeCanonicalWaiver(payload);

    // If issuedAt is supplied, verify against that, or calculate with options if specified
    const issuedAt = options?.issuedAt;
    let signatureMatches = false;

    if (issuedAt) {
      const dataToSign = `${keyId}|${issuedAt}|${canonicalString}`;
      const expectedHmac = createHmac('sha256', secret).update(dataToSign, 'utf8').digest();
      const providedHmac = Buffer.from(signature, 'hex');

      if (expectedHmac.length === providedHmac.length && timingSafeEqual(expectedHmac, providedHmac)) {
        signatureMatches = true;
      }
    } else {
      // If issuedAt was not passed separately, check direct signature or fallback match
      const candidateIssued = payload.createdAt ? new Date(payload.createdAt).toISOString() : '';
      const candidates = [
        `${keyId}|${candidateIssued}|${canonicalString}`,
        `${keyId}||${canonicalString}`,
        canonicalString,
      ];

      for (const candidate of candidates) {
        const expectedHmac = createHmac('sha256', secret).update(candidate, 'utf8').digest();
        const providedHmac = Buffer.from(signature, 'hex');
        if (expectedHmac.length === providedHmac.length && timingSafeEqual(expectedHmac, providedHmac)) {
          signatureMatches = true;
          break;
        }
      }
    }

    if (!signatureMatches) {
      return {
        valid: false,
        isExpired,
        reason: 'Cryptographic signature mismatch; waiver payload has been modified or forged',
      };
    }

    if (isExpired) {
      return {
        valid: false,
        isExpired: true,
        reason: `Waiver expired on ${expiresAt?.toISOString()}`,
        payload,
        expiresAt,
      };
    }

    return {
      valid: true,
      isExpired: false,
      payload,
      algorithm: 'HMAC-SHA256',
      expiresAt,
    };
  } catch (error) {
    return {
      valid: false,
      isExpired: false,
      reason: error instanceof Error ? error.message : 'Unknown signature verification error',
    };
  }
}

/**
 * Verify a standalone signed waiver token (rlw_...)
 */
export function verifyWaiverToken(
  token: string,
  secretKey?: string
): WaiverVerificationResult {
  try {
    if (!token || !token.startsWith('rlw_')) {
      return {
        valid: false,
        isExpired: false,
        reason: 'Invalid token prefix; expected rlw_*',
      };
    }

    // Format: rlw_[keyId]_[payloadBase64Url].[sigBase64Url]
    const parts = token.slice(4).split('.');
    if (parts.length !== 2) {
      return {
        valid: false,
        isExpired: false,
        reason: 'Invalid token format; expected header_payload.signature',
      };
    }

    const [headerAndPayload, sigEncoded] = parts;
    const separatorIdx = headerAndPayload.indexOf('_');
    if (separatorIdx === -1) {
      return {
        valid: false,
        isExpired: false,
        reason: 'Missing keyId in token',
      };
    }

    const keyId = headerAndPayload.slice(0, separatorIdx);
    const payloadEncoded = headerAndPayload.slice(separatorIdx + 1);

    const decodedJson = Buffer.from(payloadEncoded, 'base64url').toString('utf8');
    const parsed = JSON.parse(decodedJson) as { p?: WaiverPayload; iat?: string };
    const payload = (parsed.p ? parsed.p : (parsed as unknown as WaiverPayload));
    const issuedAt = parsed.iat;
    const signature = Buffer.from(sigEncoded, 'base64url').toString('hex');

    return verifyWaiverSignature(payload, signature, { secret: secretKey, keyId, issuedAt });
  } catch (error) {
    return {
      valid: false,
      isExpired: false,
      reason: error instanceof Error ? error.message : 'Failed to decode signed token',
    };
  }
}
