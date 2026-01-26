# GitHub Repository Audit Checklist

**A maintainer-facing tool to ensure the ReadyLayer repository signals OSS trust, not SaaS bait.**

---

## Purpose

This checklist helps maintainers audit the GitHub repository for signals that:
- ✅ Build trust with OSS users
- ✅ Clearly separate OSS from Enterprise Cloud
- ✅ Remove marketing language and SaaS pressure
- ❌ Avoid creating "free tier" or "unlock premium" framing

**Audience:** Core maintainers, committers, and contributors ensuring repo hygiene.

**Frequency:** Review quarterly or before major releases.

---

## Section 1: Repository Metadata

### Repository Name

- [ ] **Name is clear and non-marketing**
  - ✅ Good: `ReadyLayer`, `readylayer/readylayer`
  - ❌ Bad: `ReadyLayer-Free`, `readylayer/oss-edition`

### Repository Description (Below Name)

- [ ] **Description focuses on capability, not marketing**
  - ✅ Good: "Open-source governance framework for AI-generated code"
  - ❌ Bad: "The #1 AI code review platform | Try free today!"

### Topics/Tags

- [ ] **Tags emphasize OSS nature**
  - ✅ Include: `open-source`, `governance`, `security`, `ai-safety`, `developer-tools`
  - ❌ Avoid: `freemium`, `saas`, `free-trial`, `upgrade`

### Website Link

- [ ] **Links to documentation, not sales page**
  - ✅ Good: `https://github.com/Hardonian/ReadyLayer/blob/main/README.md` or `https://readylayer.io/docs`
  - ❌ Bad: `https://readylayer.io/pricing` or `https://readylayer.io/signup`

---

## Section 2: README.md (Above the Fold)

**Critical:** First 3 screens are what 80% of visitors see. Must establish OSS trust immediately.

### Opening Statement (First Paragraph)

- [ ] **Clearly states "open source" in first sentence**
  - ✅ Example: "An open-source framework for governing AI-generated code"
  - ❌ Avoid: "The default authority for AI code safety" (sounds like SaaS marketing)

### Badges (Below Title)

- [ ] **Include OSS license badge prominently**
  - ✅ Include: `License: Apache 2.0` badge
  - ❌ Avoid: Fake metrics badges (`9.5/10 Security Score`, `Coverage 82%` as vanity metrics)

- [ ] **No "Deploy to Vercel" or cloud service buttons above the fold**
  - ✅ Move deployment buttons to "Deployment" section (mid-page)
  - ❌ Don't lead with `[![Deploy to Vercel](https://vercel.com/button)]`

### Problem Statement (First Section)

- [ ] **Explains problem in user terms, not vendor terms**
  - ✅ Good: "AI generates code faster than humans can review it safely"
  - ❌ Bad: "Teams struggle without our platform"

### Installation (First 3 Sections)

- [ ] **Local/self-hosted installation comes BEFORE managed cloud options**
  - ✅ Order: Local dev → Self-hosted Docker → GitHub Action
  - ❌ Order: Cloud signup → Enterprise trial → OSS (as afterthought)

---

## Section 3: README.md (Full Document)

### OSS Content Ratio

- [ ] **80%+ of README is OSS-focused content**
  - ✅ Count lines: OSS content (install, features, architecture, contributing) ≥ 80%
  - ❌ If Enterprise Cloud section is >20%, move to separate doc

### Tone and Language

- [ ] **No sales or marketing language**
  - ❌ Remove: "Transform your workflow", "Unlock potential", "Supercharge your team"
  - ❌ Remove: "Free vs. Paid", "Upgrade to unlock", "Enterprise-grade" (unless defined)
  - ✅ Use: Technical descriptions, capability-based framing, neutral engineer tone

### Feature Gating Signals

- [ ] **No language implying OSS is incomplete**
  - ❌ Remove: "Free tier (limited features)", "OSS Edition (basic)", "Try premium features"
  - ✅ Use: "OSS (full governance)", "Enterprise Cloud (managed hosting)"

### Enterprise Cloud Mention

- [ ] **Enterprise Cloud section is informational, not promotional**
  - ✅ Include: What it is, who it's for, link to `/docs/ENTERPRISE.md`
  - ❌ Exclude: Pricing, "Sign up now", urgency language, feature comparison table

