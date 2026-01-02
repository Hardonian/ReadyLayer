/**
 * Crypto Module - Encryption at Rest with Key Rotation
 * 
 * AES-256-GCM encryption with:
 * - Master key from env (READY_LAYER_KMS_KEY or READY_LAYER_MASTER_KEY)
 * - Key versioning for rotation readiness
 * - Multiple keys support (READY_LAYER_KEYS="v1:...;v2:...")
 * - Safe runtime decryption
 * - Logging guards (never log tokens)
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { logger } from '../../observability/logging';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

interface EncryptionPayload {
  ciphertext: string; // base64-encoded encrypted data
  iv: string; // base64-encoded IV
  tag: string; // base64-encoded auth tag
  keyVersion: string; // key version identifier
}

interface KeySet {
  [version: string]: Buffer;
}

/**
 * Load encryption keys from environment
 * Supports single key or multiple keys for rotation
 */
function loadKeys(): KeySet {
  const keys: KeySet = {};

  // Try READY_LAYER_KEYS first (multiple keys format: "v1:key1;v2:key2")
  const keysEnv = process.env.READY_LAYER_KEYS;
  if (keysEnv) {
    const keyPairs = keysEnv.split(';');
    for (const pair of keyPairs) {
      const [version, keyValue] = pair.split(':').map(s => s.trim());
      if (version && keyValue) {
        keys[version] = deriveKey(keyValue);
      }
    }
    if (Object.keys(keys).length > 0) {
      return keys;
    }
  }

  // Fall back to single key (READY_LAYER_KMS_KEY or READY_LAYER_MASTER_KEY)
  const singleKeyEnv = process.env.READY_LAYER_KMS_KEY || process.env.READY_LAYER_MASTER_KEY;
  if (singleKeyEnv) {
    keys['v1'] = deriveKey(singleKeyEnv);
    return keys;
  }

  // No key configured - return empty set (will fail gracefully)
  return {};
}

/**
 * Derive a consistent 32-byte key from a string
 */
function deriveKey(keyValue: string): Buffer {
  // If key is base64 encoded and correct length, decode it
  try {
    const decoded = Buffer.from(keyValue, 'base64');
    if (decoded.length === KEY_LENGTH) {
      return decoded;
    }
  } catch {
    // Not base64 or wrong length, hash it
  }

  // Hash the key to get consistent 32-byte key
  return createHash('sha256').update(keyValue).digest();
}

/**
 * Get the default/current key version
 */
function getDefaultKeyVersion(keys: KeySet): string {
  const versions = Object.keys(keys).sort();
  if (versions.length === 0) {
    throw new Error('No encryption keys configured');
  }
  // Use the highest version number as default
  return versions[versions.length - 1];
}

/**
 * Get key by version
 */
function getKeyByVersion(keys: KeySet, version: string): Buffer {
  const key = keys[version];
  if (!key) {
    throw new Error(`Encryption key version ${version} not found`);
  }
  return key;
}

// Cache keys (reload on access to support runtime key updates)
let cachedKeys: KeySet | null = null;

function getKeys(): KeySet {
  if (!cachedKeys) {
    cachedKeys = loadKeys();
  }
  return cachedKeys;
}

/**
 * Redact secrets from error messages and logs
 */
export function redactSecret(value: string): string {
  if (!value || value.length < 8) {
    return '[REDACTED]';
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

/**
 * Encrypt plaintext
 * Returns JSON-encoded EncryptionPayload
 */
export function encrypt(plaintext: string): EncryptionPayload {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty plaintext');
  }

  const keys = getKeys();
  if (Object.keys(keys).length === 0) {
    throw new Error(
      'No encryption keys configured. Set READY_LAYER_KMS_KEY, READY_LAYER_MASTER_KEY, or READY_LAYER_KEYS environment variable.'
    );
  }

  try {
    const keyVersion = getDefaultKeyVersion(keys);
    const key = getKeyByVersion(keys, keyVersion);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    
    const tag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      keyVersion,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      { err: error instanceof Error ? error : new Error(errorMessage) },
      'Encryption failed'
    );
    throw new Error(`Failed to encrypt data: ${errorMessage}`);
  }
}

