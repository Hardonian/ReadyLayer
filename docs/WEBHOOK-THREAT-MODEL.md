# Webhook Security Threat Model

## Overview

This document outlines the threat model for ReadyLayer's webhook handling system. Webhooks are critical attack surfaces as they receive authenticated commands from external systems.

## Trust Boundaries

```
External Provider (GitHub/GitLab/Bitbucket/Stripe)
         │
         ▼
    ┌─────────────────────────────────────┐
    │     API Gateway / Load Balancer      │
    └─────────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────────┐
    │   Webhook Ingress (API Routes)       │  ← Trust boundary
    │   - Signature verification          │
    │   - Rate limiting                   │
    │   - Replay protection              │
    └─────────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────────┐
    │   Event Processing                  │  ← Trust boundary
    │   - Idempotency checks             │
    │   - Schema validation              │
    │   - Normalization                 │
    └─────────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────────┐
    │   Background Workers               │  ← Trust boundary
    │   - Queue processing              │
    │   - Business logic execution     │
    └─────────────────────────────────────┘
```

## Threat Categories

### 1. Forged Webhooks
**Description**: Attacker sends fake webhook events from outside the provider.

**Mitigations**:
- **Signature verification**: HMAC-SHA256 signature validation for GitHub/Bitbucket
- **Token validation**: Timing-safe comparison for GitLab token verification
- **Stripe SDK verification**: Uses Stripe's official signature verification

**Severity**: Critical
**Impact**: Unauthorized actions, data corruption

### 2. Replay Attacks
**Description**: Attacker captures a valid webhook and re-sends it later.

**Mitigations**:
- **Timestamp validation**: Reject requests older than 5 minutes
- **Nonce tracking**: Redis-backed replay cache with TTL
- **Provider event IDs**: Track unique delivery IDs

**Severity**: High
**Impact**: Duplicate processing, race conditions

### 3. Duplicate Deliveries
**Description**: Provider legitimately retries webhook delivery (network issues, timeouts).

**Mitigations**:
- **Idempotency service**: Database-backed event tracking
- **Duplicate detection**: Return 2xx without re-processing
- **State machine**: pending → processing → completed/failed

**Severity**: Medium
**Impact**: Duplicate side effects, data inconsistency

### 4. Timing Attacks
**Description**: Attacker measures response times to infer signature validity.

**Mitigations**:
- **Constant-time comparison**: `crypto.timingSafeEqual` or Buffer.equals
- **Avoid early returns**: Always perform full comparison
- **Uniform response times**: Return generic errors

**Severity**: Medium
**Impact**: Signature extraction

### 5. SQL Injection (via payload)
**Description**: Malicious webhook payload contains SQL injection.

**Mitigations**:
- **Prisma ORM**: Parameterized queries
- **Schema validation**: Zod validation before processing
- **Input sanitization**: No raw SQL execution

**Severity**: High
**Impact**: Data breach, data destruction

### 6. Denial of Service
**Description**: Attacker floods webhook endpoint with requests.

**Mitigations**:
- **Rate limiting**: Per-installation limits
- **Payload size limits**: Reject oversized payloads
- **Connection timeouts**: Request timeout handling

**Severity**: High
**Impact**: Service unavailability

### 7. Race Conditions
**Description**: Concurrent webhook processing causes inconsistency.

**Mitigations**:
- **Idempotency locks**: Database transactions
- **Optimistic locking**: Version checking on installations
- **Atomic operations**: Single database writes

**Severity**: Medium
**Impact**: Data inconsistency

## Security Properties

### Signature Verification

| Provider | Method | Algorithm | Key Storage |
|----------|--------|------------|-------------|
| GitHub | HMAC | SHA-256 | Installation.webhookSecret |
| GitLab | Token | Plain comparison | Installation.webhookSecret |
| Bitbucket | HMAC | SHA-256 | Installation.webhookSecret |
| Stripe | SDK | RSA/ECDS | STRIPE_WEBHOOK_SECRET |

### Idempotency Guarantees

```typescript
// State machine for each webhook event
type EventStatus =
  | 'pending'    // New event, not yet processed
  | 'processing' // Currently being processed
  | 'completed'  // Successfully processed
  | 'failed'    // Processing failed
  | 'duplicate'  // Already completed, returning cached result
```

### Replay Protection

- **TTL**: 300 seconds (5 minutes)
- **Cache**: Redis with in-memory fallback
- **Key format**: `readylayer:webhook:replay:{provider}:{signature_prefix}`

## Attack Surface Analysis

### Entry Points

1. **GitHub webhook endpoint**: `/api/webhooks/github`
2. **GitLab webhook endpoint**: `/api/webhooks/gitlab`
3. **Bitbucket webhook endpoint**: `/api/webhooks/bitbucket`
4. **Stripe webhook endpoint**: `/api/webhooks/stripe`

### Data Flow

1. Raw payload received
2. Signature verified (fail → 401)
3. Rate limit checked (exceeded → 429)
4. Replay protection checked (replay → 400)
5. Schema validated (invalid → 400)
6. Event queued for processing
7. Worker picks up job
8. Idempotency check (duplicate → skip)
9. Business logic executed
10. Result stored

## Security Controls Summary

| Control | Implementation | Bypass Mitigation |
|---------|---------------|-------------------|
| Signature verification | HMAC-SHA256, SDK | Raw body requirement |
| Replay protection | Redis cache, TTL | Nonce + timestamp |
| Idempotency | Database, state machine | Event IDs |
| Rate limiting | Redis, per-installation | Token bucket |
| Input validation | Zod schemas | Type-safe parsing |
| Output encoding | No raw output | JSON serialization |
| Logging | Structured, filtered | No secrets in logs |

## Testing Recommendations

### Security Tests

```typescript
// Signature validation tests
expect(verifySignature(validPayload, validSig, secret)).toBe(true);
expect(verifySignature(validPayload, invalidSig, secret)).toBe(false);

// Replay detection tests
expect(isReplay(signature, timestamp, nonce)).toBe(false);
expect(isReplay(sameSignature, sameTimestamp, sameNonce)).toBe(true);

// Idempotency tests
expect(processWebhook(eventId)).resolves.not.toThrow();
expect(processWebhook(sameEventId)).resolves.toEqual(cachedResult);
```

### Simulation Script

Run the webhook simulator to test all scenarios:

```bash
# Test all providers and scenarios
npx tsx scripts/webhook-simulator.ts --provider=all --action=all

# Test specific scenario
npx tsx scripts/webhook-simulator.ts --provider=github --action=duplicate
```

## Incident Response

### Suspected Webhook Attack

1. **Detect**: Check logs for signature failures, replay attempts
2. **Contain**: Temporarily disable webhook endpoint
3. **Investigate**: Review audit logs, identify attack source
4. **Remediate**: Rotate compromised secrets
5. **Recover**: Re-enable endpoint, monitor closely

### False Positive Handling

- Providers sometimes send malformed webhooks during outages
- Implement retry logic with backoff
- Log and alert on signature failures for investigation
