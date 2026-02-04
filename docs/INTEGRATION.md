# Integration Architecture

## ReadyLayer Service Dependencies

ReadyLayer integrates with two primary external services:

### 1. JobForge (Background Job Queue)

**Purpose**: Reliable, Postgres-native job queue for async operations

**Consumption Pattern**:
```
ReadyLayer → JobForge RPC (Supabase) → jobforge_jobs table → Worker
```

**Integration Points**:

| Component | Usage | Location |
|-----------|-------|----------|
| Webhook Processor | Enqueue webhook delivery jobs | `workers/webhook-processor.ts:553` |
| Test Engine | Queue test generation | `workers/job-processor.ts:74` |
| Doc Sync | Queue doc generation | `workers/job-processor.ts:84` |
| Report Service | Generate multi-format reports | `lib/jobforge/enqueue.ts` |

**Key Integration Code**:
```typescript
// From workers/webhook-processor.ts
import { enqueueJob } from '@/lib/jobforge/enqueue';

await enqueueJob({
  tenant_id: organizationId,
  type: 'connector.webhook.deliver',
  payload: { target_url, event_type, data },
  idempotency_key: `webhook-${orgId}-${evalId}`,
});
```

**Configuration**:
```env
# Required
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Feature flags
JOBFORGE_INTEGRATION_ENABLED=1
JOBFORGE_BUNDLE_EXECUTION_ENABLED=0  # Experimental
```

**Runbook**: See [docs/jobforge.md](./jobforge.md)

---

### 2. TruthCore (Planned Integration)

**Purpose**: Source of truth for AI-generated code provenance and audit trails

**Status**: 🔄 Planned for Q2 2026

**Planned Consumption Pattern**:
```
ReadyLayer → TruthCore API → Immutable audit log
```

**Planned Integration Points**:

| Component | Planned Usage | Status |
|-----------|--------------|--------|
| Review Guard | Store security scan provenance | 🔄 Planned |
| Test Engine | Store test generation lineage | 🔄 Planned |
| Doc Sync | Store doc generation audit | 🔄 Planned |
| Policy Engine | Store policy evaluation hashes | 🔄 Planned |

**Placeholder Integration**:
```typescript
// lib/truthcore/client.ts (planned)
export async function recordProvenance(data: ProvenanceData) {
  // TODO: Implement TruthCore integration
  // Currently logs to local audit trail
  logger.info({ provenance: data }, 'TruthCore placeholder');
}
```

**Configuration** (Future):
```env
TRUTHCORE_API_URL=
TRUTHCORE_API_KEY=
TRUTHCORE_ENABLED=0  # Disabled until integration complete
```

---

## Integration Health Check

Run integration diagnostics:

```bash
# Check JobForge connectivity
npm run jobforge:smoke

# Check all integrations
npm run doctor

# Verify RPC functions exist
npm run db:verify
```

## Dependency Matrix

| Feature | JobForge | TruthCore | Local Fallback |
|---------|----------|-----------|----------------|
| Webhook Delivery | ✅ Required | ❌ N/A | ✅ In-memory queue |
| Test Generation | ✅ Required | 🔄 Planned | ❌ N/A |
| Doc Generation | ✅ Required | 🔄 Planned | ❌ N/A |
| Audit Logging | ❌ N/A | 🔄 Planned | ✅ Local DB |
| Provenance | ❌ N/A | 🔄 Planned | ✅ SHA-256 hashes |
| Report Gen | ✅ Required | ❌ N/A | ❌ N/A |

## Integration Testing

```bash
# Test JobForge end-to-end
npm run test:jobforge

# Test with mocked TruthCore
npm run test:truthcore:mock

# Full integration suite
npm run test:integration
```
