# Security Invariants: Tenant Isolation

This document defines the security invariants that enforce tenant isolation across the ReadyLayer platform.

## Overview

ReadyLayer implements a **multi-tenant architecture** where each Organization operates as an isolated tenant. All data access, processing, and storage MUST respect tenant boundaries.

## Tenant Model

- **Tenant Identifier**: `organizationId` (UUID)
- **Membership**: Users belong to Organizations via `OrganizationMember` table
- **Authentication**: Supabase Auth (JWT tokens)
- **Authorization**: Organization-scoped roles (owner, admin, member)

## Core Invariants

### INV-T1: All Data Access MUST Be Tenant-Scoped

**Statement**: Every database query MUST filter by `organizationId` where the resource is tenant-scoped.

**Enforcement Points**:

| Layer | Implementation | File |
|-------|---------------|------|
| Database | RLS policies using `is_org_member()` | `supabase/migrations/00000000000003_rls_policies.sql` |
| Application | TenantScopedRepository pattern | `lib/tenant-scoped-repository.ts` |
| API | `requireOrganization` middleware | `lib/authz.ts` |
| Assertion | `requireTenantAccess()` helper | `lib/tenant-isolation.ts` |

**Code Example**:
```typescript
// ✅ CORRECT: Always scope by organizationId
const repos = await prisma.repository.findMany({
  where: { organizationId: user.organizationIds[0] },
});

// ❌ WRONG: No tenant scope - will fail at RLS level
const repos = await prisma.repository.findMany();
```

### INV-T2: Cross-Tenant Access MUST Be Denied

**Statement**: A user MUST NOT be able to read, write, or delete resources belonging to another organization.

**Enforcement Layers**:

1. **RLS Policies** (Database Level)
   - Block unauthorized queries at the database level
   - Uses `public.is_org_member(organizationId)` helper
   - Files: `supabase/migrations/*_rls_policies.sql`

2. **API Authorization** (Application Level)
   - `canAccessRepository()`, `canAccessReview()`, `canAccessRun()` functions
   - File: `lib/authz.ts`

3. **Tenant-Scoped Repositories** (Repository Level)
   - Compile-time and runtime enforcement
   - Throws `TenantIsolationError` on violations
   - File: `lib/tenant-scoped-repository.ts`

**Test**: `scripts/test-tenant-isolation-comprehensive.ts`

### INV-T3: Tenant Context MUST Be Authenticated

**Statement**: All operations requiring tenant context MUST have an authenticated user.

**Implementation**: `lib/auth.ts`
- `requireAuth()` - Throws `UnauthorizedError` if not authenticated
- `getAuthenticatedUser()` - Returns `AuthUser` with `organizationIds`
- `canAccessOrganization()` - Verifies membership

### INV-T4: API Keys MUST Respect Tenant Boundaries

**Statement**: API keys inherit the tenant memberships of their associated user.

**Implementation**: `lib/auth.ts`
- API key authentication queries user's organization memberships
- Scopes are determined by key permissions, not tenant

### INV-T5: Background Jobs MUST Be Tenant-Scoped

**Statement**: Background jobs MUST operate within the tenant context they were created for.

**Implementation**: `lib/jobs.ts`
- `enqueueJob()` requires `tenantId` parameter
- Jobs store `organizationId` for RLS filtering
- Workers verify tenant context before processing

## Tenant-Scoped Resources

All resources with an `organizationId` field are tenant-scoped:

