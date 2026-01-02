/**
 * Deterministic Chunking
 * 
 * Produces same chunks for same input (required for idempotency)
 */

import { env } from '../env';

export interface Chunk {
  content: string;
  index: number;
  startOffset: number;
  endOffset: number;
}

/**
 * Chunk text deterministically with overlap
 * 
 * Same input always produces same chunks
 */
export function chunkText(
  text: string,
  chunkSize: number = env.RAG_CHUNK_SIZE || 1000,
  chunkOverlap: number = env.RAG_CHUNK_OVERLAP || 200
): Chunk[] {
  if (!text || text.length === 0) {
    return [];
  }

  const chunks: Chunk[] = [];

  // Split by lines first to avoid breaking in the middle of sentences
  const lines = text.split('\n');
  let currentChunk = '';
  let chunkStartOffset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineWithNewline = i < lines.length - 1 ? line + '\n' : line;
    const potentialChunk = currentChunk + lineWithNewline;

    if (potentialChunk.length >= chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        content: currentChunk,
        index: chunks.length,
        startOffset: chunkStartOffset,
        endOffset: chunkStartOffset + currentChunk.length,
      });

      // Start new chunk with overlap
      // Find last overlap characters that end at a word boundary
      const overlapStart = Math.max(
        0,
        currentChunk.length - chunkOverlap
      );
      
      // Try to find a good break point (space, newline, punctuation)
      let actualOverlapStart = overlapStart;
      for (let j = overlapStart; j < currentChunk.length; j++) {
        const char = currentChunk[j];
        if (char === '\n' || char === ' ' || char === '.' || char === ';') {
          actualOverlapStart = j + 1;
          break;
        }
      }

      currentChunk = currentChunk.substring(actualOverlapStart) + lineWithNewline;
      chunkStartOffset = chunkStartOffset + actualOverlapStart;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk,
      index: chunks.length,
      startOffset: chunkStartOffset,
      endOffset: chunkStartOffset + currentChunk.length,
    });
  }

  return chunks;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
