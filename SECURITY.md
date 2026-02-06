# Security Policy

Security is critical for governance tooling. This document explains how to report vulnerabilities and how to keep local environments safe.

## Reporting a Vulnerability

Please do **not** file public GitHub issues for security reports.

Email: [security@readylayer.io](mailto:security@readylayer.io)

Include:
- A clear description of the issue
- Steps to reproduce
- Potential impact
- Any proof-of-concept (if safe)
- Your preferred contact for follow-up

We aim to acknowledge reports within a few business days and will coordinate timelines for disclosure once a fix is ready.

## Supported Versions

Security fixes are applied to the `main` branch. If you are running a fork, please plan to pull updates regularly.

## Security Best Practices for Contributors

- **Never commit secrets.** Use `.env` locally and keep it out of version control.
- **Redact sensitive output** when sharing logs or screenshots.
- **Keep dependencies updated** and follow guidance from `npm audit`.
- **Validate external inputs** in new API endpoints or CLI commands.

## Threat Model Summary

**Primary assets**
- Governance run results, evidence bundles, and audit logs
- Installation tokens and webhook secrets
- Customer source code accessed via integrations

**Key threat actors**
- External attackers targeting webhook endpoints or public API routes
- Misconfigured integrations (invalid secrets, missing scopes)
- Insider abuse of privileged API keys or admin roles

**Primary risks**
- Webhook spoofing or replay
- Unauthorized access to organization data
- Leakage of secrets in logs or audit trails
- Denial-of-service on public endpoints

**Mitigations**
- Raw-body signature verification and replay protection on webhooks
- RBAC enforcement for all authenticated routes
- Structured error responses with sanitized output
- Rate limiting on public endpoints with in-memory fallback

## Deployment Guidance

If you deploy ReadyLayer yourself:
- Run behind HTTPS.
- Restrict access to administrative routes.
- Use least-privilege database credentials.
- Rotate API keys and tokens periodically.

## Webhook Security

ReadyLayer implements comprehensive webhook security measures to protect against common attack vectors.

### Signature Verification

All incoming webhooks from GitHub, GitLab, and Bitbucket are verified using HMAC signatures:

- **GitHub**: Uses `X-Hub-Signature-256` header with SHA-256 HMAC
- **GitLab**: Uses `X-Gitlab-Token` header with timing-safe comparison
- **Bitbucket**: Uses `X-Hub-Signature` header with SHA-256 HMAC

Webhook payloads are verified against the raw body (not re-stringified JSON) to prevent tampering.

### Replay Protection

ReadyLayer implements replay attack prevention using timestamp and nonce validation:

- **Timestamp Validation**: Webhooks must include `X-Hub-Signature-256-Timestamp` header
- **Nonce Validation**: Webhooks must include `X-Hub-Signature-256-Nonce` header
- **TTL Enforcement**: Webhooks older than 5 minutes are rejected
- **Cache Storage**: Recent signatures are cached (Redis with TTL fallback to in-memory)

Example headers for protected webhooks:
```
X-Hub-Signature-256: sha256=<signature>
X-Hub-Signature-256-Timestamp: <unix_timestamp>
X-Hub-Signature-256-Nonce: <timestamp>:<random_string>
```

### Rate Limiting

Webhook endpoints are rate-limited to prevent abuse:

- **Default Limit**: 100 requests per minute per installation
- **Redis Backend**: Distributed rate limiting across server instances
- **Fallback**: In-memory rate limiting if Redis unavailable

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699900000
```

#### Upgrade Path

For production scale, use Redis-backed rate limiting by setting `REDIS_URL`. The system
automatically falls back to in-memory limiting when Redis is unavailable, but the
distributed limiter is strongly recommended for multi-instance deployments.

### Security Headers

All API responses include security-related headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

## Environment Variables Security

Required environment variables are documented in `.env.example`. Never commit `.env` files.

Sensitive operations:
- **Database**: Uses connection pooling with credentials from environment
- **Redis**: Optional for rate limiting and caching
- **Webhooks**: Use per-installation webhook secrets

## Secrets Hygiene

- Secrets are loaded exclusively from environment variables.
- Logging utilities redact sensitive values where possible.
- Demo mode and fixtures contain no real tokens or credentials.

## Audit Trail

All governance decisions are logged with:
- Request IDs for correlation
- Timestamps (ISO 8601)
- Actor identification
- Action performed
- Resources affected

## Error Handling

Error responses sanitize sensitive information:
- Production: Generic error messages
- Development: Stack traces available locally
- Request IDs included for support correlation

## Compliance ReadyLayer

ReadyLayer is designed with compliance in mind:
- Deterministic outputs for audit reproducibility
- Evidence bundles for policy decisions
- Policy version tracking
- Decision records with full transparency

For additional guidance, see the documentation in `docs/`.
