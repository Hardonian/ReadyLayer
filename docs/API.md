# API Additions

## Provenance

### POST `/api/provenance/v1/ingest`
Ingest provenance pack content from ReadyLayer or external agent systems.

### GET `/api/provenance/v1/packs`
List provenance packs scoped to the authenticated user's organizations.

Query options:
- `runId`
- `correlationId`
- `repo` + `prNumber`

### GET `/api/provenance/v1/packs/:id`
Fetch a provenance pack. Returns redacted summary by default. Set `?raw=true` (admin/owner or `provenance:write` API scope required) for raw payload.

### GET `/api/provenance/v1/packs/:id/export`
Download deterministic evidence ZIP containing:
- `manifest.json`
- `run.json`
- `review.json`
- `tests.json`
- `docs.json`
- `evidence_bundle.json`
- `provenance/provenance_pack.json`
- `provenance/attachments/*`
- `policy/effective_policy.json`

## Security and tenancy
- Organization resolution is always server-side from run/repo context.
- Caller-provided org identifiers are ignored.
- Read operations require organization membership.
- External writes require elevated role or `provenance:write` API key scope.
