/**
 * Secrets Management
 * 
 * Centralized secrets encryption/decryption
 * Uses new crypto module with key rotation support
 */

import { encryptToString, decryptFromString, isEncrypted, redactSecret } from '../crypto';
import { logger } from '../../observability/logging';

/**
 * Decrypt installation access token
 * Handles both encrypted and plaintext (legacy) tokens
 * Never logs the token value
 */
export function decryptToken(encryptedToken: string): string {
  if (!encryptedToken) {
    return '';
  }

  try {
    // If not encrypted, return as-is (legacy data)
    if (!isEncrypted(encryptedToken)) {
      logger.warn({ tokenPreview: redactSecret(encryptedToken) }, 'Decrypting plaintext token (legacy)');
      return encryptedToken;
    }

    return decryptFromString(encryptedToken);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      { err: error instanceof Error ? error : new Error(errorMessage), tokenPreview: redactSecret(encryptedToken) },
      'Token decryption failed'
    );
    throw new Error(`Failed to decrypt token: ${errorMessage}`);
  }
}

/**
 * Encrypt installation access token
 * Never logs the token value
 */
export function encryptToken(plaintextToken: string): string {
  if (!plaintextToken) {
    return '';
  }

  try {
    return encryptToString(plaintextToken);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      { err: error instanceof Error ? error : new Error(errorMessage), tokenPreview: redactSecret(plaintextToken) },
      'Token encryption failed'
    );
    throw new Error(`Failed to encrypt token: ${errorMessage}`);
  }
}

// Re-export crypto functions for backward compatibility
export { encryptToString as encrypt, decryptFromString as decrypt, isEncrypted, redactSecret } from '../crypto';