- [ ] **Enterprise Cloud section is clearly separated (after 80% OSS content)**
  - ✅ Placement: Near end of README, after all OSS documentation
  - ❌ Placement: Top of page, interspersed with OSS features

---

## Section 4: Documentation Structure

### Required OSS Trust Documents

- [ ] **`/docs/WHY_OPEN_SOURCE.md`** exists
  - Purpose: Philosophical anchor for why OSS model chosen
  - Tone: Honest, principled, engineering-first

- [ ] **`/docs/OSS_VS_ENTERPRISE_BOUNDARY.md`** exists
  - Purpose: Explicit boundaries between OSS and Enterprise
  - Contains: Non-negotiable invariants, enforcement mechanisms

- [ ] **`/docs/GOVERNANCE.md`** exists
  - Purpose: How decisions are made, who makes them
  - Contains: Roles, RFC process, community input mechanisms

- [ ] **`/docs/ENTERPRISE.md`** exists (Enterprise info separate from README)
  - Purpose: Managed hosting details for teams that want it
  - Tone: Informational, no pressure, clear parity statement

### Documentation Hierarchy

- [ ] **OSS docs are top-level priority**
  - ✅ Order: Installation → Features → Architecture → Contributing → Enterprise (optional)
  - ❌ Order: Pricing → Enterprise → OSS (as alternative)

---

## Section 5: Contributing and Governance Files

### CONTRIBUTING.md

- [ ] **Emphasizes OSS-first development**
  - ✅ States: "OSS codebase is primary, Enterprise is downstream consumer"
  - ✅ Encourages: Forks, custom integrations, community policy templates

### CODE_OF_CONDUCT.md

- [ ] **Exists and is prominent**
  - ✅ Linked in README and CONTRIBUTING.md
  - ✅ Contact email is responsive

### SECURITY.md

- [ ] **Focuses on OSS security, not Enterprise upsell**
  - ✅ Includes: Responsible disclosure, CVE process, security features in OSS
  - ❌ Avoid: "Enterprise customers get priority patches" (creates two-tier security)

### LICENSE

- [ ] **Apache 2.0 (or equivalent OSI-approved license)**
  - ✅ Full text in `/LICENSE` file
  - ✅ Clearly referenced in README
  - ❌ No dual-license confusion
  - ❌ No "Commons Clause" or poison pills

---

## Section 6: GitHub Settings and Appearance

### Repository Settings

- [ ] **Issues are enabled** (community can report bugs)
- [ ] **Discussions are enabled** (community can ask questions)
- [ ] **Wiki is enabled or disabled** (if disabled, use `/docs` instead)
- [ ] **Sponsorships link is optional** (GitHub Sponsors okay, but not required)

### Branch Protection (main/master)

- [ ] **Require PR reviews before merge** (no direct commits to main)
- [ ] **Require status checks to pass** (CI/CD must pass)
- [ ] **No force pushes** (preserve history)

### Social Preview Image

- [ ] **Image is OSS-branded, not SaaS-branded**
  - ✅ Good: ReadyLayer logo + "Open Source Governance"
  - ❌ Bad: "Sign up free" or "Start trial" imagery

---

## Section 7: GitHub Actions and CI/CD

### Public Workflows

- [ ] **CI workflows are visible in `.github/workflows/`**
  - Transparency: Users can see how testing/linting works
  - Trustworthiness: No hidden quality gates

### Dependency Scanning

- [ ] **Dependabot or similar is enabled**
  - Shows: Project takes security seriously
  - Public: Security alerts visible to community

---

## Section 8: First-Time Contributor Experience

**Simulate new user journey:**

### Landing on README

- [ ] **Can identify project purpose in <30 seconds**
  - Test: Show README to someone unfamiliar. Can they explain it?

- [ ] **Can find installation instructions in <60 seconds**
  - Test: Where is "Quick Start" or "Installation"? Is it above the fold?

### Exploring Codebase

- [ ] **Can find contribution guide easily**
  - ✅ `CONTRIBUTING.md` linked in README
  - ✅ GitHub shows "Contributing" tab

