-- Provenance pack models + retention policy extensions

ALTER TABLE "DataRetentionPolicy"
  ADD COLUMN IF NOT EXISTS "provenanceRetentionDays" INTEGER NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS "provenanceMaxPayloadKB" INTEGER NOT NULL DEFAULT 512,
  ADD COLUMN IF NOT EXISTS "provenanceRedactionDefault" TEXT NOT NULL DEFAULT 'safe',
  ADD COLUMN IF NOT EXISTS "provenanceAllowRawStorage" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "provenanceEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "ProvenancePack" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "repositoryId" TEXT REFERENCES "Repository"("id") ON DELETE SET NULL,
  "runId" TEXT REFERENCES "ReadyLayerRun"("id") ON DELETE SET NULL,
  "prNumber" INTEGER,
  "prSha" TEXT,
  "correlationId" TEXT,
  "source" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "agent" JSONB NOT NULL,
  "redactionLevel" TEXT NOT NULL DEFAULT 'safe',
  "payloadEncrypted" BOOLEAN NOT NULL DEFAULT false,
  "payload" JSONB NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "promptHashes" JSONB,
  "toolCallSummary" JSONB,
  "safeSummary" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ProvenanceArtifact" (
  "id" TEXT PRIMARY KEY,
  "provenancePackId" TEXT NOT NULL REFERENCES "ProvenancePack"("id") ON DELETE CASCADE,
  "kind" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "content" TEXT,
  "jsonContent" JSONB,
  "contentHash" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "ProvenancePack_organizationId_createdAt_idx" ON "ProvenancePack"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProvenancePack_repositoryId_prNumber_idx" ON "ProvenancePack"("repositoryId", "prNumber");
CREATE INDEX IF NOT EXISTS "ProvenancePack_runId_idx" ON "ProvenancePack"("runId");
CREATE INDEX IF NOT EXISTS "ProvenancePack_correlationId_idx" ON "ProvenancePack"("correlationId");
CREATE INDEX IF NOT EXISTS "ProvenancePack_payloadHash_idx" ON "ProvenancePack"("payloadHash");
CREATE INDEX IF NOT EXISTS "ProvenanceArtifact_provenancePackId_idx" ON "ProvenanceArtifact"("provenancePackId");
CREATE INDEX IF NOT EXISTS "ProvenanceArtifact_kind_idx" ON "ProvenanceArtifact"("kind");
