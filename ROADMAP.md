# ReadyLayer Roadmap

**Last Updated:** January 2026
**Status:** Public roadmap with community input

---

## Vision

ReadyLayer exists to make **AI-generated code governance transparent, deterministic, and auditable** for every developer—not just enterprises.

This roadmap reflects our commitment to:
- **Open source first**: Core governance belongs in OSS
- **Community-driven**: Features prioritized by community needs
- **Incremental delivery**: Ship value every 2-4 weeks
- **Backwards compatible**: No breaking changes without migration path

---

## Roadmap Principles

### What Belongs in OSS

✅ **Core Governance Logic**
- Security scanning (Review Guard)
- Test coverage analysis (Test Engine)
- Documentation validation (Doc Sync)
- Policy evaluation (deterministic, auditable)
- GitHub/GitLab/Bitbucket integrations
- CLI and GitHub Action

✅ **Developer Experience**
- Local development (no external dependencies)
- Self-hosted deployment
- Configuration flexibility
- Comprehensive documentation

### What Belongs in Enterprise Cloud

🔒 **Operational Convenience**
- Managed infrastructure (no servers)
- SSO integration (SAML, Okta, Azure AD)
- Support SLA (response time guarantees)
- Multi-region deployment
- Advanced analytics dashboards

**See [OSS_VS_ENTERPRISE_BOUNDARY.md](./docs/OSS_VS_ENTERPRISE_BOUNDARY.md) for full rationale.**

---

## Current Status (v1.0.0)

### ✅ Shipped (Production-Ready)

**Core Engines**
- ✅ Review Guard: Security scanning (OWASP Top 10, secrets detection, dependency CVEs)
- ✅ Test Engine: Coverage analysis with framework auto-detection
- ✅ Doc Sync: Documentation validation (OpenAPI, markdown, code comments)
- ✅ Policy Engine: Deterministic rule evaluation with audit trails

**Integrations**
- ✅ GitHub: OAuth app + GitHub Action + webhook integration
- ✅ GitLab: CI/CD integration (experimental)
- ✅ Bitbucket: Pipelines integration (experimental)

**Deployment**
- ✅ Self-hosted: Docker + Node.js deployment
- ✅ Local development: In-memory SQLite mode
- ✅ Database: PostgreSQL via Prisma ORM

**Developer Experience**
- ✅ CLI: Standalone command-line tool
- ✅ Configuration: YAML-based policy files
- ✅ Documentation: Comprehensive guides and API docs

**Quality**
- ✅ Test Coverage: 82%
- ✅ Security Audit: Completed January 2026
- ✅ TypeScript: Strict mode throughout
- ✅ E2E Tests: 12+ Playwright test suites

---

## Q1 2026 (Current Quarter)

### 🔄 In Progress

**Git Provider Parity**
- 🔄 **GitLab Integration** (90% complete)
  - Complete CI/CD integration
  - Webhook event handling
  - Merge request comments
  - Pipeline status reporting
  - Target: End of January 2026

- 🔄 **Bitbucket Integration** (70% complete)
  - Pipelines integration refinement
  - Pull request decorations
  - Repository hooks
  - Target: Mid-February 2026

**Developer Tools**
- 🔄 **VS Code Extension** (design phase)
  - Inline governance feedback
  - Policy validation in editor
  - Local scanning (no API calls)
  - Target: End of February 2026

**Policy System**
- 🔄 **Policy Marketplace** (planning)
  - Community-contributed policy templates
  - Industry-specific rules (PCI-DSS, HIPAA, SOC 2)
  - Searchable policy library
  - Target: March 2026

### 📋 Planned for Q1

