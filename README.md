# ReadyLayer — Enforcement-first code review for AI-assisted teams

ReadyLayer blocks risky pull requests before they ship by enforcing security checks, test coverage, and documentation accuracy. It is built for teams adopting AI tooling who still need deterministic, auditable guardrails.

**Who it is for:** Engineering leaders, platform teams, and security-conscious teams shipping AI-assisted changes.

**Why it exists:** Traditional review bots warn after the fact. ReadyLayer enforces the rules you already rely on so PRs cannot merge until they are safe.

---

## Visual proof (real product screens)

- Home + pipeline overview (local demo)
- Review run detail view (sample repository)

> Screenshots live in `/site/assets` and are used by the repo-hosted landing page.

---

## The problem → the consequence → the solution

**Problem:** AI-assisted coding increases speed, but it also increases the chance of missing tests, unsafe patterns, and documentation drift.

**Consequence:** These gaps leak into production because warnings are easy to ignore, and reviewers do not have time to manually audit every change.

**Solution:** ReadyLayer enforces a deterministic, policy-driven gate: Review Guard (security), Test Engine (coverage), and Doc Sync (documentation). AI assistance is optional and strictly gated behind flags.

---

## What you get for free vs what’s coming later

### Free (works with no AI keys)
- Deterministic Review Guard with security and policy checks.
- Test Engine coverage enforcement for AI-touched files.
- Documentation drift detection and blocking for API changes.
- Sandbox demo runs with seeded data and no external providers.

### Paid (AI-assisted, optional)
- AI review suggestions for novel patterns.
- AI-generated tests and documentation drafts.
- Prioritized remediation guidance.

AI paths are disabled by default and must be explicitly enabled before they run.

---

## 5-minute quickstart

### Local (free tier)

```bash
npm install
cp .env.example .env
npm run db:reconcile
npm run dev
```

Open `http://localhost:3000` and try the sandbox demo at `/dashboard/runs/sandbox`.

### Cloud (free tier)

1. Provision PostgreSQL and Redis.
2. Set environment variables from `.env.example`.
3. Run:

```bash
npm run db:reconcile
npm run build
npm run start
```

---

## Architecture overview

ReadyLayer is a composable open-core system:

- **Core Engine**: Review Guard, Test Engine, Doc Sync (deterministic, free tier).
- **Adapters**: Git providers, CI, and repository connectors.
- **AI Layer (optional)**: Pluggable providers behind feature flags.
- **UI + API**: Next.js app and API routes with explicit auth boundaries.

See `/architecture` for deeper diagrams and `/docs` for operational details.

---

## Security & trust posture

- Least-privilege access for data and integrations.
- Deterministic free tier: no AI calls, no external provider dependency.
- Paid AI features require explicit enablement and scoped keys.
- Audit trails for every run and stage.

See `SECURITY.md` for disclosure and reporting guidelines.

---

## Landing page

A static marketing site lives in `/site` and can be deployed as-is:

```bash
cd site
# deploy index.html + assets to any static host
```

---

## Roadmap (near-term, honest)

- Hardened policy templates for common compliance regimes.
- First-class CI check suites with signed attestations.
- Paid AI review summaries and remediation plans.

---

## Contributing

See `CONTRIBUTING.md` for development guidelines and contribution steps.

---

## License

Apache-2.0. See `LICENSE` for details.
