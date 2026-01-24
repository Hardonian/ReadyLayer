# Security Hardening Summary

**Last Updated:** 2026-01-24
**Purpose:** Document all security hardening measures, mitigations, and best practices

---

## Executive Summary

ReadyLayer has undergone comprehensive security hardening to ensure:
- **Zero hardcoded secrets** in codebase
- **Fail-secure defaults** (block on unknown errors)
- **Privacy preservation** (code never leaves infrastructure without consent)
- **Tenant isolation** (organization-scoped data access)
- **Transparent security model** (all rules inspectable in OSS)

---

## Security Architecture

### Defense in Depth

ReadyLayer employs multiple security layers:

1. **Application Layer**
   - Input validation (Zod schemas)
   - Output encoding (React auto-sanitization)
   - CSRF protection (OAuth state parameter)
   - Rate limiting (100 req/min per IP)

2. **Authentication Layer**
   - GitHub OAuth with PKCE flow
   - Session management (httpOnly cookies, 24h expiry)
   - API key authentication (SHA-256 hashed)

3. **Authorization Layer**
   - Role-based access control (owner, admin, member)
   - Resource-level permissions
   - Organization scoping (every query filtered)

4. **Data Layer**
   - Row-Level Security (RLS) policies
   - Encryption at rest (ChaCha20-Poly1305)
   - Secrets redaction before LLM calls
   - Audit logging (immutable, timestamped)

5. **Network Layer**
   - TLS 1.2+ everywhere
   - Webhook signature verification
   - IP whitelisting (optional)

---

## Threat Model

### Assets Protected

1. **User Code** - Most sensitive, never logged or transmitted without consent
2. **Policy Configurations** - Business logic, versioned and auditable
3. **Scan Results** - Governance decisions, cryptographically hashed
4. **User Data** - PII, credentials, organization info
5. **Infrastructure** - Database, API keys, service credentials

### Threat Actors

| Actor | Motivation | Mitigations |
|-------|------------|-------------|
| **Malicious User** | Access other orgs' data | Tenant isolation, RLS, API validation |
| **External Attacker** | Steal credentials, data | TLS, secrets management, WAF |
| **Insider Threat** | Data exfiltration | Audit logs, access controls, encryption |
| **Supply Chain** | Compromise dependencies | npm audit, Dependabot, SCA |
| **LLM Provider** | Privacy invasion | Secrets redaction, opt-in LLM, self-hosted |

---

## OWASP Top 10 Mitigations

### 1. Injection (SQL, Command, Code)

**Risks:**
- SQL injection via user input
- Command injection in shell execution
- Code injection in eval()

**Mitigations:**
- ✅ **Prisma ORM only** - No raw SQL queries
- ✅ **No eval()** - Banned by ESLint
- ✅ **Input validation** - Zod schemas on all inputs
- ✅ **Parameterized queries** - Prisma handles escaping
- ✅ **Path traversal protection** - Validate file paths

**Testing:**
```typescript
// ✅ Safe
const user = await prisma.user.findUnique({
  where: { id: userId }
});

// ❌ Unsafe (we never do this)
const user = await prisma.$queryRaw(`SELECT * FROM users WHERE id = ${userId}`);
```

---

### 2. Broken Authentication

**Risks:**
- Session hijacking
- Credential stuffing
- Brute force attacks

**Mitigations:**
- ✅ **OAuth 2.0** - GitHub OAuth with PKCE
- ✅ **HttpOnly cookies** - Not accessible via JavaScript
- ✅ **Session expiry** - 24 hours max
- ✅ **Rate limiting** - 100 requests per minute
- ✅ **API key rotation** - Supported in UI
- ✅ **No password storage** - Delegated to OAuth provider

---

### 3. Sensitive Data Exposure

**Risks:**
- Secrets in logs
- Unencrypted data transmission
- Secrets in error messages

**Mitigations:**
- ✅ **Secrets redaction** - All LLM inputs redacted (see `lib/secrets/redaction.ts`)
- ✅ **TLS everywhere** - HTTPS enforced
- ✅ **Encryption at rest** - Installation tokens encrypted (ChaCha20-Poly1305)
- ✅ **No secrets in logs** - Pino logger with redaction
- ✅ **Safe error messages** - Generic errors to users, detailed logs internally