| Resource | File | RLS Policy |
|----------|------|-----------|
| Repository | `prisma/schema.prisma` | `repository_org_members_only` |
| Review | `prisma/schema.prisma` | `review_org_members_only` |
| Job | `prisma/schema.prisma` | `job_org_members_only` |
| GovernanceRun | `prisma/schema.prisma` | `governancerun_org_members_only` |
| PolicyPack | `prisma/schema.prisma` | `policypack_org_members_only` |
| CostTracking | `prisma/schema.prisma` | `cost_tracking_org_members_only` |
| TokenUsage | `prisma/schema.prisma` | `tokenusage_org_members_only` |
| ProviderConfig | `prisma/schema.prisma` | `providerconfig_org_members_only` |
| Installation | `prisma/schema.prisma` | `installation_org_members_only` |
| AIAnomaly | `prisma/schema.prisma` | `aianomaly_org_members_only` |
| PredictiveAlert | `prisma/schema.prisma` | `predictivealert_org_members_only` |
| AuditLog | `prisma/schema.prisma` | `audit_log_org_members_only` |

## Enforcement Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Request                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              createAuthzMiddleware()                         │
│  - requireAuth() → Validates JWT/API key                   │
│  - requireOrganization() → Checks membership              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              TenantScopedRepository<T>                     │
│  - Enforces tenant scope on all queries                  │
│  - Throws TenantIsolationError on violations            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Prisma Client + RLS                          │
│  - Database-level tenant filtering                       │
│  - Uses is_org_member() helper                          │
└─────────────────────────────────────────────────────────────┘
```

## RLS Helper Functions

Located in `supabase/migrations/00000000000000_backend_contract_reconcile.sql`:

```sql
-- Check if current user is a member of the organization
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "OrganizationMember"
    WHERE "OrganizationMember"."organizationId" = org_id
    AND "OrganizationMember"."userId" = public.current_user_id()
  );
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user has a role in the organization
CREATE OR REPLACE FUNCTION public.has_org_role(org_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "OrganizationMember"
    WHERE "OrganizationMember"."organizationId" = org_id
    AND "OrganizationMember"."userId" = public.current_user_id()
    AND "OrganizationMember"."role" IN ('owner', 'admin')
  );
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Error Handling

**TenantIsolationError**: Thrown when cross-tenant access is attempted.

```typescript
import { TenantIsolationError, requireTenantAccess } from './lib/tenant-isolation';

try {
  requireTenantAccess(context, tenantId, 'read', 'Repository');
} catch (error) {
  if (error instanceof TenantIsolationError) {
    // Log security event
    logger.warn({
      event: 'tenant_isolation_violation_attempt',
      userId: context.userId,
      attemptedTenantId: tenantId,
    });
    // Return 403 Forbidden
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: error.message } },
      { status: 403 }
    );
  }
}
```

## Testing

All tenant isolation tests are in `scripts/test-tenant-isolation-comprehensive.ts`.

Run tests:
```bash
npx tsx scripts/test-tenant-isolation-comprehensive.ts
```

Test coverage:
- ✅ Direct repository access cross-tenant denial
- ✅ Review access isolation
- ✅ Job access isolation
- ✅ GovernanceRun isolation
- ✅ PolicyPack isolation
- ✅ CostTracking isolation
- ✅ TokenUsage isolation
- ✅ PredictiveAlert isolation
- ✅ ProviderConfig isolation
- ✅ Installation isolation
- ✅ AuditLog isolation
- ✅ API authorization enforcement

## Monitoring

Security events are logged with the `tenant_isolation` event category:

```typescript
logger.warn({
  event: 'tenant_isolation_violation_attempt',
  attemptedTenantId: tenantId,
  authorizedTenantIds: context.organizationIds,
  operation: 'read',
  resourceType: 'Repository',
  userId: context.userId,
});
```

## Compliance

This tenant isolation implementation ensures:

1. **Data Residency**: Tenant data never leaks across organization boundaries
2. **Audit Trail**: All cross-tenant attempts are logged
3. **Defense in Depth**: Multiple enforcement layers (API, Application, Database)
4. **Test Coverage**: Automated tests prove isolation works

## Revision History

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | 2026-02-06 | Initial tenant isolation enforcement |
| 1.1 | 2026-02-06 | Added comprehensive RLS policies for all tables |
