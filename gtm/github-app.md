# ReadyLayer — GitHub App Listing

## App Name
**ReadyLayer**

## Short Description
AI-aware code review, test generation, and documentation sync for AI-generated code.

## Full Description

### Overview
ReadyLayer automatically reviews, tests, and documents AI-generated code before merge. Catch security vulnerabilities, enforce test coverage, and keep API docs in sync—all without slowing down development.

### Key Features

#### Review Guard
- **AI-aware code review:** Analyzes AI-generated code for security vulnerabilities, quality issues, and maintainability risks
- **Security-first:** Detects SQL injection, XSS, secrets, insecure dependencies, and more
- **Inline comments:** Posts actionable feedback directly in PRs
- **Custom rules:** Configure rules and severity thresholds per repo

#### Test Engine
- **Automatic test generation:** Detects AI-touched files and generates tests using your existing framework (Jest, Mocha, pytest, etc.)
- **Coverage enforcement:** Enforces test coverage thresholds before merge
- **CI integration:** Fails CI on missing tests or low coverage
- **Framework detection:** Auto-detects your test framework and matches style

#### Doc Sync
- **OpenAPI generation:** Automatically generates OpenAPI specs from code changes
- **Merge-triggered updates:** Updates documentation on merge, prevents drift
- **Artifact publishing:** Publishes specs to GitHub Releases, S3, or custom webhooks
- **Drift detection:** Flags when code and docs are out of sync

### How It Works
1. **Install ReadyLayer:** Install the GitHub App on your repos
2. **AI generates code:** Use Copilot, Cursor, or Claude to write code
3. **ReadyLayer reviews:** Automatically reviews code for risks
4. **ReadyLayer generates tests:** Creates tests for AI-touched files
5. **ReadyLayer updates docs:** Syncs API specs and documentation
6. **Merge with confidence:** Code is production-ready

### Integrations
- **Git Hosts:** GitHub, GitLab, Bitbucket, Azure DevOps
- **IDEs:** VS Code, JetBrains
- **CI/CD:** GitHub Actions, GitLab CI, CircleCI, Jenkins
- **Communication:** Slack, Jira

### Use Cases
- **Security teams:** Catch vulnerabilities before production
- **Engineering managers:** Enforce quality standards automatically
- **Platform engineers:** Integrate quality gates into CI/CD
- **Development teams:** Generate tests and docs automatically

### Pricing
- **Starter:** $49/month (5 repos, basic features)
- **Growth:** $199/month (25 repos, advanced features)
- **Scale:** Custom (unlimited repos, enterprise features)

**14-day free trial, no credit card required.**

### Support
- **Documentation:** https://docs.readylayer.com
- **Support:** support@readylayer.com
- **Status:** https://status.readylayer.com

---

## Screenshots

### Screenshot 1: PR Review Comments
**Title:** Inline Security Review
**Description:** ReadyLayer posts inline comments on PRs, highlighting security issues with actionable suggestions.

### Screenshot 2: Test Generation
**Title:** Automatic Test Generation
**Description:** ReadyLayer generates tests for AI-touched files, matching your test framework and style.

### Screenshot 3: Coverage Report
**Title:** Coverage Enforcement
**Description:** ReadyLayer enforces test coverage thresholds, blocking PRs that fall below your standards.

### Screenshot 4: Documentation Sync
**Title:** API Documentation
**Description:** ReadyLayer generates OpenAPI specs and updates documentation automatically on merge.

---

## Permissions

### Repository Permissions
- **Contents:** Read (required to read file contents, diffs)
- **Metadata:** Read (required, always granted)
- **Pull requests:** Read & Write (required to read PRs, post comments)
- **Checks:** Write (required to update status checks)

### Organization Permissions
- **Members:** Read (optional, for RBAC)
- **Administration:** Read (optional, for org-level config)

### Account Permissions
- **Email addresses:** Read (optional, for user identification)

**Note:** ReadyLayer requests minimum required permissions. We follow the principle of least privilege.

---

## Categories
- Code Review
- Testing
- Documentation
- Security
- CI/CD

---

## Keywords
- AI code review
- Test generation
- API documentation
- Security scanning
- Code quality
- CI/CD integration
- OpenAPI
- Test coverage
- Automated testing
- Code analysis

---

## Support Information

### Support URL
https://docs.readylayer.com/support

### Support Email
support@readylayer.com

### Privacy Policy
https://readylayer.com/privacy

### Terms of Service
https://readylayer.com/terms

---

## Installation Instructions

### Step 1: Install ReadyLayer
1. Click "Install" on the GitHub App page
2. Select organization or user account
3. Choose repositories (all repos or specific repos)
4. Click "Install"

### Step 2: Configure ReadyLayer
1. Go to ReadyLayer dashboard (https://readylayer.com)
2. Sign in with GitHub
3. Configure repos (rules, thresholds, etc.)
4. ReadyLayer starts working automatically

### Step 3: Create a PR
1. Create a PR with AI-generated code
2. ReadyLayer automatically reviews, generates tests, and updates docs
3. Review ReadyLayer feedback in PR comments
4. Merge when ready

---

## FAQ

### Q: Does ReadyLayer store my code?
A: No. By default, ReadyLayer doesn't store code. Code is processed ephemerally (cached for 1 hour, then deleted).

### Q: What languages does ReadyLayer support?
A: ReadyLayer supports TypeScript/JavaScript, Python, Java, Go, Ruby, PHP, and more.

### Q: Can I customize rules?
A: Yes. ReadyLayer supports custom rules, severity overrides, and configurable thresholds.

### Q: Does ReadyLayer work with self-hosted GitHub?
A: Yes. ReadyLayer supports GitHub Enterprise Server.

### Q: What happens if ReadyLayer goes down?
A: ReadyLayer has 99.9% uptime SLA. If unavailable, your CI continues to work (ReadyLayer checks are optional).

---

## Release Notes

### Version 1.0.0 (Current)
- Initial release
- Review Guard: AI-aware code review
- Test Engine: Automatic test generation
- Doc Sync: OpenAPI generation and sync
- GitHub integration
- VS Code extension
- GitHub Actions integration

---

## Marketing Copy

### Short Tagline
**AI writes the code. ReadyLayer makes it production-ready.**

### Long Tagline
Automatically review, test, and document AI-generated code before merge. Catch security vulnerabilities, enforce test coverage, and keep docs in sync—all without slowing down development.

### Value Proposition
ReadyLayer is the mandatory readiness layer for AI-generated code. It sits after AI code generation and before merge, ensuring production readiness without manual work.

---

## Call to Action
**Start your 14-day free trial today. No credit card required.**

[Install ReadyLayer](https://github.com/apps/readylayer)
