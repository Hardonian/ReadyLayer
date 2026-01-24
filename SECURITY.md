# Security Policy

**ReadyLayer is open-source governance tooling for AI-generated code. Security is foundational to trust.**

Because ReadyLayer makes security decisions about your code, the security of ReadyLayer itself must be inspectable, auditable, and trustworthy. This policy explains how we handle vulnerabilities and maintain security transparency.

## Reporting Security Vulnerabilities

**Please do not file public GitHub issues for security vulnerabilities.** We take security very seriously and appreciate responsible disclosure.

### Report a Vulnerability

1. **Email:** security@readylayer.io
2. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any proof of concept (if safe)
   - Your contact information

### Response Timeline

We will respond to security reports within **48 hours** with:
- Acknowledgment of the report
- Next steps and timeline
- Request for additional information if needed

We aim to:
- Verify the vulnerability within 5 days
- Release a patch within 14 days
- Credit the reporter in release notes (if desired)

### Responsible Disclosure

Please:
✅ Give us time to patch before public disclosure  
✅ Avoid accessing other users' data  
✅ Don't test on production systems you don't own  
✅ Report the issue only to us  
✅ Keep the vulnerability confidential until patched  

We ask for **90 days** of responsible disclosure before public details are shared.

---

## Security Features in OSS

ReadyLayer includes production-grade security in the open-source version:

### Authentication (OSS)
- GitHub OAuth with CSRF protection (self-hosted mode)
- Secure session management (httpOnly cookies)
- JWT token validation
- API key rotation support

### Authorization (OSS)
- Role-based access control (RBAC)
- Permission checks on every API endpoint
- Row-level security (RLS) policies via Supabase
- Principle of least privilege

### Data Protection (OSS)
- AES-256 encryption at rest (when configured)
- TLS 1.2+ encryption in transit
- Secrets detection and redaction (pre-LLM calls)
- No hardcoded credentials
- PII never logged

### Code Scanning (OSS)
- OWASP Top 10 detection rules (all in OSS codebase)
- Dependency vulnerability scanning (via `npm audit`)
- Static analysis for common security issues
- Secrets detection before LLM processing

### Compliance Readiness (OSS)
- ✅ OWASP Top 10 protected
- ✅ GDPR compliant (no telemetry, privacy-preserving)
- ✅ Audit logging (deterministic decisions with evidence bundles)
- ✅ Inspectable security logic (all rules in `services/review-guard/`)

**Note:** Enterprise Cloud adds operational conveniences (managed infrastructure, SOC 2 certification) but uses identical security logic.

---

## Security Best Practices

### For Users

1. **Use Strong Passwords**
   - At least 12 characters
   - Mix of upper, lower, numbers, symbols

