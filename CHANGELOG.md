# Changelog

All notable changes to ReadyLayer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Community governance templates (COMMITTERS.md, issue templates, PR template)
- Public ROADMAP.md with community input
- Comprehensive GitHub issue templates (bug report, feature request, RFC)
- Enhanced PR template with OSS/Enterprise boundary checks
- Comprehensive CHANGELOG.md following Keep a Changelog format
- GitHub Actions CI/CD transparency workflow

### Changed

### Deprecated

### Removed

### Fixed

### Security

---

## [1.0.0] - 2026-01-17

**🎉 Initial Production Release**

ReadyLayer v1.0.0 is the first production-ready release of our open-source AI code governance framework. This release includes comprehensive security scanning, test coverage analysis, and documentation validation—all running deterministically in your CI/CD pipeline.

### Added

#### Core Engines
- **Review Guard**: Security scanning engine
  - OWASP Top 10 detection
  - Secrets detection (AWS keys, API tokens, private keys, passwords)
  - Dependency vulnerability scanning (npm, pip, cargo)
  - Custom rule support
  - Deterministic scanning (same input → same output)
  - Evidence bundles with audit trails

- **Test Engine**: Coverage analysis and enforcement
  - Framework auto-detection (Vitest, Jest, pytest, Mocha, Go test)
  - Configurable coverage thresholds (default 80%)
  - Delta tracking (coverage regressions)
  - File-level and overall coverage metrics
  - HTML coverage reports

- **Doc Sync**: Documentation validation
  - OpenAPI/Swagger schema validation
  - Markdown link checking
  - Code comment analysis (JSDoc, TSDoc, Godoc)
  - Changelog generation from commits
  - Documentation drift detection

- **Policy Engine**: Deterministic rule evaluation
  - YAML-based policy configuration
  - Cryptographically hashed decisions
  - Policy versioning and inheritance
  - Evidence bundle generation
  - Audit trail for compliance

#### Integrations
- **GitHub Integration**
  - OAuth app with CSRF protection
  - GitHub Action for CI/CD
  - Webhook event handling (push, pull_request, installation)
  - Pull request comments with scan results
  - Commit status updates
  - Repository installation flow

- **GitLab Integration** (Experimental)
  - CI/CD pipeline integration
  - Merge request comments
  - Pipeline status reporting
  - Webhook support

- **Bitbucket Integration** (Experimental)
  - Pipelines integration
  - Pull request decorations
  - Repository hooks

#### Deployment Options
- **Self-Hosted Docker**
  - Official Docker image: `readylayer/readylayer:latest`
  - PostgreSQL database support
  - Redis queue support (optional)
  - Environment variable configuration

- **Self-Hosted Node.js**
  - Next.js 16 application
  - Prisma ORM for database
  - Production-ready deployment guide

- **Local Development**
  - In-memory SQLite mode (no external dependencies)
  - Hot reload with Next.js dev server
  - Development-only features (debug logs, playground)

- **GitHub Action**
  - Pre-built action: `readylayer/readylayer-action@v1`
  - YAML policy configuration
  - PR decoration with results
  - Workflow status integration

#### Developer Experience
- **CLI Tool**
  - Standalone command-line interface
  - Local scanning (no API calls)
  - Policy validation
  - Configuration generator
  - Test mode for policy development

- **Configuration**
  - YAML-based policy files (`.readylayer/policy.yml`)
  - Environment variable overrides
  - Hierarchical configuration (org → team → repo)
  - Policy templates for common use cases

- **Documentation**
  - Comprehensive getting started guide
  - Architecture deep dives
  - API reference (OpenAPI spec)
  - Deployment guides (Docker, Kubernetes, serverless)
  - Contributing guidelines
  - Code of conduct
  - Security policy

#### Security Features
- **Authentication & Authorization**
  - GitHub OAuth with PKCE flow
  - Supabase Auth integration
  - Role-based access control (owner, admin, member)
  - API key authentication for programmatic access

