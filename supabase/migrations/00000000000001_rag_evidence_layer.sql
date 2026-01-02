-- ============================================
-- ReadyLayer Evidence RAG Layer Migration
-- ============================================
-- 
-- Adds pgvector extension and RAG tables for evidence retrieval
-- Safe to run multiple times - uses IF NOT EXISTS patterns
-- 
-- Generated: 2024-12-30
-- Purpose: Enable Evidence RAG for Review Guard, Test Engine, Doc Sync
-- 
-- ============================================

-- ============================================
-- Extensions
-- ============================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm for trigram-based lexical search fallback
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- Tables
-- ============================================

-- RAG Documents Table
-- Stores metadata about documents ingested into the evidence index
CREATE TABLE IF NOT EXISTS "RagDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "repositoryId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "title" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB,
    "embeddingStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RagDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RagDocument_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RagDocument_sourceType_check" CHECK ("sourceType" IN ('pr_diff', 'repo_file', 'review_result', 'policy_doc', 'test_precedent', 'doc_convention')),
    CONSTRAINT "RagDocument_embeddingStatus_check" CHECK ("embeddingStatus" IN ('pending', 'completed', 'failed', 'disabled')),
    CONSTRAINT "RagDocument_contentHash_check" CHECK (length("contentHash") > 0),
    CONSTRAINT "RagDocument_organizationId_sourceType_sourceRef_contentHash_key" UNIQUE ("organizationId", "sourceType", "sourceRef", "contentHash")
);

-- RAG Chunks Table
-- Stores chunked content with optional embeddings
CREATE TABLE IF NOT EXISTS "RagChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "embedding" vector(1536),
    "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RagChunk_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RagChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "RagDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RagChunk_chunkIndex_check" CHECK ("chunkIndex" >= 0),
    CONSTRAINT "RagChunk_content_check" CHECK (length("content") > 0),
    CONSTRAINT "RagChunk_documentId_chunkIndex_key" UNIQUE ("documentId", "chunkIndex")
);

-- ============================================
-- Indexes
-- ============================================

-- RAG Document Indexes
CREATE INDEX IF NOT EXISTS "RagDocument_organizationId_idx" ON "RagDocument"("organizationId");
CREATE INDEX IF NOT EXISTS "RagDocument_repositoryId_idx" ON "RagDocument"("repositoryId");
CREATE INDEX IF NOT EXISTS "RagDocument_sourceType_idx" ON "RagDocument"("sourceType");
CREATE INDEX IF NOT EXISTS "RagDocument_embeddingStatus_idx" ON "RagDocument"("embeddingStatus");
CREATE INDEX IF NOT EXISTS "RagDocument_createdAt_idx" ON "RagDocument"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "RagDocument_organizationId_repositoryId_idx" ON "RagDocument"("organizationId", "repositoryId");
CREATE INDEX IF NOT EXISTS "RagDocument_metadata_idx" ON "RagDocument" USING GIN ("metadata");

-- RAG Chunk Indexes
CREATE INDEX IF NOT EXISTS "RagChunk_organizationId_idx" ON "RagChunk"("organizationId");
CREATE INDEX IF NOT EXISTS "RagChunk_documentId_idx" ON "RagChunk"("documentId");
CREATE INDEX IF NOT EXISTS "RagChunk_organizationId_documentId_idx" ON "RagChunk"("organizationId", "documentId");

-- Vector similarity index (IVFFlat for pgvector)
-- Note: IVFFlat requires data to exist, so we create it conditionally
-- In production, you may want to use HNSW for better performance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'RagChunk_embedding_idx'
    ) THEN
        -- Only create if vector extension is available
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
            CREATE INDEX "RagChunk_embedding_idx" ON "RagChunk" 
            USING ivfflat ("embedding" vector_cosine_ops)
            WITH (lists = 100);
        END IF;
    END IF;
END $$;

-- Trigram index for lexical fallback search
CREATE INDEX IF NOT EXISTS "RagChunk_content_trgm_idx" ON "RagChunk" 
USING GIN ("content" gin_trgm_ops);

-- ============================================
-- Helper Functions
-- ============================================

