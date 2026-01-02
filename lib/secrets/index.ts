/**
 * Secrets Management
 * 
 * Centralized secrets encryption/decryption
 */

export { encrypt, decrypt, isEncrypted } from './encrypt';

import { decrypt, encrypt, isEncrypted } from './encrypt';

/**
 * Decrypt installation access token
 * Handles both encrypted and plaintext (legacy) tokens
 */
export function decryptToken(encryptedToken: string): string {
  if (!encryptedToken) {
    return '';
  }

  // If not encrypted, return as-is (legacy data)
  if (!isEncrypted(encryptedToken)) {
    return encryptedToken;
  }

  return decrypt(encryptedToken);
}

/**
 * Encrypt installation access token
 */
export function encryptToken(plaintextToken: string): string {
  if (!plaintextToken) {
    return '';
  }

  return encrypt(plaintextToken);
}
