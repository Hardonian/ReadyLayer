# ReadyLayer — Security Documentation

## Threat Model

### Assets
- **User data** — Email, names, organization memberships
- **Code repositories** — Repository metadata, configurations
- **Review results** — Security findings, code analysis results
- **API keys** — Hashed API keys for programmatic access
- **Billing data** — Subscription information, payment details

### Threat Actors
1. **External attackers** — Attempting to access user data or disrupt service
2. **Malicious users** — Attempting to access other organizations' data
3. **Insider threats** — Compromised employee accounts
4. **Supply chain attacks** — Compromised dependencies or infrastructure

---

## Security Controls

### 1. Authentication & Authorization

**Authentication:**
- Supabase Auth (OAuth, email/password)
- API key authentication (SHA-256 hashed)
- Session-based authentication (HTTP-only cookies)

**Authorization:**
- Role-based access control (RBAC) — owner, admin, member
- Scope-based API access — read, write, admin
- Resource-level authorization — Users can only access their organization's resources

**Evidence:**
- `lib/auth.ts` — Authentication utilities
- `lib/authz.ts` — Authorization middleware
- All API routes enforce authorization

### 2. Tenant Isolation

**Multi-layer enforcement:**
1. **API layer** — Routes check organization membership
2. **Database layer** — RLS policies enforce tenant boundaries
3. **Application layer** — Queries filter by organizationId

**RLS Policies:**
- Users can only SELECT/INSERT/UPDATE/DELETE data from their organizations
- Policies use helper functions: `is_org_member()`, `has_org_role()`
- All tables have RLS enabled

**Evidence:**
- `prisma/migrations/20241230000000_init_readylayer/migration.sql` — RLS policies
- All API routes verify organization membership

### 3. Data Protection

**Encryption:**
- **At rest** — Database encryption (managed by Supabase/PostgreSQL)
- **In transit** — TLS 1.3 (HTTPS)
- **Sensitive fields** — API keys hashed (SHA-256), access tokens encrypted

**PII Handling:**
- No PII in logs or error messages
- Email addresses stored but not exposed in API responses
- User IDs are UUIDs (not sequential)

**Evidence:**
- `lib/auth.ts` — API key hashing
- `observability/logging.ts` — Logging excludes PII
- Error messages sanitized

### 4. Input Validation

**Validation layers:**
1. **API routes** — Validate required fields, types
2. **Service layer** — Business logic validation
3. **Database layer** — Constraints (NOT NULL, CHECK, UNIQUE)

**SQL Injection Prevention:**
- Prisma ORM (parameterized queries)
- No raw SQL queries
- Input sanitization

**Evidence:**
- All API routes validate input
- Prisma ORM prevents SQL injection
- `services/config/index.ts` — Config validation

### 5. Webhook Security

**GitHub Webhooks:**
- HMAC-SHA256 signature validation
- Raw body preservation for signature verification
- Installation-based authentication
- **Replay protection**: Timestamp validation and nonce-based request deduplication
- **Rate limiting**: 100 requests per minute per GitHub installation

**Webhook Headers:**
```
X-ReadyLayer-Timestamp: <unix_timestamp>     // Request timestamp for replay protection
X-ReadyLayer-Nonce: <timestamp:random>       // Unique nonce for each request
```

**Replay Protection:**
- Requests older than 5 minutes are rejected
- Each unique (signature, nonce) pair is tracked to prevent replay attacks
- Redis-backed cache with in-memory fallback for availability

**Evidence:**
- `lib/security/webhook-replay.ts` — Replay protection service
- `app/api/webhooks/github/route.ts` — Webhook handler with security hardening

### 6. API Security

**Rate Limiting:**
- Per-IP rate limiting (configurable)
- Per-user rate limiting (via API keys)
- Redis-backed (with DB fallback)

**CORS:**
- Configured for production domains
- No wildcard origins

**Evidence:**
- `lib/rate-limit.ts` — Rate limiting middleware
- `middleware.ts` — Applied to all API routes

---

## Security Posture

### Current State

**✅ Implemented:**
- Tenant isolation (API + RLS)
- Authentication & authorization
- Input validation
- Webhook signature validation
- API key hashing
- Error handling (no PII leakage)