/**
 * Decrypt payload
 * Supports multiple key versions for rotation
 */
export function decrypt(payload: EncryptionPayload | string): string {
  if (!payload) {
    throw new Error('Cannot decrypt empty payload');
  }

  // Handle legacy plaintext (for migration compatibility)
  if (typeof payload === 'string') {
    // Check if it's already encrypted format (contains colons)
    if (!payload.includes(':')) {
      logger.warn('Attempting to decrypt plaintext (legacy data)');
      return payload;
    }
    // Legacy format: iv:tag:ciphertext (no keyVersion)
    return decryptLegacy(payload);
  }

  const keys = getKeys();
  if (Object.keys(keys).length === 0) {
    throw new Error(
      'No encryption keys configured. Set READY_LAYER_KMS_KEY, READY_LAYER_MASTER_KEY, or READY_LAYER_KEYS environment variable.'
    );
  }

  try {
    const { ciphertext, iv: ivBase64, tag: tagBase64, keyVersion } = payload;
    const key = getKeyByVersion(keys, keyVersion);
    const iv = Buffer.from(ivBase64, 'base64');
    const tag = Buffer.from(tagBase64, 'base64');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      { err: error instanceof Error ? error : new Error(errorMessage) },
      'Decryption failed'
    );
    throw new Error(`Failed to decrypt data: ${errorMessage}`);
  }
}

/**
 * Decrypt legacy format (iv:tag:ciphertext without keyVersion)
 * Uses default key version
 */
function decryptLegacy(encrypted: string): string {
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format: expected iv:tag:ciphertext or JSON payload');
  }

  const keys = getKeys();
  const keyVersion = getDefaultKeyVersion(keys);
  const key = getKeyByVersion(keys, keyVersion);

  const [ivBase64, tagBase64, ciphertext] = parts;
  const iv = Buffer.from(ivBase64, 'base64');
  const tag = Buffer.from(tagBase64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * Encrypt and serialize to JSON string (for storage)
 */
export function encryptToString(plaintext: string): string {
  const payload = encrypt(plaintext);
  return JSON.stringify(payload);
}

/**
 * Decrypt from JSON string (from storage)
 */
export function decryptFromString(encrypted: string): string {
  if (!encrypted) {
    return '';
  }

  // Try parsing as JSON first (new format)
  try {
    const payload = JSON.parse(encrypted) as EncryptionPayload;
    if (payload.ciphertext && payload.iv && payload.tag && payload.keyVersion) {
      return decrypt(payload);
    }
  } catch {
    // Not JSON, try legacy format
  }

  // Fall back to legacy format or plaintext
  return decrypt(encrypted);
}

/**
 * Check if a value is encrypted (has expected format)
 */
export function isEncrypted(value: string): boolean {
  if (!value) {
    return false;
  }

  // Check for JSON format (new)
  try {
    const parsed = JSON.parse(value);
    return parsed.ciphertext && parsed.iv && parsed.tag && parsed.keyVersion;
  } catch {
    // Not JSON
  }

  // Check for legacy format (iv:tag:ciphertext)
  const parts = value.split(':');
  return parts.length === 3;
}

/**
 * Check if encryption keys are configured
 */
export function isKeyConfigured(): boolean {
  try {
    const keys = getKeys();
    return Object.keys(keys).length > 0;
  } catch {
    return false;
  }
}

/**
 * Get available key versions (for health check)
 */
export function getAvailableKeyVersions(): string[] {
  const keys = getKeys();
  return Object.keys(keys).sort();
}

/**
 * Reload keys (for key rotation)
 */
export function reloadKeys(): void {
  cachedKeys = null;
  getKeys(); // Force reload
}
