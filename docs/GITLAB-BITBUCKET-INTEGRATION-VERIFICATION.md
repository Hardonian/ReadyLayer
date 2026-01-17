# GitLab & Bitbucket Integration Verification Guide

**Date:** 2026-01-17
**Status:** Code Complete, Testing Pending
**Integration Files:** ✅ Verified to exist

---

## Integration Status

### GitLab Integration ✅

**Files Verified:**
- `/integrations/gitlab/api-client.ts` ✅ (9644 bytes)
- `/integrations/gitlab/webhook.ts` ✅ (6560 bytes)

**API Client Methods:**
- `getPR()` - Get merge request details
- `getPRDiff()` - Get MR diff
- `postPRComment()` - Post MR comment
- `updateCommitStatus()` - Update commit status
- `getFileContent()` - Fetch file content
- `createOrUpdateMergeRequestNote()` - Create/update MR notes

**Webhook Events Supported:**
- `merge_request` - Opened/updated
- `push` - Branch push
- `pipeline` - CI/CD pipeline events

---

### Bitbucket Integration ✅

**Files Verified:**
- `/integrations/bitbucket/api-client.ts` ✅ (11242 bytes)
- `/integrations/bitbucket/webhook.ts` ✅ (7860 bytes)

**API Client Methods:**
- `getPR()` - Get pull request details
- `getPRDiff()` - Get PR diff
- `postPRComment()` - Post PR comment
- `updateCommitStatus()` - Update build status
- `getFileContent()` - Fetch file content

**Webhook Events Supported:**
- `pullrequest:created` - PR opened
- `pullrequest:updated` - PR updated
- `pullrequest:fulfilled` - PR merged
- `repo:push` - Branch push

---

## Manual Verification Checklist

### GitLab OAuth Flow

**Prerequisites:**
- GitLab application created at https://gitlab.com/-/profile/applications
- Redirect URI: `https://your-domain.com/api/integrations/gitlab/callback`
- Scopes: `api`, `read_user`, `read_repository`

**Environment Variables:**
```bash
GITLAB_CLIENT_ID=your_client_id
GITLAB_CLIENT_SECRET=your_client_secret
GITLAB_WEBHOOK_SECRET=your_webhook_secret
```

**Test Steps:**
1. Navigate to `/api/integrations/gitlab/install`
2. Should redirect to GitLab OAuth page
3. Authorize application
4. Should redirect to callback with `code` parameter
5. Callback should:
   - Exchange code for access token
   - Store encrypted token in database
   - Create Installation record
   - Redirect to dashboard with success message

**Success Criteria:**
- [ ] OAuth redirect works
- [ ] Token exchange succeeds
- [ ] Token stored encrypted in `Installation` table
- [ ] `tokenEncrypted = true` flag set
- [ ] User redirected to dashboard
- [ ] Installation appears in UI

---

### Bitbucket OAuth Flow

**Prerequisites:**
- Bitbucket OAuth consumer created at https://bitbucket.org/account/settings/app-passwords/
- Callback URL: `https://your-domain.com/api/integrations/bitbucket/callback`
- Permissions: `repository:read`, `pullrequest:read`, `pullrequest:write`

**Environment Variables:**
```bash
BITBUCKET_CLIENT_ID=your_client_id
BITBUCKET_CLIENT_SECRET=your_client_secret
BITBUCKET_WEBHOOK_SECRET=your_webhook_secret
```

**Test Steps:**
1. Navigate to `/api/integrations/bitbucket/install`
2. Should redirect to Bitbucket OAuth page
3. Authorize application
4. Should redirect to callback with `code` parameter
5. Callback should:
   - Exchange code for access token
   - Store encrypted token in database
   - Create Installation record
   - Redirect to dashboard with success message

**Success Criteria:**
- [ ] OAuth redirect works
- [ ] Token exchange succeeds
- [ ] Token stored encrypted in `Installation` table
- [ ] `tokenEncrypted = true` flag set
- [ ] User redirected to dashboard
- [ ] Installation appears in UI

---

## Webhook Verification

### GitLab Webhook Testing

**Setup Webhook:**
1. Go to GitLab project → Settings → Webhooks
2. URL: `https://your-domain.com/api/webhooks/gitlab`
3. Secret Token: `$GITLAB_WEBHOOK_SECRET`
4. Trigger: Merge request events, Push events
5. Enable SSL verification

**Test Merge Request Events:**

```bash
# Send test webhook payload
curl -X POST https://your-domain.com/api/webhooks/gitlab \
  -H "Content-Type: application/json" \
  -H "X-Gitlab-Event: Merge Request Hook" \
  -H "X-Gitlab-Token: $GITLAB_WEBHOOK_SECRET" \
  -d '{
    "object_kind": "merge_request",
    "event_type": "merge_request",
    "project": {
      "id": 123,
      "path_with_namespace": "owner/repo"
    },
    "object_attributes": {
      "iid": 1,
      "title": "Test MR",
      "source_branch": "feature",
      "target_branch": "main",
      "last_commit": {
        "id": "abc123"
      },
      "action": "open"
    }
  }'
```

