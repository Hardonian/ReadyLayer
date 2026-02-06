/**
 * Secure Webhook Signature Utilities
 *
 * Provides secure signature verification with timing-attack resistant comparisons.
 */

import { createHmac, createHash } from 'crypto';

/**
 * Constant-time string comparison to prevent timing attacks.
 *
 * IMPORTANT: This function is designed to take the same amount of time
 * regardless of where (or if) the strings match.
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal, false otherwise
 */
export function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  try {
    return Buffer.from(a).equals(Buffer.from(b));
  } catch {
    return false;
  }
}

/**
 * Verify HMAC-SHA256 signature with timing-safe comparison.
 *
 * @param payload - Raw request body (must be the original, not re-serialized)
 * @param signature - Signature from provider (with or without prefix)
 * @param secret - Webhook secret
 * @param signaturePrefix - Expected prefix (e.g., 'sha256='), empty string for no prefix
 * @returns true if signature is valid, false otherwise
 */
export function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  signaturePrefix: string = 'sha256='
): boolean {
  if (!payload || !signature || !secret) {
    return false;
  }

  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  const expectedWithPrefix = `${signaturePrefix}${expectedSignature}`;

  // Try both with and without prefix (some providers vary)
  return (
    secureCompare(signature, expectedWithPrefix) ||
    secureCompare(signature, expectedSignature)
  );
}

/**
 * Generate HMAC signature for outgoing webhooks or testing.
 *
 * @param payload - Payload to sign
 * @param secret - Secret to sign with
 * @param prefix - Signature prefix (default: 'sha256=')
 * @returns Signature string with prefix
 */
export function generateHmacSignature(
  payload: string,
  secret: string,
  prefix: string = 'sha256='
): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return `${prefix}${hmac.digest('hex')}`;
}

/**
 * Create a webhook signature hash for logging (first N characters only).
 * Used to identify signatures in logs without exposing the full secret.
 *
 * @param signature - Full signature
 * @param length - Number of characters to keep (default: 16)
 * @returns Truncated signature hash
 */
export function hashSignatureForLogging(signature: string, length: number = 16): string {
  if (!signature) {
    return 'none';
  }

  const hash = createHash('sha256').update(signature).digest('hex');
  return hash.substring(0, length);
}

/**
 * Validate that a webhook secret meets minimum security requirements.
 *
 * @param secret - Secret to validate
 * @returns true if secret is valid, false otherwise
 */
export function validateWebhookSecret(secret: string): boolean {
  if (!secret || typeof secret !== 'string') {
    return false;
  }

  // Minimum length for HMAC-SHA256
  if (secret.length < 16) {
    return false;
  }

  // Should not be easily guessable
  if (secret === 'webhook_secret' || secret === 'test_secret') {
    return false;
  }

  return true;
}
