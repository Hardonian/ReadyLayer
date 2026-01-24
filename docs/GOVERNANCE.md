# ReadyLayer Governance Model

**How decisions are made, who makes them, and how contributors can influence the project's direction.**

---

## Overview

ReadyLayer is an **open-source project with benevolent maintainer governance**. The project prioritizes:

1. **Transparency**: Decisions are made publicly with documented rationale
2. **Meritocracy**: Influence is earned through quality contributions
3. **Community input**: Major decisions involve community consultation
4. **Efficiency**: Avoid bikeshedding; ship quickly, iterate openly

This document defines the governance structure, decision-making processes, and how contributors can participate.

---

## Guiding Principles

### 1. OSS-First Development

**Principle:** The open-source codebase is the primary product. Enterprise Cloud is a downstream consumer.

**In practice:**
- New features developed in OSS repository first
- Bug fixes committed to OSS, then deployed to Enterprise
- Roadmap prioritizes OSS needs, not just Enterprise revenue
- Community feature requests weighted equally with internal priorities

### 2. No Corporate Capture

**Principle:** ReadyLayer (the company) maintains the project but doesn't own it unilaterally.

**Protections:**
- Apache 2.0 license (fork-friendly, irrevocable)
- No CLA (contributions remain community property)
- Public roadmap discussions
- Community veto power on boundary violations (see [OSS_VS_ENTERPRISE_BOUNDARY.md](./OSS_VS_ENTERPRISE_BOUNDARY.md))

### 3. Consensus Where Possible, Decision When Necessary

**Principle:** Seek community input, but avoid paralysis.

**In practice:**
- Major changes: 14-day RFC (request for comments) process
- Minor changes: Ship with PR review (2 approvals)
- Urgent security fixes: Ship immediately, discuss retroactively
- Philosophical changes (e.g., license): 30-day community discussion

### 4. Bias Toward Action

**Principle:** Code speaks louder than discussion.

**In practice:**
- Working prototypes > long debates
- Experimental features behind flags encouraged
- "Try it and see" > "theorize endlessly"
- Reversible decisions made quickly; irreversible decisions made carefully

---

## Roles and Responsibilities

### Contributors

**Who:** Anyone who submits a PR, files an issue, or participates in discussions.

**Rights:**
- Submit pull requests
- Comment on issues and RFCs
- Vote in community polls (non-binding, but influential)
- Fork the project (Apache 2.0)

**Responsibilities:**
- Follow [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)
- Respect maintainer decisions (while disagreeing constructively)
- Contribute quality code (tested, documented, reviewed)

**How to become one:** Submit your first PR.

### Committers

**Who:** Contributors with sustained, quality contributions. Trusted to merge PRs.

**Rights:**
- Merge pull requests (after 2 approvals)
- Triage issues (label, close, assign)
- Review PRs (binding approval)
- Access to private security reports (CVE coordination)

**Responsibilities:**
- Review PRs within 48 hours
- Enforce code quality standards
- Mentor new contributors
- Participate in RFC discussions

**How to become one:**
- 10+ merged PRs of substantial quality
- 3+ months of consistent contributions
- Nomination by existing committer
- Approval by 2 core maintainers

**Current committers:** See [COMMITTERS.md](./COMMITTERS.md)

### Core Maintainers

**Who:** Long-term project stewards with veto power on major decisions.

**Rights:**
- Final decision authority on RFCs
- Approve/reject boundary changes (see [OSS_VS_ENTERPRISE_BOUNDARY.md](./OSS_VS_ENTERPRISE_BOUNDARY.md))
- Grant/revoke committer status
- Define roadmap priorities
- Represent project in public forums

**Responsibilities:**
- Steward project vision and values
- Resolve disputes (technical and interpersonal)
- Publish quarterly transparency reports
- Respond to community concerns within 7 days
- Maintain [OSS_VS_ENTERPRISE_BOUNDARY.md](./OSS_VS_ENTERPRISE_BOUNDARY.md)

