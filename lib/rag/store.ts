/**
 * RAG Store Implementation
 * 
 * Supabase Postgres + pgvector store with lexical fallback
 */

import { prisma } from '../prisma';
import { env } from '../env';
import { hashContent } from './hash';
import { chunkText, estimateTokenCount } from './chunking';
import { getEmbeddingsProvider } from './providers/embeddings';
import type {
  RagDocumentInput,
  RagIngestResult,
  RagQuery,
  RagResult,
  RagStore,
  SourceType,
} from './types';
import { randomUUID } from 'crypto';

/**
 * Supabase Postgres Vector Store
 */
export class SupabasePgVectorStore implements RagStore {
  private embeddingsProvider = getEmbeddingsProvider();
  private maxChunksPerDoc: number;

  constructor() {
    this.maxChunksPerDoc = env.RAG_MAX_CHUNKS_PER_DOC || 100;
  }

  async upsertDocumentAndChunks(
    input: RagDocumentInput
  ): Promise<RagIngestResult> {
    const contentHash = hashContent(input.content);

    // Check if document already exists (idempotent)
    const existingDoc = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "RagDocument"
      WHERE "organizationId" = ${input.organizationId}
        AND "sourceType" = ${input.sourceType}
        AND "sourceRef" = ${input.sourceRef}
        AND "contentHash" = ${contentHash}
      LIMIT 1
    `.catch(() => []);

    let documentId: string;
    let embeddingStatus: 'pending' | 'completed' | 'failed' | 'disabled' = 'disabled';

    if (existingDoc.length > 0) {
      // Document exists, return existing
      documentId = existingDoc[0].id;
      const existing = await prisma.$queryRaw<Array<{ embeddingStatus: string }>>`
        SELECT "embeddingStatus" FROM "RagDocument" WHERE id = ${documentId}
      `.catch(() => []);
      
      let status: 'pending' | 'completed' | 'failed' | 'disabled' = 'disabled';
      if (existing.length > 0) {
        const dbStatus = existing[0].embeddingStatus;
        if (dbStatus === 'completed' || dbStatus === 'pending' || dbStatus === 'failed' || dbStatus === 'disabled') {
          status = dbStatus;
        }
      }
      embeddingStatus = status;
      
      // Count existing chunks
      const chunkCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint as count FROM "RagChunk" WHERE "documentId" = ${documentId}
      `.catch(() => [{ count: BigInt(0) }]);

      // Determine mode based on embedding status
      const existingMode: 'vector' | 'lexical' | 'disabled' = 
        (status === 'completed' || status === 'pending') ? 'vector' : 'lexical';
      
      return {
        documentId,
        chunksStored: Number(chunkCount[0]?.count || 0),
        mode: existingMode,
        embeddingStatus: status,
      };
    }

    // Chunk the content
    const chunks = chunkText(input.content);
    
    if (chunks.length > this.maxChunksPerDoc) {
      throw new Error(
        `Document exceeds maximum chunks (${chunks.length} > ${this.maxChunksPerDoc})`
      );
    }

    // Generate embeddings if provider is available
    let embeddings: number[][] = [];
    let mode: 'vector' | 'lexical' | 'disabled' = 'disabled';

    if (this.embeddingsProvider.isAvailable()) {
      try {
        const chunkContents = chunks.map((c) => c.content);
        embeddings = await this.embeddingsProvider.embed(chunkContents);
        embeddingStatus = embeddings.length > 0 ? 'completed' : 'failed';
        mode = 'vector';
      } catch (error) {
        // Embedding failed, fall back to lexical
        embeddingStatus = 'failed';
        mode = 'lexical';
        // Log but don't throw - we can still store without embeddings
        console.warn('Embedding generation failed, using lexical fallback:', error);
      }
    } else {
      mode = 'lexical';
      embeddingStatus = 'disabled';
    }