**Performance & Scalability**
- [ ] **Incremental Scanning** (Feb 2026)
  - Only scan changed files in PR
  - Cache previous scan results
  - 10x faster for large repos
  - [RFC: #TBD]

- [ ] **Parallel Rule Execution** (Feb 2026)
  - Run security rules in parallel
  - Worker pool for test analysis
  - Target: 5x faster scans

**Quality Improvements**
- [ ] **Test Coverage to 90%** (ongoing)
  - Focus: Policy Engine, Review Guard
  - Add edge case tests
  - Improve E2E coverage

- [ ] **Security Hardening** (March 2026)
  - Penetration testing engagement
  - Third-party security audit
  - Dependency vulnerability automation

**Documentation**
- [ ] **Video Tutorials** (Feb 2026)
  - Getting started (5 min)
  - GitHub Action setup (10 min)
  - Writing custom policies (15 min)

- [ ] **Migration Guides** (ongoing)
  - From other governance tools
  - From manual review processes
  - Self-hosted to managed

---

## Q2 2026 (Apr-Jun)

### 🔮 Planned Features

**IDE Extensions**
- [ ] **IntelliJ Plugin** (April 2026)
  - Real-time policy checking
  - Inline security warnings
  - Test coverage indicators

- [ ] **Vim Plugin** (May 2026)
  - CLI-based integration
  - Async linting integration
  - Terminal UI for results

**Advanced Security**
- [ ] **Custom Rule Plugin System** (April 2026)
  - Write rules in TypeScript/JavaScript
  - Sandboxed execution (VM or workers)
  - Plugin marketplace integration
  - [RFC: To be filed]

- [ ] **AI Anomaly Detection** (June 2026)
  - Detect unusual code patterns
  - Flag statistically rare changes
  - ML-based drift detection
  - Privacy-preserving (local models)

**Testing Enhancements**
- [ ] **Smart Test Generation** (May 2026)
  - AI-assisted test scaffolding
  - Coverage gap analysis
  - Integration test suggestions

- [ ] **Mutation Testing** (June 2026)
  - Verify test quality
  - Detect weak assertions
  - Coverage quality score

**CI/CD Integration**
- [ ] **Jenkins Plugin** (April 2026)
- [ ] **CircleCI Orb** (May 2026)
- [ ] **Travis CI Integration** (June 2026)

---

## Q3 2026 (Jul-Sep)

### 🚀 Strategic Initiatives

**Multi-Language Support**
- [ ] **Python Support** (July 2026)
  - pytest detection
  - pylint integration
  - Python-specific security rules

- [ ] **Go Support** (August 2026)
  - go test integration
  - gosec security rules
  - Go module scanning

- [ ] **Rust Support** (September 2026)
  - cargo test integration
  - clippy linting
  - Rust-specific patterns

**Advanced Policy Features**
- [ ] **Policy Inheritance** (July 2026)
  - Organization → Team → Repo chain
  - Override mechanisms
  - Conflict resolution

- [ ] **Conditional Policies** (August 2026)
  - Branch-specific rules
  - Time-based policies
  - User role-based policies

**Collaboration Tools**
- [ ] **Slack Integration** (July 2026)
  - Real-time PR notifications
  - Governance reports
  - Policy violation alerts

- [ ] **Microsoft Teams Integration** (August 2026)
  - Similar to Slack integration

**Documentation Platform**
- [ ] **Interactive Docs Site** (September 2026)
  - Searchable documentation
  - Live code examples
  - Community guides

---

## Q4 2026 (Oct-Dec)

### 🎯 Maturity & Scale

**Enterprise Features (OSS Implementation)**
- [ ] **SAML SSO** (October 2026)
  - Self-hosted SAML provider support
  - Okta, Azure AD, OneLogin
  - SCIM provisioning

- [ ] **Audit Reporting** (November 2026)
  - Compliance report generation
  - Trend analysis
  - Export to CSV/PDF

**Performance at Scale**
- [ ] **Distributed Scanning** (November 2026)
  - Multi-worker architecture
  - Queue-based job distribution
  - Horizontal scaling

- [ ] **Caching Layer** (December 2026)
  - Redis-based result caching
  - Cross-PR deduplication
  - Cache invalidation strategy

**Developer Experience**
- [ ] **Interactive CLI** (October 2026)
  - TUI for local scanning
  - Progress indicators
  - Interactive policy testing

- [ ] **GitHub App Marketplace** (December 2026)
  - One-click installation
  - Pre-configured policies
  - Usage analytics

---

## Future Exploration (2027+)

### 💡 Ideas Under Consideration

**No Commitments** — These are explorations, not promises.

**Advanced AI Capabilities**
- AI-assisted code review (not just scanning)
- Automated fix suggestions (security patches)
- Natural language policy authoring
- Explainable AI decisions

**Ecosystem Integration**
- Jira integration (ticket linking)
- PagerDuty integration (incident alerting)
- Datadog integration (metrics)
- Grafana dashboards

**Developer Tooling**
- Browser extension (for web-based IDEs)
- Git hooks (pre-commit, pre-push)
- GitHub Copilot integration
- Cursor IDE plugin

**Compliance & Governance**
- SOC 2 policy templates
- GDPR compliance checking
- HIPAA validation
- PCI-DSS scanning

**Multi-Cloud Support**
- AWS CodeCommit integration
- Azure DevOps integration
- Google Cloud Source Repositories

---

## Community Input

**This roadmap is shaped by community needs.**

### How to Influence the Roadmap

1. **Vote on Existing Issues**
   - 👍 upvote features you want
   - Comment with your use case

2. **File Feature Requests**
   - Use the [Feature Request template](./.github/ISSUE_TEMPLATE/feature_request.yml)
   - Explain the problem you're solving

3. **Submit RFCs**
   - For major technical changes
   - Use the [RFC template](./.github/ISSUE_TEMPLATE/rfc.yml)

4. **Join Discussions**
   - [GitHub Discussions](https://github.com/Hardonian/ReadyLayer/discussions)
   - Weekly community calls (TBD)

### Community Priorities

**Top Requested Features** (updated monthly)

| Feature | Votes | Status | ETA |
|---------|-------|--------|-----|
| VS Code Extension | 47 | 🔄 In Progress | Feb 2026 |
| Python Support | 38 | 📋 Planned Q3 | Jul 2026 |
| Custom Rule Plugins | 32 | 📋 Planned Q2 | Apr 2026 |
| Slack Integration | 28 | 📋 Planned Q3 | Jul 2026 |
| Jenkins Plugin | 21 | 📋 Planned Q2 | Apr 2026 |

_Vote on features in [GitHub Discussions](https://github.com/Hardonian/ReadyLayer/discussions)_

---

## Release Cadence

### Current Release Schedule

**Minor Releases** (v1.x.0)
- **Frequency:** Every 4-6 weeks
- **Scope:** New features, non-breaking changes
- **Announcement:** GitHub Release + Discussions

**Patch Releases** (v1.0.x)
- **Frequency:** As needed (bug fixes, security)
- **Scope:** Bug fixes, security patches, minor improvements
- **Announcement:** GitHub Release

**Major Releases** (v2.0.0)
- **Frequency:** Yearly (or when warranted)
- **Scope:** Breaking changes, major refactors
- **Migration:** Always includes migration guide
- **Deprecation:** 6 months notice before breaking changes

### Upcoming Releases

| Version | Target Date | Highlights |
|---------|-------------|------------|
| v1.1.0 | Late Jan 2026 | GitLab parity, performance improvements |
| v1.2.0 | Mid Feb 2026 | Bitbucket parity, incremental scanning |
| v1.3.0 | Late Feb 2026 | VS Code extension, policy marketplace |
| v1.4.0 | March 2026 | Custom rule plugins, security audit results |
| v2.0.0 | Q4 2026 | Multi-language support, distributed architecture |

---

## Versioning Policy

ReadyLayer follows [Semantic Versioning 2.0.0](https://semver.org/):

- **Major (v2.0.0)**: Breaking changes
- **Minor (v1.1.0)**: New features (backwards compatible)
- **Patch (v1.0.1)**: Bug fixes (backwards compatible)

### Breaking Change Policy

**We avoid breaking changes whenever possible.**

If a breaking change is necessary:
1. **Announcement:** 6 months before change
2. **Deprecation:** Mark old API as deprecated
3. **Migration Guide:** Detailed upgrade instructions
4. **Support:** Both APIs supported for 6 months
5. **Removal:** Only in next major version

---

## How We Prioritize

### Decision Framework

Features are prioritized based on:

1. **Alignment with Mission** (40%)
   - Does it improve governance of AI-generated code?
   - Does it make governance more transparent/auditable?

2. **Community Value** (30%)
   - How many users benefit?
   - How significant is the impact?
   - Upvotes and engagement

3. **Technical Feasibility** (20%)
   - Implementation complexity
   - Maintenance burden
   - Technical risk

4. **OSS Ecosystem Health** (10%)
   - Does it strengthen OSS offering?
   - Does it attract contributors?
   - Does it build community?

### What We Won't Build (Non-Goals)

ReadyLayer **intentionally does not**:

- ❌ **AI Code Generation**: We govern AI code, we don't generate it
- ❌ **Code Hosting**: Use GitHub/GitLab/Bitbucket
- ❌ **Project Management**: Use Jira/Linear/etc.
- ❌ **CI/CD Orchestration**: Use GitHub Actions/GitLab CI/etc.
- ❌ **Telemetry/Analytics**: No phone-home, no tracking (OSS)
- ❌ **Vendor Lock-in**: Always portable, always self-hostable

---

## Contributing to the Roadmap

**Want to influence what we build next?**

### Community Contributions Welcome

We accept contributions for:
- ✅ Roadmap features (implement planned items)
- ✅ Bug fixes (always welcome)
- ✅ Documentation improvements
- ✅ Performance optimizations
- ✅ Test coverage increases

### How to Contribute

1. **Check Roadmap**: See if feature is planned
2. **File Issue/RFC**: Discuss approach with maintainers
3. **Get Approval**: Wait for maintainer approval
4. **Implement**: Follow [CONTRIBUTING.md](./CONTRIBUTING.md)
5. **Submit PR**: Use [PR template](./.github/PULL_REQUEST_TEMPLATE.md)

### Maintainer Commitments

- **Review PRs within 48 hours**
- **Respond to feature requests within 1 week**
- **Update roadmap monthly**
- **Host community calls quarterly** (starting Q2 2026)

---

## Transparency & Accountability

### Roadmap Updates

This roadmap is updated:
- **Monthly**: Progress updates, priority changes
- **Quarterly**: Major direction shifts, new initiatives
- **As needed**: Community-driven re-prioritization

### Tracking Progress

**Follow roadmap progress:**
- 📊 **GitHub Projects**: [ReadyLayer Roadmap Board](https://github.com/Hardonian/ReadyLayer/projects)
- 🏷️ **GitHub Labels**: Filter issues by release milestone
- 📝 **Changelog**: [CHANGELOG.md](./CHANGELOG.md) for shipped features
- 💬 **Discussions**: [Monthly roadmap updates](https://github.com/Hardonian/ReadyLayer/discussions)

---

## Questions?

- 💬 **Roadmap Questions**: [GitHub Discussions](https://github.com/Hardonian/ReadyLayer/discussions)
- ✨ **Feature Requests**: [Feature Request Template](./.github/ISSUE_TEMPLATE/feature_request.yml)
- 🏗️ **Technical RFCs**: [RFC Template](./.github/ISSUE_TEMPLATE/rfc.yml)
- 📧 **General Inquiries**: opensource@readylayer.io

---

## Recognition

**This roadmap is community-driven.**

Thank you to everyone who has:
- 👍 Voted on features
- 💬 Participated in discussions
- 🐛 Filed issues
- 💻 Contributed code
- 📖 Improved documentation

**Together, we're building transparent, auditable governance for AI-generated code.** 🎉

---

<div align="center">

**Want to shape the future of ReadyLayer?**

[Vote on Features](https://github.com/Hardonian/ReadyLayer/discussions) • [File a Request](./.github/ISSUE_TEMPLATE/feature_request.yml) • [Contribute](./CONTRIBUTING.md)

</div>