**Redaction Patterns:**
```typescript
// Detected and redacted:
- AWS keys: AKIA[0-9A-Z]{16}
- API tokens: sk-[a-zA-Z0-9]{32,}
- Private keys: -----BEGIN .* PRIVATE KEY-----
- Passwords: password\s*=\s*["'].*["']
- Email addresses: \w+@\w+\.\w+
```

---

### 4. XML External Entities (XXE)

**Risks:**
- XML parsing vulnerabilities

**Mitigations:**
- ✅ **No XML parsing** - JSON-only API
- ✅ **No SOAP endpoints** - REST API only

---

### 5. Broken Access Control

**Risks:**
- Privilege escalation
- Cross-tenant data access
- Missing authorization checks

**Mitigations:**
- ✅ **Tenant isolation** - All queries filter by `organizationId`
- ✅ **Row-Level Security (RLS)** - Database-level enforcement
- ✅ **RBAC** - owner, admin, member roles
- ✅ **Permission checks** - Every API endpoint validates access
- ✅ **Principle of least privilege** - Minimal permissions by default

**Enforcement:**
```typescript
// Every query MUST include organizationId
await prisma.repository.findMany({
  where: { organizationId: user.organizationId }
});
```

---

### 6. Security Misconfiguration

**Risks:**
- Default credentials
- Unnecessary services
- Verbose error messages

**Mitigations:**
- ✅ **No default credentials** - All from environment variables
- ✅ **Minimal attack surface** - Only necessary services exposed
- ✅ **Security headers** - CSP, HSTS, X-Frame-Options, etc.
- ✅ **Environment-specific configs** - Different settings for dev/prod
- ✅ **Hardened Docker images** - Non-root user, minimal base image

**Security Headers:**
```http
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000
```

---

### 7. Cross-Site Scripting (XSS)

**Risks:**
- Stored XSS in user content
- Reflected XSS in search/error messages
- DOM-based XSS

**Mitigations:**
- ✅ **React auto-sanitization** - JSX escapes by default
- ✅ **No dangerouslySetInnerHTML** - Banned unless necessary
- ✅ **CSP headers** - Prevent inline scripts
- ✅ **Output encoding** - All user input escaped
- ✅ **Input validation** - Zod schemas reject scripts

---

### 8. Insecure Deserialization

**Risks:**
- RCE via malicious payloads
- Object injection

**Mitigations:**
- ✅ **Zod validation** - All inputs validated before processing
- ✅ **No eval()** - Code execution banned
- ✅ **JSON only** - No custom serialization formats
- ✅ **Type checking** - TypeScript strict mode

---

### 9. Using Components with Known Vulnerabilities

**Risks:**
- Dependency vulnerabilities
- Supply chain attacks

**Mitigations:**
- ✅ **npm audit** - Daily automated scans
- ✅ **Dependabot** - Automated dependency updates
- ✅ **Lock files** - Exact versions pinned
- ✅ **Minimal dependencies** - Only necessary packages
- ✅ **Vulnerability monitoring** - GitHub Security Advisories

**CI/CD Check:**
```yaml
- name: Run npm audit
  run: npm audit --audit-level=moderate
```

---

### 10. Insufficient Logging & Monitoring

**Risks:**
- Undetected breaches
- No forensic trail

**Mitigations:**
- ✅ **Structured logging** - Pino JSON logs
- ✅ **Correlation IDs** - Track requests across services
- ✅ **Audit trail** - All governance decisions logged
- ✅ **Immutable logs** - Audit logs hashed and timestamped
- ✅ **Security events** - Login, logout, permission changes logged

**Audit Log Schema:**
```prisma
model AuditLog {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  action         String   // e.g., "policy.created", "review.blocked"
  resource       String   // Resource ID
  metadata       Json     // Action details
  hash           String   // SHA-256 of log entry
  createdAt      DateTime @default(now())
}
```

---

## Additional Security Measures

### Secrets Management

**Problem:** API keys, tokens, credentials must be protected.

**Solutions:**
1. **Environment Variables** - All secrets from env vars
2. **Encryption at Rest** - Installation tokens encrypted with ChaCha20-Poly1305
3. **Rotation Support** - API keys can be regenerated
4. **No Hardcoding** - ESLint rules ban hardcoded secrets
5. **Redaction** - All data to LLMs redacted first

