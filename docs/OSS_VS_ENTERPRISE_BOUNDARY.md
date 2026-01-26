# OSS vs. Enterprise Boundary Specification

**A legally-adjacent, developer-readable contract defining what belongs in open source forever and what may exist in Enterprise Cloud.**

---

## Purpose

This document exists to establish **explicit trust boundaries** between ReadyLayer OSS and ReadyLayer Enterprise Cloud. It protects OSS users from bait-and-switch tactics, feature gating, and degradation over time.

**Audience:**
- OSS users evaluating ReadyLayer
- Contributors deciding whether to invest time
- Enterprise customers verifying OSS viability
- Maintainers making architecture decisions

**Legal Status:**
This is not a legal contract, but it carries moral weight. Violating these boundaries would constitute a breach of community trust and justification for forking.

---

## Non-Negotiable Invariants

These principles are **permanent and binding** on the ReadyLayer project:

### 1. Core Governance Logic Remains OSS

**Invariant:** All deterministic governance logic (security scanning, test coverage analysis, documentation validation) will remain in the OSS codebase.

**What this means:**
- The Review Guard security scanner stays OSS
- The Test Engine coverage analyzer stays OSS
- The Doc Sync validator stays OSS
- The Policy Engine evaluation logic stays OSS
- The Rust policy evaluator and SARIF generator stay OSS
- All policy templates and rules stay OSS

**What this prevents:**
- Moving security rules to closed-source "Enterprise Rules Engine"
- Creating "OSS Lite" vs. "Enterprise Full" scanning
- Degrading OSS detection accuracy over time

### 2. No Telemetry or Phone-Home in OSS

**Invariant:** The OSS version will never add telemetry, analytics, tracking, or any network calls to ReadyLayer-controlled servers.

**What this means:**
- No usage statistics collection
- No "anonymous" telemetry
- No update checks to our servers
- No license validation calls
- No feature flag fetching from external services

**Exceptions:**
- LLM API calls to user-configured providers (OpenAI, Anthropic, etc.) when explicitly configured
- Git provider webhooks (GitHub, GitLab) when user installs the integration
- User-configured notification webhooks (Slack, email) when explicitly enabled

**What this prevents:**
- "Call home to enable features"
- "Anonymous usage data" collection
- Metrics gathering for competitive analysis
- Forced upgrade prompts

### 3. No Account Requirements for OSS

**Invariant:** The OSS version will never require creating an account with ReadyLayer (the company) to function.

**What this means:**
- Self-hosted instances run without ReadyLayer accounts
- No API keys from readylayer.io required
- No license activation or validation
- No "free tier" that degrades after X days

**Exceptions:**
- OAuth with third-party providers (GitHub, GitLab) when user chooses to integrate
- User-provided API keys for LLM providers (OpenAI, Anthropic) when user chooses to enable AI features

**What this prevents:**
- "Free trial" bait-and-switch
- Forced migrations to Enterprise Cloud
- Feature unlocks via account creation

### 4. OSS Will Not Degrade Over Time

**Invariant:** Existing OSS features will not be removed, crippled, or degraded to push users toward Enterprise Cloud.

**What this means:**
- Performance will not be artificially throttled
- Accuracy will not be reduced
- Limits will not be introduced retroactively (e.g., "now only scans 100 files in OSS")
- UI/UX will not be degraded to make Enterprise Cloud more appealing

**Exceptions:**
- Security fixes that change behavior (e.g., disabling insecure options)
- Deprecations with 12+ months notice and migration paths
- Breaking changes in major versions (per semantic versioning)

**What this prevents:**
- Slow degradation tactics ("OSS used to work well, but now...")
- Feature removals disguised as "refactoring"
- Artificial limitations to create Enterprise differentiation

### 5. OSS Codebase Remains Primary

**Invariant:** The OSS repository is the single source of truth. Enterprise Cloud is a **downstream consumer** of OSS, not a separate fork.