**Success Criteria:**
- [ ] Webhook signature verified
- [ ] Event parsed correctly
- [ ] Review triggered
- [ ] Commit status updated on GitLab
- [ ] MR comment posted with results
- [ ] Audit log created

---

### Bitbucket Webhook Testing

**Setup Webhook:**
1. Go to Bitbucket repo → Settings → Webhooks
2. URL: `https://your-domain.com/api/webhooks/bitbucket`
3. Secret: `$BITBUCKET_WEBHOOK_SECRET`
4. Triggers: Pull request created, Pull request updated
5. Status: Active

**Test Pull Request Events:**

```bash
# Send test webhook payload
curl -X POST https://your-domain.com/api/webhooks/bitbucket \
  -H "Content-Type: application/json" \
  -H "X-Event-Key: pullrequest:created" \
  -H "X-Hook-UUID: unique-id" \
  -d '{
    "pullrequest": {
      "id": 1,
      "title": "Test PR",
      "source": {
        "branch": {
          "name": "feature"
        },
        "commit": {
          "hash": "abc123"
        }
      },
      "destination": {
        "branch": {
          "name": "main"
        }
      }
    },
    "repository": {
      "full_name": "owner/repo",
      "uuid": "{repo-uuid}"
    }
  }'
```

**Success Criteria:**
- [ ] Webhook signature verified
- [ ] Event parsed correctly
- [ ] Review triggered
- [ ] Build status updated on Bitbucket
- [ ] PR comment posted with results
- [ ] Audit log created

---

## Database Verification

### Check Installation Records

```sql
-- Verify GitLab installation
SELECT
  id,
  provider,
  providerId,
  tokenEncrypted,
  isActive,
  installedAt
FROM "Installation"
WHERE provider = 'gitlab';

-- Verify Bitbucket installation
SELECT
  id,
  provider,
  providerId,
  tokenEncrypted,
  isActive,
  installedAt
FROM "Installation"
WHERE provider = 'bitbucket';

-- Verify all tokens are encrypted
SELECT provider, COUNT(*) as total,
       SUM(CASE WHEN "tokenEncrypted" THEN 1 ELSE 0 END) as encrypted
FROM "Installation"
GROUP BY provider;
```

**Expected Results:**
- All installations have `tokenEncrypted = true`
- `providerId` matches GitLab/Bitbucket installation ID
- `isActive = true`
- `installedAt` timestamp present

---

## End-to-End Integration Test

### GitLab E2E Test

**Scenario:** Full PR review workflow

1. **Setup:**
   - Install GitLab OAuth app
   - Configure webhook
   - Connect repository to ReadyLayer

2. **Create Merge Request:**
   - Create branch with code changes
   - Open MR on GitLab
   - Webhook triggers ReadyLayer review

3. **Verify Review:**
   - Check commit status on GitLab (pending → completed)
   - Verify MR comment with review summary
   - Check ReadyLayer dashboard for results
   - Verify violations appear in database

4. **Verify Billing:**
   - Check that review counted against org's LLM budget
   - Verify cost tracking recorded

5. **Verify Audit:**
   - Check audit log for review creation
   - Verify audit chain integrity

**Success Criteria:**
- [ ] MR triggers review automatically
- [ ] Commit status updated correctly
- [ ] MR comment posted with results
- [ ] Dashboard shows review details
- [ ] Billing tracked correctly
- [ ] Audit log complete

---

### Bitbucket E2E Test

**Scenario:** Full PR review workflow

1. **Setup:**
   - Install Bitbucket OAuth app
   - Configure webhook
   - Connect repository to ReadyLayer

2. **Create Pull Request:**
   - Create branch with code changes
   - Open PR on Bitbucket
   - Webhook triggers ReadyLayer review

3. **Verify Review:**
   - Check build status on Bitbucket (in progress → success/failed)
   - Verify PR comment with review summary
   - Check ReadyLayer dashboard for results
   - Verify violations appear in database

4. **Verify Billing:**
   - Check that review counted against org's LLM budget
   - Verify cost tracking recorded

5. **Verify Audit:**
   - Check audit log for review creation
   - Verify audit chain integrity

**Success Criteria:**
- [ ] PR triggers review automatically
- [ ] Build status updated correctly
- [ ] PR comment posted with results
- [ ] Dashboard shows review details
- [ ] Billing tracked correctly
- [ ] Audit log complete

---

## Known Limitations

### GitLab

**Current Implementation:**
- ✅ OAuth flow
- ✅ Webhook handling
- ✅ Commit status updates
- ✅ MR comments
- ❌ **Not Tested:** Code suggestions (inline comments)
- ❌ **Not Tested:** File-level annotations
- ❌ **Not Tested:** Rate limit handling

