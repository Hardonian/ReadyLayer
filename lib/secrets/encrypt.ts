/**
 * Secrets Encryption Utilities
 * 
 * Encrypts/decrypts sensitive data at rest using AES-256-GCM
 * Uses environment variable ENCRYPTION_KEY (32 bytes, base64 encoded)
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { logger } from '../../observability/logging';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment
 * Derives a consistent key from ENCRYPTION_KEY env var
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (!envKey) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }

  // If key is base64 encoded, decode it
  // Otherwise, hash it to get consistent 32-byte key
  try {
    const decoded = Buffer.from(envKey, 'base64');
    if (decoded.length === KEY_LENGTH) {
      return decoded;
    }
  } catch {
    // Not base64, hash it
  }

  // Hash the key to get consistent 32-byte key
  return createHash('sha256').update(envKey).digest();
}

/**
 * Encrypt a plaintext string
 * Returns base64-encoded string: iv:authTag:encryptedData
 */
export function encrypt(plaintext: string): string {
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

    // Combine IV, auth tag, and encrypted data
    const combined = `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
    
    return combined;
  } catch (error) {
    logger.error({
      err: error instanceof Error ? error : new Error(String(error)),
    }, 'Encryption failed');
    throw new Error(`Failed to encrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt an encrypted string
 * Expects base64-encoded string: iv:authTag:encryptedData
 */
export function decrypt(encrypted: string): string {
  if (!encrypted) {
    return '';
  }

  // Check if already decrypted (for migration compatibility)
  // If it doesn't contain colons, assume it's plaintext (legacy data)
  if (!encrypted.includes(':')) {
    logger.warn('Attempting to decrypt plaintext (legacy data)');
    return encrypted;
  }

  try {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format: expected iv:authTag:encryptedData');
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
    logger.error({
      err: error instanceof Error ? error : new Error(String(error)),
    }, 'Decryption failed');
    throw new Error(`Failed to decrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a string is encrypted (has the expected format)
 */
export function isEncrypted(value: string): boolean {
  if (!value) {
    return false;
  }
  const parts = value.split(':');
  return parts.length === 3;
}
