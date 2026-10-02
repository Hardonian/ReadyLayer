-- Migration: 20260301000000_audit_and_provenance_partitioning.sql
-- Description: Declarative PostgreSQL range partitioning setup for high-volume audit logs and events
-- Partitions audit_log entries and run events by created_at month to maintain bounded B-Tree index depths

-- 1. Helper function to create monthly partitions dynamically
CREATE OR REPLACE FUNCTION create_monthly_partition(
  parent_table TEXT,
  partition_name TEXT,
  start_date DATE,
  end_date DATE
) RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I
     FOR VALUES FROM (%L) TO (%L);',
    partition_name,
    parent_table,
    start_date,
    end_date
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Range-partitioned Audit Log Archive Table
CREATE TABLE IF NOT EXISTS "AuditLogPartitioned" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "details" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLogPartitioned_pkey" PRIMARY KEY ("id", "createdAt")
) PARTITION BY RANGE ("createdAt");

-- Pre-seed monthly partitions for current and upcoming operational quarters
SELECT create_monthly_partition('AuditLogPartitioned', 'audit_logs_y2026m01', '2026-01-01', '2026-02-01');
SELECT create_monthly_partition('AuditLogPartitioned', 'audit_logs_y2026m02', '2026-02-01', '2026-03-01');
SELECT create_monthly_partition('AuditLogPartitioned', 'audit_logs_y2026m03', '2026-03-01', '2026-04-01');
SELECT create_monthly_partition('AuditLogPartitioned', 'audit_logs_y2026m04', '2026-04-01', '2026-05-01');
SELECT create_monthly_partition('AuditLogPartitioned', 'audit_logs_y2026m05', '2026-05-01', '2026-06-01');
SELECT create_monthly_partition('AuditLogPartitioned', 'audit_logs_y2026m06', '2026-06-01', '2026-07-01');
SELECT create_monthly_partition('AuditLogPartitioned', 'audit_logs_y2026m07', '2026-07-01', '2026-08-01');
SELECT create_monthly_partition('AuditLogPartitioned', 'audit_logs_y2026m08', '2026-08-01', '2026-09-01');
SELECT create_monthly_partition('AuditLogPartitioned', 'audit_logs_y2026m09', '2026-09-01', '2026-10-01');
SELECT create_monthly_partition('AuditLogPartitioned', 'audit_logs_y2026m10', '2026-10-01', '2026-11-01');
SELECT create_monthly_partition('AuditLogPartitioned', 'audit_logs_y2026m11', '2026-11-01', '2026-12-01');
SELECT create_monthly_partition('AuditLogPartitioned', 'audit_logs_y2026m12', '2026-12-01', '2027-01-01');

-- Indexes on partitioned tables
CREATE INDEX IF NOT EXISTS "AuditLogPartitioned_org_created_idx"
  ON "AuditLogPartitioned" ("organizationId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AuditLogPartitioned_resource_idx"
  ON "AuditLogPartitioned" ("resourceType", "resourceId");

-- 3. Row-Level Security on partitioned archive
ALTER TABLE "AuditLogPartitioned" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_tenant_isolation" ON "AuditLogPartitioned"
  FOR SELECT
  USING (
    "organizationId" IN (
      SELECT "organizationId" FROM "OrganizationMember"
      WHERE "userId" = auth.uid()
    )
  );

COMMENT ON TABLE "AuditLogPartitioned" IS 'Monthly range-partitioned audit log table for SOC2/ISO audit log retention';