2. **Enable 2FA**
   - GitHub: Settings → Security → Two-factor authentication
   - Your account: [Settings page](https://readylayer.io/settings)

3. **Rotate API Keys**
   - Monthly for production keys
   - Immediately if compromised

4. **Monitor Activity**
   - Review recent logins in Settings
   - Check API activity logs
   - Review team member access

### For Developers

1. **Never Hardcode Secrets**
   ```typescript
   // ❌ Bad
   const apiKey = 'sk-proj-abcdef123456';
   
   // ✅ Good
   const apiKey = process.env.OPENAI_API_KEY;
   ```

2. **Use Environment Variables**
   - Store in `.env` (git-ignored)
   - Use `.env.example` for documentation
   - Never commit secrets

3. **Input Validation**
   - Validate all user input
   - Sanitize before database
   - Validate API responses

4. **Error Handling**
   - Don't expose system details
   - Log safely (no secrets)
   - Return generic errors to users

---

## Known Issues

We maintain transparency about security matters:

### Current Status: ✅ No Known Critical Issues

| Issue | Severity | Status | Fix |
|-------|----------|--------|-----|
| None | — | ✅ Resolved | — |

Last security audit: [Current Date]

---

## Dependency Security

### Scanning
We scan dependencies daily for vulnerabilities using:
- npm audit
- Dependabot
- Snyk
- OWASP Dependency-Check

### Policy
- Zero tolerance for critical/high vulnerabilities
- Weekly updates for minor/patch versions
- Monthly review of major versions
- Automated pull requests for security patches

### Updates
```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Fix with breaking changes
npm audit fix --force
```

---

## Infrastructure Security

### Production
- ✅ WAF (Web Application Firewall)
- ✅ DDoS protection
- ✅ Intrusion detection
- ✅ Rate limiting
- ✅ IP whitelisting (optional)

### Data
- ✅ Encrypted backups
- ✅ Daily snapshots
- ✅ Disaster recovery plan
- ✅ Compliance monitoring

### Network
- ✅ VPC isolation
- ✅ TLS everywhere
- ✅ API rate limiting
- ✅ Request signing

---

## Third-Party Security

### Integrations
We trust these third parties:
- ✅ **Vercel** — Hosting
- ✅ **Supabase** — Database
- ✅ **Stripe** — Payments
- ✅ **GitHub** — OAuth
- ✅ **SendGrid** — Email

All integrations use:
- OAuth 2.0 or API keys
- Minimal scopes
- Encrypted storage
- Regular audits

### Vendor Security
We require third parties to:
- Maintain SOC 2 Type II
- Encrypt data at rest & transit
- Provide security docs
- Respond to incidents < 24h

---

## Responsible Disclosure Hall of Fame

We recognize and thank security researchers who responsibly disclose vulnerabilities:

*None yet — be the first!*

---

## Security Transparency (OSS Commitment)

ReadyLayer's security model is **inspectable by design**:

- **All security rules are open source**: See `services/review-guard/rules/`
- **Deterministic scanning**: Same input + same policy = same output (auditable)
- **No black-box decisions**: Policy engine logic is in `services/policy-engine/`
- **Community auditable**: Anyone can review security detection logic

**Why this matters:** Governance tools must be trustworthy. You can't verify a closed-source security scanner. With ReadyLayer OSS, you can read the code yourself.

## Security Resources

### For ReadyLayer OSS Users
- 📖 [Security Documentation](./docs/architecture/security.md)
- 🔒 [Why Open Source](./docs/WHY_OPEN_SOURCE.md) (transparency rationale)
- 🛡️ [OSS vs. Enterprise Boundary](./docs/OSS_VS_ENTERPRISE_BOUNDARY.md) (security parity)

### For Security Researchers
- 🐛 **Report vulnerabilities**: security@readylayer.io
- 📋 **Responsible disclosure**: 90-day window before public disclosure
- 🏆 **Recognition**: Security researchers credited in release notes (if desired)

### Industry Standards
- 🌐 [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- 🔐 [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- ✅ [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/)

---

## Contact & Escalation

| Issue Type | Contact | Response Time |
|-----------|---------|----------------|
| Security Vulnerability | security@readylayer.io | 48 hours |
| Security Question (OSS) | opensource@readylayer.io | 72 hours |
| Security Question (General) | security@readylayer.io | 48 hours |

---

## Security Changelog

**Last Updated:** [Current Date]  
**Next Review:** [30 days from today]

### Recent Changes
- ✅ Fixed secrets redaction validation bug
- ✅ Added CSRF protection to GitHub OAuth
- ✅ Enabled database RLS policies
- ✅ Implemented rate limiting

### Planned
- 🔄 HackerOne bug bounty program
- 🔄 Automated security scanning in CI/CD
- 🔄 Security header hardening
- 🔄 Pen testing engagement

---

## OSS Security Philosophy

ReadyLayer is open source because **governance tooling must be inspectable to be trustworthy.**

You can't audit a closed-source security scanner. You can't verify proprietary governance logic. With ReadyLayer OSS, every security rule, every policy evaluation, every decision trace is readable in the codebase.

**Open source is our security model, not just our license.**

See [docs/WHY_OPEN_SOURCE.md](./docs/WHY_OPEN_SOURCE.md) for the full rationale.

---

## Thank You

We appreciate the security community's help in keeping ReadyLayer safe.

**Together, we're building transparent, auditable governance for AI-generated code.** 🛡️

---

<div align="center">

Have security questions? Email security@readylayer.io

**Report a vulnerability privately** → security@readylayer.io

</div>