-- Vector similarity search function (tenant-safe)
CREATE OR REPLACE FUNCTION rag_match_chunks(
    p_organization_id TEXT,
    p_query_embedding vector(1536),
    p_match_count INTEGER DEFAULT 10,
    p_repository_id TEXT DEFAULT NULL,
    p_source_type_filter TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    document_id TEXT,
    chunk_index INTEGER,
    content TEXT,
    source_type TEXT,
    source_ref TEXT,
    similarity FLOAT,
    metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c."id",
        c."documentId"::TEXT,
        c."chunkIndex",
        c."content",
        d."sourceType",
        d."sourceRef",
        1 - (c."embedding" <=> p_query_embedding) AS similarity,
        c."metadata"
    FROM "RagChunk" c
    INNER JOIN "RagDocument" d ON c."documentId" = d."id"
    WHERE 
        c."organizationId" = p_organization_id
        AND c."embedding" IS NOT NULL
        AND (p_repository_id IS NULL OR d."repositoryId" = p_repository_id)
        AND (p_source_type_filter IS NULL OR d."sourceType" = ANY(p_source_type_filter))
    ORDER BY c."embedding" <=> p_query_embedding
    LIMIT p_match_count;
END;
$$;

-- Lexical search function (tenant-safe, for fallback when embeddings unavailable)
CREATE OR REPLACE FUNCTION rag_search_chunks_lexical(
    p_organization_id TEXT,
    p_query_text TEXT,
    p_match_count INTEGER DEFAULT 10,
    p_repository_id TEXT DEFAULT NULL,
    p_source_type_filter TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    document_id TEXT,
    chunk_index INTEGER,
    content TEXT,
    source_type TEXT,
    source_ref TEXT,
    similarity FLOAT,
    metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c."id",
        c."documentId"::TEXT,
        c."chunkIndex",
        c."content",
        d."sourceType",
        d."sourceRef",
        similarity(c."content", p_query_text) AS similarity,
        c."metadata"
    FROM "RagChunk" c
    INNER JOIN "RagDocument" d ON c."documentId" = d."id"
    WHERE 
        c."organizationId" = p_organization_id
        AND (p_repository_id IS NULL OR d."repositoryId" = p_repository_id)
        AND (p_source_type_filter IS NULL OR d."sourceType" = ANY(p_source_type_filter))
        AND c."content" ILIKE '%' || p_query_text || '%'
    ORDER BY similarity DESC
    LIMIT p_match_count;
END;
$$;

-- ============================================
-- Triggers
-- ============================================

-- UpdatedAt trigger for RagDocument
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ragdocument_updated_at') THEN
        CREATE TRIGGER update_ragdocument_updated_at BEFORE UPDATE ON "RagDocument"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on RAG tables
ALTER TABLE "RagDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RagChunk" ENABLE ROW LEVEL SECURITY;

-- RagDocument Policies (CRITICAL: Tenant Isolation)
DROP POLICY IF EXISTS "Users can view documents in their organizations" ON "RagDocument";
CREATE POLICY "Users can view documents in their organizations" ON "RagDocument"
    FOR SELECT USING (public.is_org_member("organizationId"));

DROP POLICY IF EXISTS "Org members can create documents" ON "RagDocument";
CREATE POLICY "Org members can create documents" ON "RagDocument"
    FOR INSERT WITH CHECK (public.is_org_member("organizationId"));

DROP POLICY IF EXISTS "Org members can update documents" ON "RagDocument";
CREATE POLICY "Org members can update documents" ON "RagDocument"
    FOR UPDATE USING (public.is_org_member("organizationId"));

DROP POLICY IF EXISTS "Org admins can delete documents" ON "RagDocument";
CREATE POLICY "Org admins can delete documents" ON "RagDocument"
    FOR DELETE USING (public.has_org_role("organizationId", 'admin'));

-- RagChunk Policies (CRITICAL: Tenant Isolation)
DROP POLICY IF EXISTS "Users can view chunks in their organizations" ON "RagChunk";
CREATE POLICY "Users can view chunks in their organizations" ON "RagChunk"
    FOR SELECT USING (public.is_org_member("organizationId"));

DROP POLICY IF EXISTS "Org members can create chunks" ON "RagChunk";
CREATE POLICY "Org members can create chunks" ON "RagChunk"
    FOR INSERT WITH CHECK (public.is_org_member("organizationId"));

DROP POLICY IF EXISTS "Org members can update chunks" ON "RagChunk";
CREATE POLICY "Org members can update chunks" ON "RagChunk"
    FOR UPDATE USING (public.is_org_member("organizationId"));

DROP POLICY IF EXISTS "Org admins can delete chunks" ON "RagChunk";
CREATE POLICY "Org admins can delete chunks" ON "RagChunk"
    FOR DELETE USING (public.has_org_role("organizationId", 'admin'));

-- ============================================
-- Migration Complete
-- ============================================

-- Verify RLS is enabled
DO $$
DECLARE
    table_record RECORD;
    rls_not_enabled TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOR table_record IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('RagDocument', 'RagChunk')
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
            AND c.relname = table_record.tablename
            AND c.relrowsecurity = true
        ) THEN
            rls_not_enabled := array_append(rls_not_enabled, table_record.tablename);
        END IF;
    END LOOP;
    
    IF array_length(rls_not_enabled, 1) > 0 THEN
        RAISE WARNING 'RLS not enabled on tables: %', array_to_string(rls_not_enabled, ', ');
    END IF;
END $$;