**Example:**
```typescript
// ✅ Good
const apiKey = process.env.OPENAI_API_KEY;

// ❌ Bad (detected by CI)
const apiKey = 'sk-proj-abc123def456';
```

---

### Webhook Security

**Problem:** Webhooks can be spoofed.

**Solutions:**
1. **Signature Verification** - GitHub webhook signatures validated
2. **HTTPS Only** - Webhook endpoints require TLS
3. **Replay Protection** - Timestamps checked
4. **IP Whitelisting** - Optional restriction to provider IPs

**Implementation:**
```typescript
// services/webhooks/verify-github-signature.ts
export function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = `sha256=${hmac.update(payload).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
```

---

### LLM Security

**Problem:** Sending user code to LLMs risks privacy.

**Solutions:**
1. **Opt-in** - LLM processing is optional
2. **Secrets Redaction** - All code redacted before LLM call
3. **Self-hosted Mode** - No external LLM calls required
4. **Timeout** - 30s max per LLM call
5. **Non-blocking** - Async processing, never blocks PR

**Redaction Process:**
```
User Code → redactSecrets() → LLM Provider → Results
```

---

## Compliance Readiness

### SOC 2 Type II

**Controls Implemented:**
- Access controls (RBAC, tenant isolation)
- Audit logging (immutable trail)
- Encryption (at rest and in transit)
- Vulnerability management (automated scanning)
- Incident response (security policy documented)

### GDPR

**Compliance Features:**
- No telemetry in OSS (privacy by default)
- Data minimization (only collect necessary data)
- Right to deletion (user/org deletion supported)
- Data portability (export APIs)
- Consent management (opt-in for LLM processing)

### HIPAA

**Relevant for Healthcare Customers:**
- Encryption at rest and in transit
- Audit logging
- Access controls
- No PHI in logs

---

## Security Testing

### Automated Tests

```bash
# Security test suite
npm run test:security

# Includes:
- Tenant isolation tests
- Secrets redaction validation
- Input validation fuzzing
- SQL injection attempts
- XSS payload testing
- CSRF protection verification
```

### Manual Security Testing

**Quarterly Security Audits:**
1. Penetration testing (external firm)
2. Code review (security-focused)
3. Dependency audit
4. Infrastructure review

**Last Audit:** January 2026
**Next Audit:** April 2026

---

## Incident Response

### Security Incident Process

1. **Detection**
   - Automated monitoring
   - User reports (security@readylayer.io)
   - Security researchers (responsible disclosure)

2. **Triage** (within 1 hour)
   - Severity assessment (critical, high, medium, low)
   - Impact analysis (affected users, data exposure)
   - Containment strategy

3. **Remediation** (target times)
   - Critical: 4 hours
   - High: 24 hours
   - Medium: 1 week
   - Low: Next release

4. **Communication**
   - Internal: Slack #security channel
   - Users: Email notification if affected
   - Public: GitHub Security Advisory

5. **Post-Mortem**
   - Root cause analysis
   - Preventive measures
   - Documentation update

---

## Responsible Disclosure

**Report vulnerabilities privately:**
- Email: security@readylayer.io
- Response: Within 48 hours
- Fix timeline: 14 days for high/critical
- Disclosure window: 90 days

**Hall of Fame:** [SECURITY.md](../SECURITY.md)

---

## Security Resources

### Documentation
- [SECURITY.md](../SECURITY.md) - Security policy
- [INVARIANTS.md](./INVARIANTS.md) - Security invariants
- [Why Open Source](./WHY_OPEN_SOURCE.md) - Transparency rationale

### Code References
- `lib/secrets/` - Secrets management
- `lib/auth/` - Authentication logic
- `services/policy-engine/` - Deterministic governance
- `prisma/schema.prisma` - Data model with RLS

### External Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/)

---

## Security Checklist for Contributors

Before submitting a PR:

- [ ] No hardcoded secrets (run `grep -r "sk-" .`)
- [ ] Input validation with Zod
- [ ] Tenant isolation (organizationId filter)
- [ ] No eval() or unsafe functions
- [ ] Secrets redacted before logging
- [ ] Error messages don't expose internals
- [ ] Tests include security scenarios
- [ ] SQL queries use Prisma only
- [ ] HTTPS/TLS for all external connections
- [ ] Audit logging for sensitive actions

---

<div align="center">

**Security is foundational to trust.**

Open source enables inspection. Hardening enables confidence.

</div>