    // Create document
    const docResult = await prisma.$executeRaw`
      INSERT INTO "RagDocument" (
        id, "organizationId", "repositoryId", "sourceType", "sourceRef",
        "contentHash", title, metadata, "embeddingStatus", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text,
        ${input.organizationId},
        ${input.repositoryId || null},
        ${input.sourceType},
        ${input.sourceRef},
        ${contentHash},
        ${input.title || null},
        ${JSON.stringify(input.metadata || {})}::jsonb,
        ${embeddingStatus},
        NOW(),
        NOW()
      )
      RETURNING id
    `.catch(async () => {
      // If insert fails, try to get existing
      const existing = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "RagDocument"
        WHERE "organizationId" = ${input.organizationId}
          AND "sourceType" = ${input.sourceType}
          AND "sourceRef" = ${input.sourceRef}
          AND "contentHash" = ${contentHash}
        LIMIT 1
      `;
      return existing.length > 0 ? [{ id: existing[0].id }] : [];
    });

    if (!docResult || (Array.isArray(docResult) && docResult.length === 0)) {
      throw new Error('Failed to create document');
    }

    documentId = Array.isArray(docResult)
      ? (docResult[0] as { id: string }).id
      : (docResult as unknown as { id: string }).id;

    // Insert chunks with embeddings
    // Use Supabase client for vector operations (handles vector type properly)
    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      const embedding = embeddings[index];
      const tokenCount = estimateTokenCount(chunk.content);
      const chunkId = randomUUID();

      try {
        if (embedding && embedding.length > 0) {
          // Insert with embedding using raw SQL (pgvector requires special handling)
          // Format: '[1,2,3,...]'::vector(1536)
          const embeddingStr = `[${embedding.join(',')}]`;
          
          await prisma.$executeRawUnsafe(`
            INSERT INTO "RagChunk" (
              id, "organizationId", "documentId", "chunkIndex",
              content, "tokenCount", embedding, metadata, "createdAt"
            ) VALUES (
              $1::text,
              $2::text,
              $3::text,
              $4::integer,
              $5::text,
              $6::integer,
              $7::vector(1536),
              $8::jsonb,
              NOW()
            )
          `,
            chunkId,
            input.organizationId,
            documentId,
            chunk.index,
            chunk.content,
            tokenCount,
            embeddingStr,
            JSON.stringify(input.metadata || {})
          );
        } else {
          // No embedding, insert without vector using Prisma
          await prisma.$executeRaw`
            INSERT INTO "RagChunk" (
              id, "organizationId", "documentId", "chunkIndex",
              content, "tokenCount", metadata, "createdAt"
            ) VALUES (
              ${chunkId}::text,
              ${input.organizationId}::text,
              ${documentId}::text,
              ${chunk.index}::integer,
              ${chunk.content}::text,
              ${tokenCount}::integer,
              ${JSON.stringify(input.metadata || {})}::jsonb,
              NOW()
            )
          `;
        }
      } catch (error) {
        console.error(`Failed to insert chunk ${chunk.index}:`, error);
        // Continue with other chunks - partial success is acceptable
      }
    }

    return {
      documentId,
      chunksStored: chunks.length,
      mode,
      embeddingStatus,
    };
  }

  async querySimilar(query: RagQuery): Promise<RagResult[]> {
    const topK = query.topK || 10;

    // Try vector search first if embeddings are available
    if (this.embeddingsProvider.isAvailable()) {
      try {
        // Generate query embedding
        const queryEmbeddings = await this.embeddingsProvider.embed([query.queryText]);
        
        if (queryEmbeddings.length > 0 && queryEmbeddings[0].length > 0) {
          // Use SQL function for vector search
          const embeddingArray = queryEmbeddings[0];
          const embeddingStr = `[${embeddingArray.join(',')}]`;
          const sourceTypesFilter = query.filters?.sourceTypes || null;
          
          const results = await prisma.$queryRawUnsafe<Array<{
            id: string;
            document_id: string;
            chunk_index: number;
            content: string;
            source_type: string;
            source_ref: string;
            similarity: number;
            metadata: unknown;
          }>>(`
            SELECT * FROM rag_match_chunks(
              $1::text,
              $2::vector(1536),
              $3::integer,
              $4::text,
              $5::text[]
            )
          `,
            query.organizationId,
            embeddingStr,
            topK,
            query.repositoryId || null,
            sourceTypesFilter
          ).catch(() => []);

          if (results && results.length > 0) {
            return results.map((r) => ({
              id: r.id,
              documentId: r.document_id,
              chunkIndex: r.chunk_index,
              content: r.content,
              sourceType: r.source_type as SourceType,
              sourceRef: r.source_ref,
              similarity: r.similarity,
              metadata: (r.metadata as Record<string, unknown>) || {},
            }));
          }

          if (results.length > 0) {
            return results.map((r) => ({
              id: r.id,
              documentId: r.document_id,
              chunkIndex: r.chunk_index,
              content: r.content,
              sourceType: r.source_type as SourceType,
              sourceRef: r.source_ref,
              similarity: r.similarity,
              metadata: (r.metadata as Record<string, unknown>) || {},
            }));
          }
        }
      } catch (error) {
        // Vector search failed, fall back to lexical
        console.warn('Vector search failed, using lexical fallback:', error);
      }
    }

    // Lexical fallback search
    const sourceTypesFilter = query.filters?.sourceTypes || null;
    
    const results = await prisma.$queryRawUnsafe<Array<{
      id: string;
      document_id: string;
      chunk_index: number;
      content: string;
      source_type: string;
      source_ref: string;
      similarity: number;
      metadata: unknown;
    }>>(`
      SELECT * FROM rag_search_chunks_lexical(
        $1::text,
        $2::text,
        $3::integer,
        $4::text,
        $5::text[]
      )
    `,
      query.organizationId,
      query.queryText,
      topK,
      query.repositoryId || null,
      sourceTypesFilter
    ).catch(() => []);

    if (!results || results.length === 0) {
      return [];
    }

    return results.map((r) => ({
      id: r.id,
      documentId: r.document_id,
      chunkIndex: r.chunk_index,
      content: r.content,
      sourceType: r.source_type as SourceType,
      sourceRef: r.source_ref,
      similarity: r.similarity,
      metadata: (r.metadata as Record<string, unknown>) || {},
    }));
  }
}

/**
 * Get RAG store instance
 */
export function getRagStore(): RagStore {
  return new SupabasePgVectorStore();
}
