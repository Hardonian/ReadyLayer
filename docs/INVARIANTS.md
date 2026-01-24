# Repository Invariants

**Last Updated:** 2026-01-24
**Purpose:** Define and enforce non-negotiable principles across the entire ReadyLayer repository

---

## What Are Invariants?

Invariants are **immutable truths** about ReadyLayer that must hold across all files, documentation, code, and communications. They serve as consistency checks to prevent drift, contradiction, and trust erosion.

**Violation of an invariant = Bug.** Treat invariant violations like you would treat a failing test.

---

## Conceptual Invariants

### 1. Open Source First

**Invariant:** ReadyLayer OSS is the primary product, not a marketing funnel.

**Must hold:**
- ✅ All core governance logic (Review Guard, Test Engine, Doc Sync, Policy Engine) is in OSS
- ✅ OSS version is fully functional without Enterprise
- ✅ No "bait and switch" - features aren't removed from OSS to push Enterprise
- ✅ Enterprise offers operational convenience, never functional superiority

**Violations:**
- ❌ Documenting OSS features that don't exist yet as "coming soon" to delay expectations
- ❌ Removing working features from OSS to gate behind Enterprise
- ❌ Marketing OSS as a trial version of Enterprise

**Verification:** Check `docs/OSS_VS_ENTERPRISE_BOUNDARY.md` for boundaries

---

### 2. Determinism

**Invariant:** Same inputs + same policy = same outputs (cryptographically verifiable).

**Must hold:**
- ✅ Policy Engine produces identical results for identical inputs
- ✅ All decisions include audit trails (policy hash, input hash, timestamp)
- ✅ No non-deterministic behavior in core governance logic
- ✅ Random seeds are configurable, never hidden

**Violations:**
- ❌ Using random number generation in rule evaluation
- ❌ Non-deterministic LLM temperature in security scanning
- ❌ Time-dependent logic without explicit timestamp in evidence bundle
- ❌ Different results on different runs without policy/input changes

**Verification:** Review `services/policy-engine/` for determinism guarantees

---

### 3. Privacy Preservation

**Invariant:** User code never leaves infrastructure without explicit consent.

**Must hold:**
- ✅ Self-hosted mode works without external API calls
- ✅ LLM processing is opt-in, never required
- ✅ No telemetry, analytics, or phone-home in OSS
- ✅ Secrets redacted before any external transmission

**Violations:**
- ❌ Sending code snippets to analytics services
- ❌ Mandatory LLM calls for core features
- ❌ Logging user code without redaction
- ❌ Telemetry "opt-out" (must be opt-in)

**Verification:** Check `lib/secrets/redaction.ts` and telemetry settings

---

### 4. Security by Default

**Invariant:** Fail secure, not fail open.

**Must hold:**
- ✅ Critical security issues block by default
- ✅ Missing configuration fails safely (e.g., block if policy file missing)
- ✅ Unknown errors block, never approve
- ✅ Tenant isolation enforced at database level (RLS)

**Violations:**
- ❌ Allowing PRs when security scan fails
- ❌ Approving PRs if policy evaluation errors
- ❌ Logging secrets in error messages
- ❌ Defaulting to "allow" instead of "deny"

**Verification:** Review `services/policy-engine/` for default behaviors

---

### 5. Transparency & Auditability

**Invariant:** All governance decisions are inspectable and verifiable.

**Must hold:**
- ✅ Every decision includes evidence bundle (inputs, policy, outputs, hash)
- ✅ Policy rules are readable, not black-box
- ✅ Audit logs are immutable and timestamped
- ✅ Community can inspect all security rules in `services/review-guard/`

**Violations:**
- ❌ Using proprietary security rules not in OSS codebase
- ❌ Missing audit trails for governance decisions
- ❌ Obfuscating policy evaluation logic
- ❌ Logging decisions without evidence bundles

**Verification:** Check audit log schema in `prisma/schema.prisma`

---

## Architectural Invariants

### 6. Stateless Core Engines

