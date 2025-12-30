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

**Evidence:**
- `integrations/github/webhook.ts` — Signature validation
- `app/api/webhooks/github/route.ts` — Webhook handler

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

### Q1 2025
- ✅ Complete RLS policies
- ✅ Add tenant isolation to all routes
- ⚠️ SOC 2 Type I certification
- ⚠️ Penetration testing
- ⚠️ Security audit

### Q2 2025
- ⚠️ SOC 2 Type II certification
- ⚠️ ISO 27001 certification
- ⚠️ Bug bounty program
- ⚠️ Security training for team

### Q3 2025
- ⚠️ Enterprise security features (SSO, audit exports)
- ⚠️ Compliance automation
- ⚠️ Security monitoring (SIEM integration)

---

## Contact

**Security Issues:** security@readylayer.com  
**Security Policy:** https://readylayer.com/security  
**Responsible Disclosure:** https://readylayer.com/security/disclosure

---

**Last Updated:** 2024-12-30  
**Next Review:** Quarterly
