/**
 * Evidence RAG Layer Types
 * 
 * Type definitions for the Evidence RAG system
 */

export type SourceType =
  | 'pr_diff'
  | 'repo_file'
  | 'review_result'
  | 'policy_doc'
  | 'test_precedent'
  | 'doc_convention';

export interface RagDocumentInput {
  organizationId: string;
  repositoryId?: string;
  sourceType: SourceType;
  sourceRef: string; // e.g., pr number, file path, review id
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface RagChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount?: number;
  embedding?: number[];
  metadata: Record<string, unknown>;
}

export interface RagDocument {
  id: string;
  organizationId: string;
  repositoryId?: string;
  sourceType: SourceType;
  sourceRef: string;
  contentHash: string;
  title?: string;
  metadata: Record<string, unknown>;
  embeddingStatus: 'pending' | 'completed' | 'failed' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

export interface RagQuery {
  organizationId: string;
  repositoryId?: string;
  queryText: string;
  topK?: number;
  filters?: {
    sourceTypes?: SourceType[];
    metadata?: Record<string, unknown>;
  };
}

export interface RagResult {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  sourceType: SourceType;
  sourceRef: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface RagIngestResult {
  documentId: string;
  chunksStored: number;
  mode: 'vector' | 'lexical' | 'disabled';
  embeddingStatus: 'pending' | 'completed' | 'failed' | 'disabled';
}

export interface EmbeddingsProvider {
  embed(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
  isAvailable(): boolean;
}

export interface RagStore {
  upsertDocumentAndChunks(
    input: RagDocumentInput
  ): Promise<RagIngestResult>;
  querySimilar(query: RagQuery): Promise<RagResult[]>;
}