**How to become one:**
- 50+ merged PRs over 12+ months
- Demonstrated judgment and project alignment
- Nomination by existing core maintainer
- Unanimous approval by all current core maintainers

**Current core maintainers:**
- @Hardonian (founder, primary maintainer)
- [Additional maintainers listed in COMMITTERS.md as they're added]

---

## Decision-Making Processes

### Day-to-Day Decisions (No Special Process)

**Scope:** Bug fixes, small features, documentation improvements, refactors.

**Process:**
1. Open PR
2. Get 2 approvals from committers
3. Merge

**Timeline:** 24-48 hours typical.

### Significant Changes (RFC Required)

**Scope:**
- New major features (multi-week effort)
- Breaking API changes
- Architectural shifts
- Dependency additions (new major frameworks)

**Process:**
1. Open GitHub issue titled "RFC: [Feature Name]"
2. Describe proposal, rationale, alternatives considered, migration path
3. 14-day comment period
4. Core maintainers summarize feedback and decide
5. Decision documented in issue (approved/rejected/deferred)

**Timeline:** 2-3 weeks.

**Example RFCs:**
- "RFC: Add support for GitLab self-hosted"
- "RFC: Migrate from Prisma to Drizzle ORM"
- "RFC: Introduce plugin system for custom rules"

### Boundary Changes (High Friction)

**Scope:** Changes to [OSS_VS_ENTERPRISE_BOUNDARY.md](./OSS_VS_ENTERPRISE_BOUNDARY.md).

**Process:**
1. Open PR with full diff
2. Explain why boundary should move
3. 30-day comment period
4. Core maintainers approve (requires 2/3 majority + no sustained community objection)
5. Blog post announcement

**Timeline:** 1-2 months.

**Note:** Weakening invariants (#1-5 in boundary doc) is **prohibited**.

### Emergency Security Fixes (Fast Track)

**Scope:** CVEs, security vulnerabilities, data loss bugs.

**Process:**
1. Fix committed to private branch
2. Security advisory published (coordinated disclosure)
3. Fix released to OSS and Enterprise simultaneously
4. Retroactive PR discussion (for transparency)

**Timeline:** Hours to days.

---

## Roadmap and Prioritization

### How Roadmap Is Decided

**Input sources (weighted equally):**
1. **Community requests**: GitHub issues with 👍 reactions
2. **Enterprise customer needs**: Paying customers' feedback
3. **Maintainer vision**: Long-term strategic priorities
4. **Security research**: Emerging threats (e.g., new OWASP Top 10)

**Quarterly process:**
1. Maintainers draft roadmap (public GitHub issue)
2. 14-day community feedback period
3. Maintainers finalize and publish
4. Roadmap tracked in [ROADMAP.md](./ROADMAP.md)

**Transparency:** Roadmap is public. Priorities are explained. No secret features.

### How to Influence Roadmap

1. **Submit GitHub issue**: Well-reasoned feature requests get considered
2. **Implement it yourself**: PRs for new features fast-track roadmap inclusion
3. **Sponsor development**: Enterprise customers can fund specific features
4. **Community consensus**: Features with >50 👍 reactions get prioritized

**Note:** Loudest voice doesn't win. Quality of argument and alignment with project values matter.

---

## Conflict Resolution

### Technical Disagreements

**Process:**
1. Contributors discuss in PR/issue comments
2. If unresolved after 3 days, escalate to committers
3. Committers review and vote (majority wins)
4. If still unresolved, core maintainers decide (final)

**Philosophy:** Prefer experimentation over endless debate. Ship behind feature flag, A/B test, gather data.

### Interpersonal Conflicts

**Process:**
1. Report to Code of Conduct email: conduct@readylayer.io
2. Core maintainers investigate privately
3. Action taken if violation confirmed (warning, temp ban, permanent ban)
4. Decision communicated to reporter and violator

**Appeals:** Email core maintainers directly. Decision reconsidered if new evidence provided.

### Boundary Violations

**Process:**
1. Open GitHub issue: "Boundary Violation: [Description]"
2. Community discusses (7-day period)
3. Core maintainers respond publicly (explain compliance or remediation plan)
4. If community consensus (>50% active contributors) disagrees, fork the project

**Community veto:** If maintainers violate [OSS_VS_ENTERPRISE_BOUNDARY.md](./OSS_VS_ENTERPRISE_BOUNDARY.md) and refuse to remediate, community can fork under Apache 2.0.

---

## Transparency and Accountability

### Quarterly Transparency Reports

**Published every 3 months** (Jan, Apr, Jul, Oct):

**Contents:**
- Features added to OSS
- Features added to Enterprise only (with justification)
- Community contributions merged
- Financial sustainability (high-level revenue/costs)
- Boundary compliance status
- Security incidents (if any)

**Format:** Blog post + GitHub issue for discussion.

### Community Meetings (Optional)

**Format:** Monthly open Zoom call (optional attendance).

**Agenda:**
- Roadmap updates
- Community Q&A
- Demo new features
- Hear contributor ideas

**Recording:** Posted to YouTube, summarized in GitHub issue.

### Open Metrics

**Publicly tracked:**
- Contributor count (monthly)
- PR merge rate
- Issue close rate
- Test coverage percentage
- Security audit status

**Dashboard:** [github.com/Hardonian/ReadyLayer/insights](https://github.com/Hardonian/ReadyLayer/insights)

---

## Amending This Document

**Process:**
1. Open PR with proposed changes
2. Explain rationale
3. 14-day comment period
4. Core maintainers approve (requires 2/3 majority)
5. Merge and announce

**Prohibited changes:**
- Removing community input mechanisms
- Granting unilateral control to single entity
- Weakening transparency requirements

---

## Inspiration

This governance model is inspired by:

- **Linux Kernel**: Benevolent dictator model (Linus) with distributed maintainers
- **Rust**: RFC process for major changes
- **Node.js**: Technical Steering Committee (TSC) consensus model
- **GitLab**: Open roadmap with community input

We adapt these proven models to ReadyLayer's scale (small, early-stage) and values (OSS-first, anti-lock-in).

---

## FAQ

### Q: Can ReadyLayer (the company) override community decisions?

**A:** On day-to-day decisions, yes (we maintain the project). On boundary violations, no (community can fork). See [OSS_VS_ENTERPRISE_BOUNDARY.md](./OSS_VS_ENTERPRISE_BOUNDARY.md).

### Q: What if core maintainers become unresponsive?

**A:** Apache 2.0 license allows community fork. Active contributors can take over maintenance.

### Q: Can I become a core maintainer?

**A:** Yes. Contribute consistently for 12+ months, demonstrate judgment, get nominated. It's merit-based, not seniority-based.

### Q: How do I propose a major feature?

**A:** Open an RFC GitHub issue. Explain problem, solution, alternatives, migration path. Get community feedback. Implement if approved.

### Q: What if my PR gets rejected?

**A:** Maintainers explain why (doesn't fit roadmap, wrong approach, etc.). You can revise and resubmit, or fork the project.

---

## Contact

- **General governance questions:** opensource@readylayer.io
- **Code of Conduct violations:** conduct@readylayer.io
- **Boundary violation reports:** trust@readylayer.io
- **Maintainer contact:** See [COMMITTERS.md](./COMMITTERS.md)

---

## Summary

ReadyLayer governance balances:

- **Community input** (RFCs, discussions, votes)
- **Maintainer decision-making** (efficiency, vision)
- **Transparency** (public roadmap, quarterly reports)
- **Fork-friendliness** (Apache 2.0, no lock-in)

**Roles:** Contributors → Committers → Core Maintainers (merit-based progression)

**Decisions:**
- Day-to-day: Ship with 2 approvals
- Major changes: RFC + 14-day discussion
- Boundary changes: 30-day discussion + community consensus

**Accountability:** Quarterly reports, open metrics, community veto on boundary violations.

**Philosophy:** OSS-first, transparent, meritocratic, bias toward action.