**Future Enhancements:**
- Add inline code suggestions
- Implement GraphQL API support
- Add pipeline integration

---

### Bitbucket

**Current Implementation:**
- ✅ OAuth flow
- ✅ Webhook handling
- ✅ Build status updates
- ✅ PR comments
- ❌ **Not Tested:** Inline comments
- ❌ **Not Tested:** Code insights integration
- ❌ **Not Tested:** Rate limit handling

**Future Enhancements:**
- Add inline comment support
- Implement Code Insights API
- Add Bitbucket Pipelines integration

---

## Automated Testing

### Create E2E Tests

**Test File:** `e2e/gitlab-integration.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('GitLab Integration', () => {
  test('should complete OAuth flow', async ({ page }) => {
    // Navigate to installation
    await page.goto('http://localhost:3000/api/integrations/gitlab/install');

    // Should redirect to GitLab
    await expect(page).toHaveURL(/gitlab\.com\/oauth\/authorize/);

    // Mock OAuth callback
    await page.goto('http://localhost:3000/api/integrations/gitlab/callback?code=test&state=test');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/localhost:3000\/dashboard/);
  });

  test('should handle merge request webhook', async ({ request }) => {
    const response = await request.post('/api/webhooks/gitlab', {
      data: {
        object_kind: 'merge_request',
        // ... webhook payload
      },
      headers: {
        'X-Gitlab-Event': 'Merge Request Hook',
        'X-Gitlab-Token': process.env.GITLAB_WEBHOOK_SECRET!,
      },
    });

    expect(response.status()).toBe(200);
  });
});
```

**Test File:** `e2e/bitbucket-integration.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Bitbucket Integration', () => {
  test('should complete OAuth flow', async ({ page }) => {
    await page.goto('http://localhost:3000/api/integrations/bitbucket/install');
    await expect(page).toHaveURL(/bitbucket\.org\/site\/oauth2\/authorize/);
  });

  test('should handle pull request webhook', async ({ request }) => {
    const response = await request.post('/api/webhooks/bitbucket', {
      data: {
        pullrequest: {
          // ... webhook payload
        },
      },
      headers: {
        'X-Event-Key': 'pullrequest:created',
      },
    });

    expect(response.status()).toBe(200);
  });
});
```

---

## Deployment Checklist

### Before Enabling GitLab/Bitbucket

- [ ] Environment variables configured
- [ ] OAuth applications created on GitLab/Bitbucket
- [ ] Webhook secrets generated
- [ ] Token encryption verified
- [ ] Rate limiting tested
- [ ] Error handling verified
- [ ] Audit logging tested
- [ ] Billing enforcement verified

### Launch Criteria

- [ ] Manual E2E test completed successfully
- [ ] Automated E2E tests passing
- [ ] Performance tested (webhook response < 500ms)
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Support team trained

---

## Rollout Strategy

**Phase 1: Beta Testing (Week 1)**
- Enable for internal org only
- Monitor webhook processing
- Collect feedback

**Phase 2: Limited Release (Week 2)**
- Enable for 5-10 beta customers
- Monitor error rates
- Iterate based on feedback

**Phase 3: General Availability (Week 3+)**
- Enable for all customers
- Announce in product updates
- Create migration guide from GitHub

---

## Monitoring & Alerts

### Key Metrics

**Success Metrics:**
- GitLab/Bitbucket webhook processing rate
- OAuth flow completion rate
- Token refresh success rate
- API error rate (should be <1%)

**Performance Metrics:**
- Webhook response time (target: <500ms)
- API call latency (target: <200ms)
- Queue processing time (target: <5s)

**Error Alerts:**
- OAuth failures (threshold: >5% in 5 minutes)
- Webhook signature failures (threshold: >10 in 1 hour)
- API rate limit errors (threshold: >100 in 5 minutes)
- Token decryption failures (threshold: >1 in 5 minutes)

---

## Support Documentation

**Customer-Facing Guides:**
- [ ] GitLab integration setup guide
- [ ] Bitbucket integration setup guide
- [ ] Webhook troubleshooting guide
- [ ] OAuth troubleshooting guide

**Internal Documentation:**
- [x] This verification guide
- [ ] Runbook for common issues
- [ ] API rate limit handling guide
- [ ] Token rotation procedures

---

## Conclusion

**Current Status:**
- ✅ Code implementation complete
- ✅ API client methods verified
- ✅ Webhook handlers verified
- ⏳ **Manual E2E testing pending**
- ⏳ **Automated E2E tests pending**
- ⏳ **Production deployment pending**

**Next Steps:**
1. Complete manual E2E testing (4 hours)
2. Create automated E2E tests (8 hours)
3. Security review (4 hours)
4. Beta release to internal org
5. Iterate based on feedback
6. General availability release

**Estimated Time to Production:** 16-24 hours of focused work
