/**
 * Content Hashing for Idempotency
 * 
 * SHA-256 hashing for content deduplication
 */

import { createHash } from 'crypto';

/**
 * Hash content for idempotent ingestion
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Hash multiple pieces of content together
 */
export function hashMultiple(...contents: string[]): string {
  const combined = contents.join('\n---\n');
  return hashContent(combined);
}