**Invariant:** Core engines (Review Guard, Test Engine, Doc Sync) are pure functions.

**Must hold:**
- ✅ No global state in core scanning logic
- ✅ All inputs are explicit parameters
- ✅ No side effects (database writes, API calls) during scan
- ✅ Results are reproducible from inputs alone

**Violations:**
- ❌ Storing scan state in database during evaluation
- ❌ Mutating global variables in scanning logic
- ❌ Side effects in rule evaluation
- ❌ Non-deterministic caching that affects results

**Verification:** Review `services/review-guard/`, `services/test-engine/`, `services/doc-sync/`

---

### 7. Policy Versioning

**Invariant:** Policies are versioned, immutable, and auditable.

**Must hold:**
- ✅ Policy changes create new versions (never mutate existing)
- ✅ Old decisions reference exact policy version used
- ✅ Policy hashes are cryptographically verifiable
- ✅ Policy history is retained indefinitely

**Violations:**
- ❌ Editing policies in place without versioning
- ❌ Deleting old policy versions
- ❌ Referencing policies without version
- ❌ Using "latest" policy without explicit version

**Verification:** Check `prisma/schema.prisma` for PolicyPack versioning

---

### 8. Async LLM Processing

**Invariant:** LLM calls are always non-blocking.

**Must hold:**
- ✅ API returns 202 Accepted with job ID
- ✅ Results available via polling or webhook
- ✅ No synchronous LLM calls in API handlers
- ✅ Timeout enforced (default 30s per LLM call)

**Violations:**
- ❌ Blocking API response on LLM completion
- ❌ Infinite LLM call wait
- ❌ No timeout on LLM processing
- ❌ Synchronous LLM calls in request handlers

**Verification:** Review `app/api/v1/reviews/route.ts` and `services/llm/`

---

### 9. Tenant Isolation

**Invariant:** All database queries filter by `organizationId`.

**Must hold:**
- ✅ Every Prisma query includes `where: { organizationId }`
- ✅ Row-Level Security (RLS) enforced at database layer
- ✅ No cross-tenant data access
- ✅ API keys scoped to single organization

**Violations:**
- ❌ Global queries without org filter
- ❌ Admin endpoints that bypass tenant isolation
- ❌ Shared resources across organizations
- ❌ Missing `organizationId` in any data model

**Verification:** Audit all Prisma queries, check RLS policies in Supabase

---

## Language Invariants

### 10. Terminology Consistency

**Invariant:** Same words mean same things everywhere.

**Canonical Terms:**

| Use This | Not This |
|----------|----------|
| **Review Guard** | Security Scanner, Code Reviewer, Safety Check |
| **Test Engine** | Coverage Analyzer, Test Runner, Test Validator |
| **Doc Sync** | Documentation Validator, Doc Checker, Sync Engine |
| **Policy Engine** | Rule Engine, Governance Engine, Evaluator |
| **Evidence Bundle** | Audit Trail, Proof, Decision Record |
| **Organization** | Tenant, Company, Account, Workspace |
| **Policy Pack** | Policy, Ruleset, Configuration |
| **Self-Hosted** | On-Premise, Private Cloud, Local Deployment |
| **Enterprise Cloud** | Managed Service, SaaS, Hosted Version |

**Violations:**
- ❌ Using inconsistent names for same concept
- ❌ Overloading terms with multiple meanings
- ❌ Marketing names different from technical names

**Verification:** Grep for alternative terms, ensure consistency

---

### 11. OSS vs Enterprise Language

**Invariant:** OSS/Enterprise boundaries respected in all communication.

**Must hold:**
- ✅ Features in OSS never called "free tier" or "trial"
- ✅ Enterprise features called "operational conveniences"
- ✅ Never imply OSS is incomplete without Enterprise
- ✅ No pressure language around Enterprise

**Approved Language:**
- ✅ "ReadyLayer OSS is fully functional"
- ✅ "Enterprise Cloud offers operational convenience"
- ✅ "Self-hosted vs. managed infrastructure"

