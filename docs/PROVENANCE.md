# Provenance Packs

ReadyLayer now captures and stores AI Provenance Packs for internal runs and external agent systems.

## Schema

- `ProvenancePack`: run/repo linkage, source system, redaction level, payload hash, prompt hashes, tool call summary.
- `ProvenanceArtifact`: typed attachment records with content hash.
- `DataRetentionPolicy` extensions:
  - `provenanceEnabled`
  - `provenanceRedactionDefault`
  - `provenanceAllowRawStorage`
  - `provenanceMaxPayloadKB`
  - `provenanceRetentionDays`

## Ingest API

`POST /api/provenance/v1/ingest`

Example:

```json
{
  "repository": { "provider": "github", "fullName": "acme/repo" },
  "run": { "runId": "clxyz", "correlationId": "run_123", "prNumber": 10, "prSha": "abc" },
  "sourceSystem": "checkpoints",
  "agent": { "name": "checkpoint-agent", "version": "0.9.1", "provider": "custom" },
  "redactionLevel": "safe",
  "payload": {
    "prompts": ["..."],
    "transcript": "...",
    "toolCalls": [{ "tool": "search", "durationMs": 51 }],
    "metadata": { "session": "abc" }
  },
  "attachments": [
    { "kind": "tool_call", "mimeType": "application/json", "json": { "name": "search" } }
  ]
}
```

## Access model

- Read: organization members.
- External ingest: organization admins/owners or API keys with `provenance:write` scope.
- Raw payload retrieval is permission gated (`raw=true`) and otherwise redacted/summarized.

## Export

`GET /api/provenance/v1/packs/:id/export`

Returns deterministic ZIP containing run summaries, evidence bundle snapshot, policy snapshot, provenance payload, and attachment files with manifest hashes.