**⚠️ Partial:**
- Rate limiting (implemented, needs tuning)
- Audit logging (structure exists, needs enrichment)
- Monitoring (structure exists, needs connection)

**❌ Missing:**
- SOC 2 certification
- ISO 27001 certification
- Penetration testing
- Security incident response plan
- Bug bounty program

---

## Compliance

### Current Compliance Status

**SOC 2:**
- ❌ Not certified
- ✅ Controls in place (audit logs, access controls)
- ⚠️ Documentation incomplete

**ISO 27001:**
- ❌ Not certified
- ✅ Security controls implemented
- ⚠️ Documentation incomplete

**GDPR:**
- ✅ Data minimization (only collect necessary data)
- ✅ Right to deletion (cascade deletes)
- ⚠️ Privacy policy needed
- ⚠️ Data processing agreements needed

**CCPA:**
- ✅ Similar to GDPR compliance
- ⚠️ Privacy policy needed

---

## Incident Response

### Incident Types

1. **Data breach** — Unauthorized access to user data
2. **Service disruption** — DDoS, infrastructure failure
3. **Security vulnerability** — Code vulnerability discovered
4. **Compliance violation** — Audit failure, policy violation

### Response Procedures

**Detection:**
- Monitor logs for suspicious activity
- Alert on authentication failures
- Track API error rates

**Response:**
1. Assess severity and scope
2. Contain incident (revoke access, disable features)
3. Notify affected users (if required)
4. Document incident and remediation
5. Post-mortem and prevention

**Evidence:**
- `docs/runbooks/incident-response.md` — Incident response procedures
- `observability/logging.ts` — Logging for incident investigation

---

## Security Best Practices

### For Developers

1. **Never log PII** — Email, names, API keys
2. **Always validate input** — Check types, required fields
3. **Use parameterized queries** — Prisma ORM only
4. **Check tenant isolation** — Verify organization membership
5. **Hash sensitive data** — API keys, tokens
6. **Sanitize error messages** — No stack traces in production

### For Operations

1. **Rotate secrets regularly** — API keys, webhook secrets
2. **Monitor access logs** — Unusual patterns
3. **Review audit logs** — Weekly review
4. **Update dependencies** — Monthly security updates
5. **Backup database** — Daily backups, test restores

---

## Security Roadmap

### Q1 2026
- ✅ Complete RLS policies
- ✅ Add tenant isolation to all routes
- ⚠️ SOC 2 Type I certification (in progress)
- ⚠️ First annual third-party security audit (Q1 2026)
- ⚠️ Penetration testing

### Q2 2026
- ⚠️ Publish annual security audit summary findings
- ⚠️ SOC 2 Type II certification
- ⚠️ ISO 27001 certification preparation
- ⚠️ Security training for team

### Q3 2026
- ⚠️ Enterprise security features (SSO, audit exports)
- ⚠️ Compliance automation
- ⚠️ Security monitoring (SIEM integration)

### Ongoing
- Annual third-party security audits
- Quarterly security reviews
- Continuous vulnerability scanning
- Monthly dependency updates

---

## Annual Third-Party Security Audit

### Commitment

ReadyLayer commits to **annual comprehensive security audits** conducted by independent third-party security firms. This ensures our security posture is verified by external experts and provides transparency to our users and customers.

### Audit Scope

**Annual audit includes:**
1. **Penetration Testing**
   - External penetration testing (OWASP Top 10)
   - Internal network security assessment
   - API security testing
   - Authentication and authorization testing

2. **Code Security Review**
   - Static Application Security Testing (SAST)
   - Manual code review of security-critical components
   - Third-party dependency vulnerability assessment
   - Secret detection and management review

3. **Infrastructure Security Review**
   - Cloud infrastructure configuration (AWS/Supabase)
   - Database security and encryption review
   - Network segmentation and firewall rules
   - Backup and disaster recovery procedures

4. **Compliance Gap Analysis**
   - SOC 2 Trust Service Criteria alignment
   - ISO 27001 control implementation
   - GDPR/CCPA compliance verification
   - Industry-specific requirements (as applicable)

### Audit Process

