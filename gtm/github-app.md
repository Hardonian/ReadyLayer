# ReadyLayer GitHub App Listing — Publication Draft

Publish only after the installation URL, permissions, support URL, privacy URL, and production webhook deployment have
been verified by an owner. This file is copy, not proof that a marketplace listing is live.

## Name

ReadyLayer

## Short description

Deterministic governance checks and traceable decision evidence for agent-assisted pull requests.

## Description

ReadyLayer evaluates pull-request changes against versioned policy, reports actionable findings, and records the evidence
behind each decision. Teams can start with the open-source runner or connect the GitHub workflow for a scoped evaluation.

### Repository-backed capabilities

- Deterministic local policy runner with schema-defined output
- GitHub webhook verification and replay protection
- Pull-request checks and findings
- Signed, scoped, expiring policy waivers
- Exportable evidence and provenance formats
- Credential-free deterministic sandbox

Beta capabilities must be labelled according to `lib/product/capability-catalog.ts` at publication time.

## Requested repository permissions

- **Metadata: read** — identify the installed repository.
- **Contents: read** — read the files and diff required for an enabled check.
- **Pull requests: read/write** — read pull-request context and publish feedback.
- **Checks: write** — publish the ReadyLayer check result.

Request organization-member or administration permissions only when a reviewed feature requires them. Document the data
flow and deletion behavior before adding any permission.

## Evaluation flow

1. Inspect the trust center and public evidence.
2. Run the deterministic sandbox.
3. Install on a non-production evaluation repository.
4. Start in shadow mode and review findings.
5. Enable accepted policies with a documented rollback path.

## Support and service boundary

- Source and issues: `https://github.com/Hardonian/ReadyLayer`
- Security disclosure: `https://github.com/Hardonian/ReadyLayer/blob/main/SECURITY.md`
- Public product docs: `/docs`

Do not publish a price, trial, certification, data-retention promise, language matrix, or service level until the responsible
owner has approved evidence and the linked policy is live.

## Pre-publication checklist

- [ ] GitHub App slug and installation URL verified
- [ ] Webhook signature and replay tests green
- [ ] Permissions match the deployed manifest
- [ ] Support, privacy, terms, and security links resolve
- [ ] Screenshots use deterministic fixtures and contain no customer data
- [ ] Beta labels match the capability catalog
- [ ] Rollback and incident owners assigned