**What this means:**
- Enterprise Cloud runs the same codebase as OSS
- New features are developed in OSS first
- Bug fixes go into OSS, then deploy to Enterprise
- No "Enterprise-only" branches or private repos for core logic

**Exceptions:**
- Closed-source operational tooling (billing, support ticketing, internal monitoring) that doesn't affect governance logic
- Infrastructure-as-code for ReadyLayer's cloud deployment (not relevant to OSS users)

**What this prevents:**
- Secret features developed in private repos
- OSS becoming a "dumping ground" for outdated code
- Enterprise Cloud diverging into a superior product

---

## Explicit Boundaries

### What Lives in OSS Forever

| Capability | Why It's OSS |
|-----------|--------------|
| **Security scanning logic** | Core governance function; must be inspectable |
| **Test coverage analysis** | Core governance function; must be inspectable |
| **Documentation validation** | Core governance function; must be inspectable |
| **Policy engine evaluation** | Determinism requires auditability |
| **Policy templates** | Community benefit; prevent vendor lock-in |
| **GitHub/GitLab integrations** | Essential for workflow adoption |
| **CLI and GitHub Action** | Primary distribution mechanism |
| **Database schema** | Data portability requirement |
| **API definitions** | Interoperability requirement |
| **Configuration format** | Prevent lock-in to proprietary formats |

### What May Exist Only in Enterprise Cloud

| Capability | Why It's Enterprise-Only |
|-----------|--------------------------|
| **Managed hosting infrastructure** | Not software feature; operational service |
| **SSO integrations (SAML, Okta)** | Enterprise operational convenience; can be DIY in OSS |
| **Advanced analytics dashboards** | Operational convenience; data exportable from OSS |
| **Priority support ticketing system** | Service, not software |
| **Billing and subscription management** | Enterprise business logic, not governance logic |
| **Multi-region deployment automation** | Operational tooling, not governance feature |
| **Internal monitoring and alerting** | ReadyLayer's operational needs, not user-facing |

### Gray Areas (Decided Case-by-Case)

| Capability | Default Assumption | Decision Criteria |
|-----------|-------------------|-------------------|
| **New AI models** | OSS first | Only Enterprise if licensing prohibits OSS distribution |
| **Performance optimizations** | OSS first | Only Enterprise if tied to proprietary infrastructure |
| **New integrations** | OSS first | Only Enterprise if 3rd-party licensing requires it |
| **UI enhancements** | OSS first | Only Enterprise if purely aesthetic for hosted product |

**Decision process:**
1. Default to OSS unless clear reason otherwise
2. Discuss in public GitHub issue
3. Document rationale in this file
4. Revisit annually

---

## Enforcement Mechanisms

### 1. Community Oversight

This document is version-controlled and public. Changes require:
- Public GitHub pull request
- Explanation of why boundary is moving
- 30-day comment period
- Approval from at least 2 core maintainers
- Community consensus (measured by PR discussion)

### 2. Fork-Friendly License

Apache 2.0 license ensures:
- Anyone can fork if boundaries are violated
- Forks can use "ReadyLayer" name for compatibility
- No legal retaliation for competitive forks

### 3. Transparency Reports

Every 6 months, maintainers publish:
- List of features added to OSS
- List of features added to Enterprise only
- Justification for any Enterprise-only additions
- Status of boundary violations (if any)

### 4. Community Veto

If community consensus (>50% of active contributors) believes a boundary has been violated, maintainers must:
- Respond publicly within 7 days
- Provide evidence of compliance or plan to remediate
- Move feature back to OSS if violation is confirmed

---

## Boundary Violation Examples

### ❌ Violation: Moving Security Rules to Enterprise

**Scenario:** New security detection rule (e.g., "detect React XSS") is added only to Enterprise Cloud, not OSS.