**Timeline:**
- **Q1 (January-March)**: Annual audit conducted
- **Q1 (March)**: Findings delivered and remediation begins
- **Q2 (April)**: Summary findings published publicly
- **Q2-Q4**: Remediation tracking and quarterly reviews

**Auditor Selection:**
- Independent third-party security firms
- Minimum qualifications: CREST, OSCP, or equivalent certifications
- No conflicts of interest (rotated every 2-3 years)

**Deliverables:**
1. **Full Audit Report** (confidential)
   - Detailed findings with CVSS scores
   - Proof-of-concept exploits (where applicable)
   - Remediation recommendations with timelines
   - Available to Enterprise customers under NDA

2. **Public Summary Findings** (published)
   - Number of findings by severity (Critical, High, Medium, Low)
   - General categories of issues found
   - Remediation status and timelines
   - Overall security posture assessment
   - Published on readylayer.io/security/audits

### Published Summary Format

**Example annual security audit summary:**

```
ReadyLayer 2026 Annual Security Audit Summary
Audit Period: January 1 - March 31, 2026
Auditor: [Independent Security Firm Name]
Published: April 15, 2026

Findings Summary:
- Critical: 0
- High: 2 (both remediated)
- Medium: 5 (4 remediated, 1 in progress)
- Low: 12 (8 remediated, 4 accepted risk)

Categories:
- Authentication & Authorization: 1 High (remediated)
- Encryption & Data Protection: 1 Medium (remediated)
- Input Validation: 1 High, 2 Medium (all remediated)
- Infrastructure Security: 2 Medium, 8 Low
- Logging & Monitoring: 1 Medium, 4 Low

Overall Assessment:
"ReadyLayer demonstrates a mature security posture with strong
controls in place for authentication, encryption, and tenant
isolation. All critical and high-severity findings were
remediated within 30 days. Security practices align with
industry standards for SaaS platforms."

Remediation Timeline:
- Critical findings: Addressed within 7 days (N/A - none found)
- High findings: Addressed within 30 days (100% complete)
- Medium findings: Addressed within 90 days (80% complete)
- Low findings: Best effort (67% complete)

Next Audit: Q1 2027
```

### Transparency Commitment

**Public disclosure includes:**
- ✅ Number of findings by severity
- ✅ General categories (no specific exploit details)
- ✅ Remediation status and timelines
- ✅ Overall security assessment
- ✅ Link to auditor's credentials

**Confidential (available under NDA to Enterprise customers):**
- ❌ Specific vulnerability details
- ❌ Proof-of-concept exploits
- ❌ Technical implementation details
- ❌ Infrastructure architecture specifics

### Access to Audit Reports

**OSS Users:**
- Public summary findings (free, no signup required)
- Published at: https://readylayer.io/security/audits

**Enterprise Customers:**
- Public summary findings
- Full audit report (under NDA)
- Request via: security@readylayer.io

**Prospective Customers:**
- Public summary findings
- Redacted sample findings (upon request)
- Request via: sales@readylayer.io

### Continuous Security

**Between annual audits:**
- **Quarterly security reviews**: Internal security team reviews
- **Monthly dependency updates**: Automated vulnerability scanning
- **Weekly penetration testing**: Automated security scans
- **Daily monitoring**: Real-time security event monitoring

**Bug Bounty Program (planned Q2 2026):**
- Responsible disclosure program
- Rewards for valid security findings
- Scope: Production systems, OSS codebase
- Details at: https://readylayer.io/security/bug-bounty

---

## Security Audit History

### 2026 Annual Audit
- **Status**: In progress (Q1 2026)
- **Auditor**: [To be announced]
- **Expected completion**: March 31, 2026
- **Summary publication**: April 30, 2026

### Future Audits
- **2027 Annual Audit**: Q1 2027
- **2028 Annual Audit**: Q1 2028
- **Ongoing**: Annual cadence maintained

---

## Contact

**Security Issues:** security@readylayer.io
**Security Policy:** https://readylayer.io/security
**Responsible Disclosure:** https://readylayer.io/security/disclosure
**Audit Report Requests:** security@readylayer.io
**Bug Bounty (planned Q2 2026):** https://readylayer.io/security/bug-bounty

---

**Last Updated:** 2026-01-24
**Next Review:** Quarterly (April 2026)
**Next Audit:** Q1 2027
