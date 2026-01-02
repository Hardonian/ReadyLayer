-- ============================================
-- Encrypt Existing Installation Tokens
-- ============================================
-- 
-- This migration encrypts existing plaintext tokens in the Installation table.
-- It should be run AFTER the encryption utility is deployed.
-- 
-- NOTE: This migration requires ENCRYPTION_KEY environment variable to be set.
-- The actual encryption is done by the application code, not SQL.
-- This migration just marks tokens as needing encryption.
-- 
-- Run the encryption script separately:
--   tsx scripts/encrypt-existing-tokens.ts
-- 
-- Generated: 2026-01-02
-- ============================================

-- Add a column to track if token is encrypted (for migration tracking)
-- This is temporary and can be removed after migration is complete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Installation' 
    AND column_name = 'tokenEncrypted'
  ) THEN
    ALTER TABLE "Installation" ADD COLUMN "tokenEncrypted" BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create index for migration script
CREATE INDEX IF NOT EXISTS "Installation_tokenEncrypted_idx" ON "Installation"("tokenEncrypted") WHERE "tokenEncrypted" = FALSE;

-- Note: Actual encryption is done by application code via script
-- See: scripts/encrypt-existing-tokens.ts