**Why it violates:** Security scanning is core governance logic (Invariant #1).

**Remedy:** Add rule to OSS immediately.

### ❌ Violation: Adding Telemetry for "Product Improvement"

**Scenario:** OSS adds telemetry that sends "anonymous usage stats" to ReadyLayer servers.

**Why it violates:** No phone-home in OSS (Invariant #2).

**Remedy:** Remove telemetry entirely, even if opt-in.

### ❌ Violation: Introducing "OSS Limits" After 1 Year

**Scenario:** OSS suddenly limits scanning to 1,000 files per run; Enterprise has no limit.

**Why it violates:** Degradation of existing functionality (Invariant #4).

**Remedy:** Remove limit from OSS.

### ✅ Not a Violation: Enterprise-Only SSO Dashboard

**Scenario:** Enterprise Cloud adds SAML SSO configuration UI that doesn't exist in OSS.

**Why it's allowed:** Operational tooling, not governance logic (see "What May Exist Only in Enterprise Cloud" table).

**How OSS users can replicate:** Configure SAML manually via environment variables and Supabase Auth (documented in OSS guides).

### ✅ Not a Violation: Enterprise-Only Billing System

**Scenario:** Enterprise Cloud has usage tracking and billing; OSS does not.

**Why it's allowed:** Business logic for the service, not governance feature.

**How OSS users can replicate:** Not applicable; self-hosting is free, no billing needed.

---

## Ambiguity Resolution Process

If it's unclear whether a feature violates boundaries:

1. **Open GitHub Issue**: Titled "Boundary Question: [Feature Name]"
2. **Maintainer Response**: Within 7 days, explain classification
3. **Community Discussion**: 14-day comment period
4. **Decision**: Maintainers decide, documented in this file
5. **Appeal**: Community can request reconsideration with new evidence

---

## Amendment Process

This document can be amended, but with high friction:

1. **Proposal**: GitHub PR with full diff
2. **Rationale**: Explain why boundary should move
3. **Impact Analysis**: Who is affected, how
4. **Comment Period**: 30 days minimum
5. **Approval**: Requires 2/3 of core maintainers + no sustained community objection
6. **Announcement**: Blog post explaining change

**Prohibited amendments:**
- Weakening Invariants #1-5 (those are permanent)
- Adding telemetry or account requirements
- Moving core governance logic out of OSS

---

## Historical Decisions

### 2026-01-24: Initial Boundary Specification

**Decision:** Establish initial OSS/Enterprise boundaries.

**Rationale:** Project launching publicly; need explicit trust framework.

**Boundaries set:**
- Core governance logic in OSS forever
- Operational tooling may be Enterprise-only
- No telemetry, no account requirements, no degradation

---

## Inspiration

This document is inspired by:
- **GitLab**: OSS core + managed hosting model
- **Mastodon**: Strong anti-commercialization stance
- **Plausible Analytics**: Transparent boundary between OSS and paid
- **Discourse**: Clear feature parity between self-hosted and managed

We believe transparent boundaries build trust better than vague promises.

---

## Contact

**Questions about boundaries?**
- Open a GitHub issue: [github.com/Hardonian/ReadyLayer/issues](https://github.com/Hardonian/ReadyLayer/issues)
- Email maintainers: opensource@readylayer.io

**Report boundary violations:**
- Email: trust@readylayer.io
- Confidential if needed

---

## Summary

ReadyLayer OSS is **not a loss leader** for Enterprise Cloud. It's a fully functional framework that solves real problems. Enterprise Cloud is managed hosting of that framework, not a superior product.

This document makes that explicit, enforceable, and permanent.

**Invariants (non-negotiable):**
1. Core governance logic stays OSS
2. No telemetry or phone-home
3. No account requirements
4. No degradation over time
5. OSS codebase remains primary

**Enforcement:**
- Community oversight
- Fork-friendly license
- Transparency reports
- Community veto power

**Promise:**
We will honor these boundaries or publicly acknowledge violations and remediate. The OSS community deserves no less.