- **Data Protection**
  - Secrets redaction before LLM calls
  - Encryption at rest (ChaCha20-Poly1305)
  - TLS 1.2+ for all connections
  - No telemetry or phone-home (OSS)

- **Tenant Isolation**
  - Organization-scoped data access
  - Row-level security (RLS) policies
  - Multi-tenancy architecture
  - Audit logging for all actions

- **Vulnerability Management**
  - Automated dependency scanning
  - Security advisory monitoring
  - CVE database integration
  - Coordinated disclosure process

#### Quality & Testing
- **Test Coverage**: 82% overall
  - Unit tests: Vitest with 85%+ coverage goals
  - E2E tests: Playwright with 12+ test suites
  - Integration tests: API and webhook testing
  - Security tests: Tenant isolation, secrets redaction

- **Code Quality**
  - TypeScript strict mode throughout
  - ESLint with security rules
  - No `any` types (except documented escapes)
  - Comprehensive error handling

- **Performance**
  - Sub-100ms API response times (90th percentile)
  - Async LLM processing (non-blocking)
  - Redis-based job queue
  - Efficient database queries

#### Open Source Governance
- **Project Structure**
  - Apache 2.0 license
  - OSS-first development model
  - Community-driven roadmap
  - Transparent governance

- **Documentation**
  - OSS vs Enterprise boundary clearly defined
  - Why open source manifesto
  - Contribution guidelines
  - Code of conduct
  - Security policy

---

## [0.1.0] - 2026-01-01

**Public Foundation Release**

### Added
- Established open-core positioning and tier boundaries
- Static landing page with product screenshots
- Contributing, security, and licensing documentation
- Linting and type checks during builds

---

## Release Metadata

### Version History

| Version | Release Date | Highlights |
|---------|--------------|------------|
| [1.0.0] | 2026-01-17 | Initial production release |
| [0.1.0] | 2026-01-01 | Public foundation |

### Contributors

Thank you to all contributors who made ReadyLayer possible:

- [@Hardonian](https://github.com/Hardonian) - Lead maintainer
- All community members who filed issues, reviewed code, and provided feedback

_Want to contribute? See [CONTRIBUTING.md](./CONTRIBUTING.md)_

---

## Breaking Changes Policy

ReadyLayer follows [Semantic Versioning](https://semver.org/):

- **Major (v2.0.0)**: Breaking changes with 6-month deprecation notice
- **Minor (v1.1.0)**: New features, backwards compatible
- **Patch (v1.0.1)**: Bug fixes, backwards compatible

### Breaking Changes

We avoid breaking changes whenever possible. When necessary:

1. **6 months advance notice** in changelog and docs
2. **Deprecation warnings** in affected code
3. **Migration guide** provided
4. **Both versions supported** during deprecation period
5. **Removal only in next major version**

---

## Support & Feedback

### Getting Help

- 📖 **Documentation**: [docs/](./docs/)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Hardonian/ReadyLayer/discussions)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Hardonian/ReadyLayer/issues)
- 🔒 **Security**: security@readylayer.io

### Providing Feedback

We value your feedback! Share your experience:

- **Feature Requests**: [File a feature request](./.github/ISSUE_TEMPLATE/feature_request.yml)
- **Bug Reports**: [File a bug report](./.github/ISSUE_TEMPLATE/bug_report.yml)
- **General Feedback**: [Start a discussion](https://github.com/Hardonian/ReadyLayer/discussions)

---

<div align="center">

**Stay Updated**

[Watch Releases](https://github.com/Hardonian/ReadyLayer/releases) • [Read Roadmap](./ROADMAP.md) • [Join Discussions](https://github.com/Hardonian/ReadyLayer/discussions)

</div>

---

[Unreleased]: https://github.com/Hardonian/ReadyLayer/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Hardonian/ReadyLayer/releases/tag/v1.0.0
[0.1.0]: https://github.com/Hardonian/ReadyLayer/releases/tag/v0.1.0
