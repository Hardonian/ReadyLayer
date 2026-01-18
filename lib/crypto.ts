/**
 * Cryptographic Functions
 *
 * Provides encryption/decryption with key rotation support
 * Uses AES-256-GCM for secure encryption at rest
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { logger } from '../observability/logging';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
// AUTH_TAG_LENGTH = 16 (128 bits, reserved for future explicit tag handling)

/**
 * Check if encryption keys are configured
 */
export function isKeyConfigured(): boolean {
  return !!(
    process.env.ENCRYPTION_KEY ||
    process.env.READY_LAYER_KMS_KEY ||
    process.env.READY_LAYER_MASTER_KEY ||
    process.env.READY_LAYER_KEYS
  );
}

/**
 * Get encryption key from environment
 * Supports multiple key sources for rotation
 */
function getEncryptionKey(): Buffer {
  // Priority order: ENCRYPTION_KEY, READY_LAYER_MASTER_KEY, READY_LAYER_KMS_KEY, READY_LAYER_KEYS
  const envKey =
    process.env.ENCRYPTION_KEY ||
    process.env.READY_LAYER_MASTER_KEY ||
    process.env.READY_LAYER_KMS_KEY ||
    process.env.READY_LAYER_KEYS;

  if (!envKey) {
    throw new Error(
      'No encryption key configured. Set one of: ENCRYPTION_KEY, READY_LAYER_MASTER_KEY, READY_LAYER_KMS_KEY, or READY_LAYER_KEYS'
    );
  }

  // If key is base64 encoded, decode it
  try {
    const decoded = Buffer.from(envKey, 'base64');
    if (decoded.length === KEY_LENGTH) {
      return decoded;
    }
  } catch {
    // Not base64, hash it
  }

  // Hash the key to get consistent 32-byte key
  return createHash('sha256').update(envKey, 'utf8').digest();
}

/**
 * Encrypt plaintext string to encrypted string
 * Format: base64(iv):base64(authTag):base64(encrypted)
 */
export function encryptToString(plaintext: string): string {
  if (!plaintext) {
    return '';
  }

  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    logger.error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
      },
      'Encryption failed'
    );
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt encrypted string to plaintext
 * Expects format: base64(iv):base64(authTag):base64(encrypted)
 */
export function decryptFromString(encrypted: string): string {
  if (!encrypted) {
    return '';
  }

  // Validate format
  if (!encrypted.includes(':')) {
    throw new Error('Invalid encrypted format: must be iv:authTag:encryptedData');
  }

  try {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format: expected 3 parts separated by colons');
    }

    const [ivBase64, authTagBase64, encryptedData] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
      },
      'Decryption failed'
    );
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if string is encrypted (has expected format)
 */
export function isEncrypted(value: string): boolean {
  if (!value) {
    return false;
  }

  // Encrypted format: iv:authTag:data (all base64)
  const parts = value.split(':');
  if (parts.length !== 3) {
    return false;
  }

  // Validate that all parts are valid base64
  try {
    for (const part of parts) {
      Buffer.from(part, 'base64');
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Redact secret for logging
 * Shows only first/last 4 chars
 */
export function redactSecret(secret: string): string {
  if (!secret || secret.length < 12) {
    return '[REDACTED]';
  }

  const first = secret.slice(0, 4);
  const last = secret.slice(-4);
  return `${first}...${last}`;
}

/**
 * Encrypt binary buffer to base64 string
 */
export function encryptBuffer(buffer: Buffer): string {
  return encryptToString(buffer.toString('base64'));
}

/**
 * Decrypt base64 string to binary buffer
 */
export function decryptBuffer(encrypted: string): Buffer {
  const decrypted = decryptFromString(encrypted);
  return Buffer.from(decrypted, 'base64');
}

/**
 * Hash value for comparison (one-way)
 */
export function hashValue(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Generate random encryption key (for key generation scripts)
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Get available key versions (for health check)
 */
export function getAvailableKeyVersions(): string[] {
  // For the simple version, we only support v1
  // The multi-key version is in lib/crypto/index.ts
  if (isKeyConfigured()) {
    return ['v1'];
  }
  return [];
}
