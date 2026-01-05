-- ============================================
-- Audit Hardening Migration
-- ============================================
--
-- Adds hash chaining and integrity fields to AuditLog.
-- This makes the audit trail tamper-evident.
--
-- Generated: 2026-01-05
-- ============================================

-- Add new columns to AuditLog
ALTER TABLE "AuditLog" 
ADD COLUMN IF NOT EXISTS "previousHash" TEXT,
ADD COLUMN IF NOT EXISTS "hash" TEXT,
ADD COLUMN IF NOT EXISTS "signature" TEXT,
ADD COLUMN IF NOT EXISTS "actorIp" TEXT,
ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Create index for hash chaining verification
CREATE INDEX IF NOT EXISTS "AuditLog_hash_idx" ON "AuditLog"("hash");
CREATE INDEX IF NOT EXISTS "AuditLog_previousHash_idx" ON "AuditLog"("previousHash");

-- Function to calculate hash (can be used for DB-side verification, though app usually does it)
-- We rely on the application layer to enforce the chain for now to avoid complex triggers.

-- Update comments
COMMENT ON COLUMN "AuditLog"."previousHash" IS 'Hash of the immediately preceding audit entry for this organization';
COMMENT ON COLUMN "AuditLog"."hash" IS 'SHA-256 hash of (previousHash + payload + timestamp)';