**Violations:**
- ❌ "Upgrade to unlock feature X"
- ❌ "Free tier" (OSS is not a tier)
- ❌ "Limited version" (OSS is not limited)
- ❌ "Try before you buy" (OSS is not a trial)

**Verification:** Review all docs, README, marketing materials

---

### 12. No Security Through Obscurity

**Invariant:** Security model is transparent, not hidden.

**Must hold:**
- ✅ All security rules documented in `services/review-guard/`
- ✅ Detection patterns are public (OWASP Top 10, secrets, etc.)
- ✅ No proprietary "secret sauce" in security scanning
- ✅ Community can audit security logic

**Violations:**
- ❌ Hiding security rules in closed-source modules
- ❌ Using undocumented heuristics
- ❌ Claiming "proprietary detection algorithms"
- ❌ Black-box security scanning

**Verification:** All security rules in OSS codebase, no external binaries

---

## Governance Invariants

### 13. No Secrets in Code

**Invariant:** Zero hardcoded credentials, API keys, or sensitive data.

**Must hold:**
- ✅ All secrets in environment variables
- ✅ `.env` files git-ignored
- ✅ No credentials in documentation examples
- ✅ Placeholder values clearly marked

**Violations:**
- ❌ API keys in code
- ❌ Database passwords in migration scripts
- ❌ Real credentials in `.env.example`
- ❌ Sensitive URLs in documentation

**Verification:** Run `grep -r "sk-" . --exclude-dir=node_modules` for API keys

---

### 14. Backwards Compatibility

**Invariant:** Breaking changes require major version bump.

**Must hold:**
- ✅ Minor versions (v1.x.0) are backwards compatible
- ✅ Deprecation warnings 6 months before removal
- ✅ Migration guides for breaking changes
- ✅ Semantic versioning strictly followed

**Violations:**
- ❌ Breaking API changes in patch versions
- ❌ Removing features without deprecation
- ❌ Silent behavior changes
- ❌ Undocumented migrations

**Verification:** Review CHANGELOG.md, API version history

---

### 15. Documentation Currency

**Invariant:** Docs reflect actual code behavior, not aspirational state.

**Must hold:**
- ✅ Features documented only when implemented
- ✅ "Coming soon" clearly marked as future
- ✅ Code examples tested and working
- ✅ No outdated screenshots or instructions

**Violations:**
- ❌ Documenting unimplemented features as current
- ❌ Outdated installation instructions
- ❌ Broken code examples
- ❌ Screenshots from old versions

**Verification:** Test all documented examples, review issue trackers

---

## Enforcement

### How to Enforce Invariants

1. **Code Review:** Every PR must be checked against invariants
2. **Automated Tests:** Add tests for invariants where possible
3. **Documentation Review:** Quarterly audit of all docs
4. **Community Reporting:** Anyone can file "Invariant Violation" issues

### Invariant Violation Issues

Label: `invariant-violation`
Priority: **High** (treat like bugs)

**Template:**
```markdown
**Invariant Violated:** [Name from this doc]

**Evidence:**
- File: [path]
- Line: [number]
- Content: [quote]

**Expected:**
[What the invariant requires]

**Suggested Fix:**
[How to resolve]
```

---

## Updating This Document

**Invariants are hard to change** - that's the point.

To add/modify an invariant:
1. File an RFC explaining why
2. Community discussion (minimum 2 weeks)
3. Approval by 2+ core maintainers
4. Update this document with changelog

**Changelog:**
- 2026-01-24: Initial invariants document created

---

## Related Documents

- [OSS vs Enterprise Boundary](./OSS_VS_ENTERPRISE_BOUNDARY.md)
- [Why Open Source](./WHY_OPEN_SOURCE.md)
- [Governance](./GOVERNANCE.md)
- [Contributing](../CONTRIBUTING.md)

---

<div align="center">

**Invariants are trust guarantees.**
Violating them erodes trust. Enforce them rigorously.

</div>
