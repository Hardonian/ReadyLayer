/**
 * GitHub App Webhook Signature Rotation & Replay Defense
 *
 * Supports zero-downtime secret rotation across active and retiring webhook secrets:
 * - Format: "v1:secret1,v2:secret2" or comma-separated lists
 * - Replay attack prevention with sliding 5-minute timestamp window & nonce deduplication
 */

import { verifyHmacSignature, secureCompare } from '../security/webhook-signature';
import { logger } from '../../observability/logging';

export interface SecretVersion {
  version: string;
  secret: string;
}

export interface VerificationResult {
  valid: boolean;
  matchedVersion?: string;
  error?: string;
}

export interface ReplayValidationResult {
  valid: boolean;
  error?: string;
  timestamp?: number;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 10000;

class NonceReplayCache {
  private cache = new Map<string, number>();

  /**
   * Checks if an identifier (nonce or signature-digest) has already been seen.
   * If fresh, stores it with expiration.
   */
  public isReplayed(key: string, now: number = Date.now()): boolean {
    this.cleanup(now);

    if (this.cache.has(key)) {
      return true;
    }

    // Limit memory usage
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, now);
    return false;
  }

  private cleanup(now: number): void {
    if (this.cache.size < 500) return;
    for (const [key, timestamp] of this.cache.entries()) {
      if (now - timestamp > FIVE_MINUTES_MS) {
        this.cache.delete(key);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const webhookNonceCache = new NonceReplayCache();

/**
 * Parses multi-secret rotation configuration strings.
 * Examples:
 * - "v1:secret_alpha,v2:secret_beta"
 * - "secret_alpha,secret_beta"
 * - "single_secret"
 */
export function parseRotatedSecrets(secretConfig?: string): SecretVersion[] {
  if (!secretConfig || !secretConfig.trim()) {
    return [];
  }

  const entries = secretConfig.split(',').map((s) => s.trim()).filter(Boolean);
  return entries.map((entry, index) => {
    const colonIndex = entry.indexOf(':');
    if (colonIndex > 0) {
      const version = entry.substring(0, colonIndex).trim();
      const secret = entry.substring(colonIndex + 1).trim();
      return { version, secret };
    }
    return {
      version: `v${index + 1}`,
      secret: entry,
    };
  });
}

/**
 * Retrieves candidate secrets from explicit arguments or environment variables.
 */
export function getGitHubWebhookCandidateSecrets(explicitSecret?: string): SecretVersion[] {
  const candidates: SecretVersion[] = [];

  if (explicitSecret) {
    candidates.push(...parseRotatedSecrets(explicitSecret));
  }

  const envRotated = process.env.GITHUB_WEBHOOK_SECRETS;
  if (envRotated) {
    candidates.push(...parseRotatedSecrets(envRotated));
  }

  const envSingle = process.env.GITHUB_WEBHOOK_SECRET;
  if (envSingle && !candidates.some((c) => secureCompare(c.secret, envSingle))) {
    candidates.push({ version: 'env_default', secret: envSingle });
  }

  return candidates;
}

/**
 * Verifies webhook payload against a rotated list of secrets using constant-time comparison.
 */
export function verifySignatureWithRotation(
  payload: string,
  signature: string,
  candidateSecrets: SecretVersion[],
  prefix: string = 'sha256='
): VerificationResult {
  if (!payload || !signature || candidateSecrets.length === 0) {
    return { valid: false, error: 'MISSING_PAYLOAD_OR_SECRETS' };
  }

  for (const candidate of candidateSecrets) {
    if (verifyHmacSignature(payload, signature, candidate.secret, prefix)) {
      return {
        valid: true,
        matchedVersion: candidate.version,
      };
    }
  }

  return { valid: false, error: 'SIGNATURE_MISMATCH' };
}

/**
 * Validates timestamp freshness (within 5 minutes) and optional nonce freshness.
 */
export function validateWebhookTimestampAndNonce(
  timestampStr?: string | null,
  nonce?: string | null,
  maxSkewMs: number = FIVE_MINUTES_MS
): ReplayValidationResult {
  if (!timestampStr) {
    return { valid: true }; // Timestamp header is optional in standard GitHub webhooks
  }

  const rawNum = Number(timestampStr);
  if (Number.isNaN(rawNum) || rawNum <= 0) {
    return { valid: false, error: 'INVALID_TIMESTAMP_FORMAT' };
  }

  // Handle both second-based and millisecond-based unix timestamps
  const timestamp = rawNum < 1e11 ? rawNum * 1000 : rawNum;
  const now = Date.now();
  const skew = Math.abs(now - timestamp);

  if (skew > maxSkewMs) {
    return {
      valid: false,
      error: `TIMESTAMP_OUT_OF_BOUNDS: Clock skew ${Math.round(skew / 1000)}s exceeds tolerance`,
    };
  }

  if (nonce) {
    if (nonce.trim().length === 0) {
      return { valid: false, error: 'EMPTY_NONCE' };
    }

    const replayKey = `${nonce}:${timestamp}`;
    if (webhookNonceCache.isReplayed(replayKey, now)) {
      return { valid: false, error: 'REPLAYED_NONCE' };
    }
  }

  return { valid: true, timestamp };
}

/**
 * High-level verifier combining multi-secret rotation and replay defense.
 */
export function verifyRotatedGitHubWebhook(
  payload: string,
  headers: {
    signature: string;
    timestamp?: string | null;
    nonce?: string | null;
  },
  explicitSecret?: string
): VerificationResult {
  // 1. Replay defense check
  const replayCheck = validateWebhookTimestampAndNonce(headers.timestamp, headers.nonce);
  if (!replayCheck.valid) {
    logger.warn({ error: replayCheck.error }, 'Webhook replay defense check failed');
    return { valid: false, error: replayCheck.error };
  }

  // 2. Secret candidates resolution
  const candidateSecrets = getGitHubWebhookCandidateSecrets(explicitSecret);
  if (candidateSecrets.length === 0) {
    return { valid: false, error: 'NO_SECRETS_CONFIGURED' };
  }

  // 3. Signature verification with rotation
  const sigResult = verifySignatureWithRotation(payload, headers.signature, candidateSecrets, 'sha256=');

  if (sigResult.valid && headers.signature) {
    // Also record the signature in replay cache to prevent replaying identical signed payloads within the window
    if (webhookNonceCache.isReplayed(`sig:${headers.signature}`)) {
      return { valid: false, error: 'REPLAYED_SIGNATURE' };
    }
  }

  return sigResult;
}
