-- ============================================
-- Tighten ReadyLayerRun RLS (remove sandbox bypass)
-- ============================================
--
-- Rationale:
-- Previous policy allowed SELECT on any row with sandboxId IS NOT NULL.
-- That is unsafe as it can lead to cross-tenant / cross-user visibility if
-- sandbox runs ever contain user-supplied content or identifiers.
--
-- This migration removes the sandboxId bypass and restricts access to runs
-- that are tied to repositories in organizations the current user belongs to.
--
-- Generated: 2026-01-08
-- ============================================

ALTER TABLE "ReadyLayerRun" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "readylayer_run_repo_access" ON "ReadyLayerRun";

CREATE POLICY "readylayer_run_repo_access" ON "ReadyLayerRun"
  FOR ALL
  USING (
    "repositoryId" IS NOT NULL AND EXISTS (
      SELECT 1
      FROM "Repository"
      WHERE "Repository".id = "ReadyLayerRun"."repositoryId"
        AND public.is_org_member("Repository"."organizationId")
    )
  );

