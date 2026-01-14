# Security Audit Checklist - Week 4

## Overview
This document provides a comprehensive security audit checklist for ReadyLayer. All items must be verified before launch.

## A. Secrets & Credentials Management

### A1: No Secrets in Code
- [ ] **Action**: Run `npm run scan:secrets` on entire codebase
- [ ] **Verify**: All `.env.local`, `*.pem`, and credential files are in `.gitignore`
- [ ] **Check**: No API keys, tokens, or passwords in source code
- [ ] **Test**: `e2e/secrets-redaction.spec.ts` passes (secrets properly redacted)
- [ ] **Logs**: Verify logs never contain sensitive data
- [ ] **Config**: Database credentials only in environment variables

### A2: Secrets Redaction Service
- [ ] **Test**: `lib/secrets/redaction.ts` detects 18+ secret patterns
- [ ] **Verify**: Integration in `services/review-guard/index.ts` (code is redacted before LLM)
- [ ] **Verify**: Integration in `services/doc-sync/index.ts` (documents don't leak secrets)
- [ ] **Check**: Error messages don't contain user data or secrets
- [ ] **Logs**: No secrets in application logs
- [ ] **Database**: Sensitive fields encrypted at rest

### A3: Environment Variables
- [ ] **Verify**: All secrets use `REPLACE_ENV.*` pattern for deployment
- [ ] **Check**: `process.env` access only in server-side code
- [ ] **Audit**: `lib/env.ts` validates all required environment variables
- [ ] **Test**: Missing env vars fail fast with clear error messages

### A4: API Keys & Tokens
- [ ] **Stripe**: Secret key stored in environment, public key in code is OK
- [ ] **GitHub**: OAuth tokens rotated and stored securely
- [ ] **Slack**: Bot tokens stored in database, encrypted
- [ ] **Supabase**: JWT tokens use secure httpOnly cookies
- [ ] **Rotation**: Policy for quarterly key rotation documented

## B. Authentication & Authorization

### B1: Authentication
- [ ] **OAuth**: GitHub/Google OAuth flow uses PKCE
- [ ] **State Parameter**: CSRF protection via state token validated
- [ ] **Sessions**: JWT tokens have appropriate expiration (15 min access, 7 day refresh)
- [ ] **Test**: `e2e/github-app-oauth.spec.ts` passes
- [ ] **Logout**: Tokens revoked/invalidated on logout
- [ ] **Password**: Hashed with bcrypt (if applicable)

### B2: Authorization (RBAC)
- [ ] **Verify**: `lib/authz.ts` implements proper role checking
- [ ] **Test**: Users can only access their organizations
- [ ] **Test**: Org members can only access org data
- [ ] **Admin**: Admin endpoints require admin role
- [ ] **RLS**: Row-level security policies enforced in Supabase
- [ ] **Audit**: `lib/api-route-helpers.ts` enforces auth on all endpoints

### B3: API Authentication
- [ ] **Public Endpoints**: Clearly documented (health, auth)
- [ ] **Protected Endpoints**: All require valid JWT or session
- [ ] **Rate Limiting**: Public endpoints have strict rate limits
- [ ] **Test**: Unauthenticated requests return 401
- [ ] **Test**: Expired tokens return 401

## C. Data Protection

### C1: Encryption at Rest
- [ ] **Database**: PII fields encrypted (emails, names, etc.)
- [ ] **Tokens**: Slack/integration tokens encrypted in database
- [ ] **Backups**: Database backups also encrypted
- [ ] **Files**: User uploads encrypted in storage

### C2: Encryption in Transit
- [ ] **HTTPS**: All traffic over HTTPS (no HTTP except localhost)
- [ ] **TLS**: TLS 1.2+ required
- [ ] **Certificates**: Valid and up-to-date
- [ ] **HSTS**: HSTS header present (max-age >= 31536000)
- [ ] **Test**: Mixed content warnings absent

### C3: Data Retention & Deletion
- [ ] **Policy**: Document data retention periods
- [ ] **Deletion**: Users can delete their data
- [ ] **Test**: Deletion cascade works correctly
- [ ] **Compliance**: GDPR "right to be forgotten" implemented
- [ ] **Logs**: Sensitive audit logs rotated after 90 days

## D. CORS & CSRF

### D1: CORS Configuration
- [ ] **Verify**: CORS headers restrict to allowed origins only
- [ ] **Check**: `Access-Control-Allow-Origin` not set to `*`
- [ ] **Credentials**: Credentials flag set correctly
- [ ] **Methods**: Only necessary HTTP methods allowed
- [ ] **Test**: Cross-origin requests properly rejected

### D2: CSRF Protection
- [ ] **Forms**: All forms include CSRF token
- [ ] **Middleware**: `middleware.ts` validates CSRF tokens
- [ ] **SameSite**: Cookies have `SameSite=Lax` or `Strict`
- [ ] **State**: OAuth flows use state parameter
- [ ] **Test**: CSRF attacks are prevented

## E. Input Validation & Sanitization

### E1: Input Validation
- [ ] **Schemas**: All inputs validated against schemas (Zod, etc.)
- [ ] **Types**: TypeScript strict mode enabled (`tsconfig.json`)
- [ ] **Limits**: Request size limits enforced
- [ ] **Format**: Email, URL, etc. validated properly
- [ ] **Test**: Invalid inputs rejected gracefully

### E2: SQL Injection Prevention
- [ ] **ORM**: Using Supabase/Prisma (not raw queries)
- [ ] **Parameterized**: All queries use parameterized statements
- [ ] **Scan**: `npm run scan:sql-injection` passes
- [ ] **Test**: SQL injection attempts blocked

### E3: XSS Prevention
- [ ] **Sanitization**: `lib/sanitize.ts` or similar sanitizes HTML
- [ ] **React**: React's automatic escaping prevents XSS
- [ ] **dangerouslySetInnerHTML**: Only used when absolutely necessary
- [ ] **Content-Security-Policy**: CSP header set
- [ ] **Test**: XSS payloads are escaped

## F. API Security

### F1: Rate Limiting
- [ ] **Global**: Global rate limit (e.g., 1000 req/min per user)
- [ ] **Per-Endpoint**: Stricter limits on sensitive endpoints
- [ ] **Anonymous**: Very strict limits on public endpoints
- [ ] **Redis**: Rate limiting backed by Redis cache
- [ ] **Test**: `lib/rate-limiting/` enforces limits
- [ ] **Graceful**: Returns 429 with Retry-After header

### F2: Request Validation
- [ ] **Content-Type**: Enforced for POST/PUT requests
- [ ] **Body Size**: Maximum request body size enforced
- [ ] **Headers**: Unnecessary headers removed/validated
- [ ] **Logging**: Request validation failures logged

### F3: Response Security
- [ ] **No Stack Traces**: Error responses don't leak stack traces
- [ ] **No Enumeration**: Don't reveal user enumeration ("user not found" vs "password wrong")
- [ ] **No Leaks**: Response doesn't contain unintended data
- [ ] **Timing Attacks**: Timing attacks mitigated (e.g., constant-time comparison)

## G. Logging & Monitoring

### G1: Security Logging
- [ ] **Auth Events**: All login/logout logged with timestamp and IP
- [ ] **Admin Actions**: All admin actions logged
- [ ] **Data Access**: Sensitive data access logged
- [ ] **Failures**: Failed auth attempts logged (for rate limiting)
- [ ] **No Secrets**: Logs never contain passwords, tokens, API keys

### G2: Monitoring & Alerts
- [ ] **Anomalies**: Unusual activity triggers alerts
- [ ] **Thresholds**: Alert on rate limit breaches
- [ ] **Dashboards**: Security metrics visible in observability
- [ ] **Testing**: Error tracking (e.g., Sentry) configured
- [ ] **Response**: Incident response procedures documented

### G3: Audit Trail
- [ ] **Immutable**: Audit logs are immutable or append-only
- [ ] **Retention**: Audit logs retained for 1+ year
- [ ] **Access**: Audit logs access is restricted and logged
- [ ] **Compliance**: HIPAA/PCI/SOC2 audit requirements met

## H. Dependency Security

### H1: Vulnerable Dependencies
- [ ] **Scan**: Run `npm audit` and `npm audit fix`
- [ ] **Zero Critical**: Zero critical vulnerabilities in dependencies
- [ ] **Outdated**: All dependencies up-to-date (within reason)
- [ ] **Lock File**: `package-lock.json` committed and reproducible
- [ ] **Monitoring**: Dependabot or similar alerts for new vulnerabilities

### H2: Supply Chain
- [ ] **Trusted Sources**: Only install from npm registry
- [ ] **Verification**: Package signatures verified where available
- [ ] **License**: Review licenses of new dependencies
- [ ] **Minimal**: Avoid unnecessary dependencies
- [ ] **Audit**: Periodic audit of dependency security

## I. Infrastructure & Deployment

### I1: Deployment Security
- [ ] **HTTPS**: All endpoints accessible only over HTTPS
- [ ] **Secrets**: Production secrets managed via GitHub Actions Secrets
- [ ] **Permissions**: GitHub Actions has minimal permissions
- [ ] **Logs**: Build logs don't contain secrets
- [ ] **Staging**: Staging environment mirrors production security

### I2: Database Security
- [ ] **Backups**: Regular backups with encryption
- [ ] **Isolation**: Database only accessible from app
- [ ] **Credentials**: DB credentials rotated quarterly
- [ ] **Updates**: Database version kept up-to-date
- [ ] **RLS**: Row-level security policies enforced

### I3: Storage Security
- [ ] **Access**: File uploads require authentication
- [ ] **Validation**: File type/size validated
- [ ] **Encryption**: Files encrypted in storage
- [ ] **Expiry**: Temporary files cleaned up
- [ ] **Scan**: Files scanned for malware (if applicable)

## J. Privacy & Compliance

### J1: Privacy Policy
- [ ] **Documented**: Privacy policy is clear and comprehensive
- [ ] **Data**: Describes what data is collected and why
- [ ] **Sharing**: Describes third-party data sharing
- [ ] **Rights**: Documents user privacy rights
- [ ] **Location**: Privacy policy is accessible on website

### J2: GDPR Compliance
- [ ] **Consent**: Explicit consent obtained before processing
- [ ] **Transparency**: Users know what data is collected
- [ ] **Access**: Users can export their data
- [ ] **Deletion**: Users can request data deletion
- [ ] **DPA**: Data Processing Agreement in place if applicable

### J3: Compliance Standards
- [ ] **PCI-DSS**: If handling payment cards, PCI-DSS compliance documented
- [ ] **HIPAA**: If handling health data, HIPAA compliance documented
- [ ] **SOC2**: External audit planned or completed
- [ ] **Policies**: All compliance policies documented

## K. Code Review & Testing

### K1: Security Code Review
- [ ] **All PRs**: Security review required on all code changes
- [ ] **Checklist**: Use security review checklist
- [ ] **Dependencies**: Flag any new dependency additions
- [ ] **Secrets**: Scan for hardcoded secrets in every PR

### K2: Security Testing
- [ ] **Unit Tests**: Security-focused unit tests exist
- [ ] **E2E Tests**: `e2e/complete-flow.spec.ts` passes
- [ ] **E2E Tests**: `e2e/llm-async-timeout.spec.ts` passes
- [ ] **OWASP**: Test for OWASP Top 10 vulnerabilities
- [ ] **Coverage**: Security-critical paths have test coverage >90%

### K3: Vulnerability Scanning
- [ ] **SAST**: Static application security testing (Semgrep, etc.)
- [ ] **DAST**: Dynamic testing in staging environment
- [ ] **Dependency**: Dependency vulnerability scanning enabled
- [ ] **Secrets**: Secret scanning enabled in GitHub
- [ ] **Results**: All findings reviewed and resolved

## L. Incident Response

### L1: Incident Plan
- [ ] **Documented**: Incident response plan is written
- [ ] **Team**: Response team identified and trained
- [ ] **Contacts**: Emergency contacts documented
- [ ] **Timeline**: Response SLAs defined
- [ ] **Playbooks**: Specific playbooks for common incidents

### L2: Breach Response
- [ ] **Detection**: Method to detect data breaches documented
- [ ] **Notification**: Notification process to affected users documented
- [ ] **Timeline**: Breach notification timeline (typically 72 hours)
- [ ] **Authorities**: Process to notify authorities if required

## Verification Checklist

Run these commands to verify security posture:

```bash
# Scan for secrets
npm run scan:secrets

# Check dependencies
npm audit
npm audit fix

# Lint and format
npm run lint
npm run format

# Type check
npm run typecheck

# Run security tests
npm run test:security
npm run test:e2e -- complete-flow.spec.ts
npm run test:e2e -- llm-async-timeout.spec.ts

# Build and test production build
npm run build
npm run start &
npm run test:e2e
```

## Sign-Off

- [ ] All items above verified
- [ ] No critical security issues found
- [ ] Team lead approved security posture
- [ ] Ready for production launch

**Reviewed by:** [Name]  
**Date:** [Date]  
**Version:** 1.0