- [ ] **Can run locally without external accounts**
  - Test: `git clone` → `npm install` → `npm run dev` → works?
  - ✅ No required ReadyLayer account signup
  - ✅ No required cloud service setup (for basic dev)

### Opening First Issue

- [ ] **Issue templates exist**
  - ✅ Bug report template
  - ✅ Feature request template
  - ✅ Templates guide quality reports

---

## Section 9: Red Flags to Remove

### Marketing Language (Delete These)

- [ ] ❌ "Free forever" (implies paid is better)
- [ ] ❌ "Unlock premium features" (feature gating)
- [ ] ❌ "Upgrade to Enterprise" (pressures users)
- [ ] ❌ "Limited time offer" (urgency tactics)
- [ ] ❌ "Trusted by 1000s" (vanity metric without proof)
- [ ] ❌ "The #1 solution" (unsubstantiated marketing claim)

### SaaS UI Patterns (Remove These)

- [ ] ❌ "Sign Up" CTA above the fold in README
- [ ] ❌ "Start Free Trial" buttons
- [ ] ❌ Pricing tables in README (move to separate page)
- [ ] ❌ "Contact Sales" as primary CTA

### Open Core Signals (Avoid These)

- [ ] ❌ Feature comparison table (Free vs. Paid) in README
- [ ] ❌ "Community Edition" vs. "Enterprise Edition" naming
- [ ] ❌ "Pro features" or "Advanced features" sections
- [ ] ❌ Gated documentation (e.g., "Enterprise docs" behind login)

---

## Section 10: Positive Trust Signals (Add These)

### OSS Credibility Markers

- [ ] ✅ **Active commit history** (visible in GitHub insights)
- [ ] ✅ **Responsive issue triage** (issues get labeled/responded to within days)
- [ ] ✅ **Public roadmap** (transparency about future direction)
- [ ] ✅ **Contributor recognition** (acknowledge PRs publicly)

### Fork-Friendliness Signals

- [ ] ✅ **No CLA required** (stated in CONTRIBUTING.md)
- [ ] ✅ **Clear license** (Apache 2.0 in LICENSE file)
- [ ] ✅ **Standard configuration formats** (YAML, JSON, not proprietary)
- [ ] ✅ **Data export documentation** (how to migrate away if needed)

### Community Health

- [ ] ✅ **Active discussions** (GitHub Discussions has recent activity)
- [ ] ✅ **Merged PRs from non-maintainers** (community contributions accepted)
- [ ] ✅ **Changelog maintained** (CHANGELOG.md or GitHub Releases)

---

## Audit Scoring

**Tally checkboxes:**
- **90-100% checked**: Excellent OSS trust signals
- **70-89% checked**: Good, minor improvements needed
- **50-69% checked**: Concerning, audit and fix gaps
- **<50% checked**: Red flags, major trust issues

---

## Action Items Template

When auditing, use this template to track fixes:

```markdown
## Audit Date: [YYYY-MM-DD]

### Issues Found:
1. [ ] Issue: [Description]
   - Fix: [What needs to change]
   - Owner: [Who will fix it]
   - Deadline: [Target date]

2. [ ] Issue: [Description]
   - Fix: [What needs to change]
   - Owner: [Who will fix it]
   - Deadline: [Target date]

### Score: X/100 checkboxes

### Next Audit: [3 months from now]
```

---

## Quarterly Audit Cadence

**Q1 (January):**
- Full audit using this checklist
- Fix critical issues before Q2

**Q2 (April):**
- Spot-check high-priority sections (README, docs)
- Verify previous fixes still hold

**Q3 (July):**
- Full audit using this checklist
- Adjust for new features/changes

**Q4 (October):**
- Spot-check high-priority sections
- Plan improvements for next year

---

## Summary

This audit ensures ReadyLayer's GitHub presence signals:

✅ **Open source first** (not SaaS with OSS bait)
✅ **Trust and transparency** (no hidden agendas)
✅ **Fork-friendly** (community can take over if needed)
✅ **Contributor-welcoming** (easy to get started)

Use this checklist quarterly to maintain OSS credibility.

---

## Changelog

**2026-01-24**: Initial version created during OSS-first refactor.
