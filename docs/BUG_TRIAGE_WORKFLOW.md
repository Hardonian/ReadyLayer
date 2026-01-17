# Bug Triage Workflow for ReadyLayer

> **AI-Assisted Bug Debugging & Resolution**
>
> This guide describes the complete bug triage workflow using Claude as your pair programmer.

---

## 🎯 Quick Start

### For a New Bug

```bash
# 1. Initialize bug triage
./scripts/bug-triage.sh <bug-id> "description"

# 2. Review initial logs
cat logs/bug-triage/bug-<bug-id>-summary.md

# 3. Share failing test output with Claude
cat logs/bug-triage/bug-<bug-id>-unit-tests.log

# 4. Add debug logging based on Claude's suggestions
# (Edit code to add detailed logging)

# 5. Run debug session
./scripts/bug-debug.sh <bug-id>

# 6. Share debug logs with Claude, iterate until root cause found

# 7. Implement fix (with Claude's help)

# 8. Verify fix
./scripts/bug-verify.sh <bug-id>

# 9. Commit and push
git add .
git commit -m "fix: description (closes #<bug-id>)"
git push -u origin $(git branch --show-current)
```

---

## 📋 The Ralph Loop

A systematic approach to bug fixing:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  1. READ → 2. PINPOINT → 3. WRITE TEST →          │
│     4. FIX → 5. RUN → 6. DOCUMENT                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Step 1: READ - Capture Failing Test Output

**Goal:** Understand what's failing and capture initial context.

```bash
# Initialize triage workflow
./scripts/bug-triage.sh 123 "fix auth token expiry"
```

**This script:**
- Creates branch `bug/fix-123`
- Runs full test suite and captures output
- Creates log files in `logs/bug-triage/`
- Generates summary for Claude

**Share with Claude:**
```
"Here's the failing test output for bug #123. Help me understand what's breaking:

[paste logs/bug-triage/bug-123-unit-tests.log]
"
```

### Step 2: PINPOINT - Identify Buggy File/Function

**Goal:** Narrow down the exact location and cause of the bug.

**Claude analyzes the stack trace:**
```
Error: Expected 200 but got 404
  at /src/services/api.ts:142:15
  at processResponse (src/lib/response-handler.ts:28:10)
  at UserService.fetchUser (src/services/user.service.ts:56:18)
```

**Claude identifies:** `user.service.ts:56` is calling an incorrect endpoint.

**Ask Claude for logging suggestions:**
```
"Claude, where should I add debug logging to understand why this is failing?
I suspect the issue is in services/user.service.ts around line 56."
```

**Claude suggests logging points:**
```typescript
// services/user.service.ts
import { createDebugLogger } from '@/lib/debug/debug-logger';

const debug = createDebugLogger('user-service');

class UserService {
  async fetchUser(id: string) {
    debug.start('Fetching user', { id });

    const endpoint = `/users/${id}`;
    debug.data('Endpoint', endpoint);

    try {
      const response = await api.get(endpoint);
      debug.success('User fetched', { status: response.status });
      return response.data;
    } catch (error) {
      debug.error('Failed to fetch user', error, { id, endpoint });
      throw error;
    }
  }
}
```

**Run debug session:**
```bash
./scripts/bug-debug.sh 123 services/user-service
```

**Share debug output with Claude:**
```
"Here's the debug output with logging added:

[paste logs/bug-triage/bug-123-debug-*.log]
"
```

### Step 3: WRITE TEST - Create Reproduction Test

**Goal:** Write a failing test that reproduces the bug before fixing it.

**Claude provides test:**
```typescript
// services/user-service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { UserService } from '../user.service';
import * as api from '@/lib/api';

describe('UserService.fetchUser', () => {
  it('should call correct API endpoint for user ID', async () => {
    const mockGet = vi.spyOn(api, 'get').mockResolvedValue({
      status: 200,
      data: { id: '123', name: 'Test User' }
    });

    const userService = new UserService();
    await userService.fetchUser('123');

    // Bug: currently calls /user/123 instead of /users/123
    expect(mockGet).toHaveBeenCalledWith('/users/123');
  });
});
```

**Run the test to confirm it fails:**
```bash
npm test -- services/user-service.test.ts
```

### Step 4: FIX - Implement the Solution

**Claude provides fix:**
```typescript
// services/user.service.ts
class UserService {
  async fetchUser(id: string) {
    // Before: const response = await api.get(`/user/${id}`);
    // After:
    const response = await api.get(`/users/${id}`);
    return response.data;
  }
}
```

**Review the fix:**
1. Does it address the root cause?
2. Are there any security implications?
3. Is tenant isolation maintained?
4. Are secrets properly redacted?

**Use the review checklist:**
```
See: .github/AI_CODE_REVIEW_CHECKLIST.md
```

### Step 5: RUN - Verify the Fix

**Run comprehensive verification:**
```bash
./scripts/bug-verify.sh 123
```

**This script runs:**
- ✅ Unit tests
- ✅ E2E tests
- ✅ Type check
- ✅ Linter
- ✅ Production build

**Expected output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ ALL CHECKS PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Bug fix verified successfully!
```

### Step 6: DOCUMENT - Update Progress Tracking

**Verification script auto-updates PROGRESS.md:**
```markdown
## Bug #123 - Fix Auth Token Expiry

**Status:** ✅ Fixed
**Branch:** `bug/fix-123`
**Started:** 2026-01-17 10:00:00

### Resolution
- **Fixed:** 2026-01-17 11:30:00
- **Files Changed:** services/user.service.ts, services/user.service.test.ts
- **Verification:** All tests passed ✓
```

**Commit and push:**
```bash
git add .
git commit -m "fix(auth): handle expired tokens in middleware

- Add token expiration check before API calls
- Redirect to login on 401 errors
- Add test coverage for token refresh flow

AI-assisted: Claude
Reviewed-by: [Your Name]
Fixes: #123"

git push -u origin bug/fix-123
```

**Create pull request:**
```bash
gh pr create --title "Fix: Auth Token Expiry (Bug #123)" \
  --body "See PROGRESS.md for details"
```

---

## 🔍 Interactive Debugging Loop

### Log-Driven Debug Cycle

**The iterative process:**

1. **Initial Error** → Add basic logging
2. **Run Tests** → Capture logs
3. **Analyze Logs** → Identify suspicious areas
4. **Add Detailed Logging** → Focus on problem areas
5. **Run Tests Again** → Capture detailed logs
6. **Root Cause Found** → Implement fix

### Using Debug Utilities

**Import debug logger:**
```typescript
import { createDebugLogger } from '@/lib/debug/debug-logger';

const debug = createDebugLogger('module-name');
```

**Log execution flow:**
```typescript
function processPayment(userId: string, amount: number) {
  debug.start('Processing payment', { userId, amount });

  const user = await fetchUser(userId);
  debug.checkpoint('User fetched', { user: user.id });

  const validated = validatePayment(user, amount);
  debug.checkpoint('Payment validated', { isValid: validated });

  if (!validated) {
    debug.warn('Payment validation failed', { userId, amount });
    throw new Error('Invalid payment');
  }

  const result = await chargeStripe(user, amount);
  debug.success('Payment processed', { transactionId: result.id });

  return result;
}
```

**Use error context capture:**
```typescript
import { captureErrorContext } from '@/lib/debug/error-context';

try {
  await processPayment(userId, amount);
} catch (error) {
  const context = captureErrorContext(error, {
    userId,
    amount,
    operation: 'payment-processing',
  });

  logger.error('Payment failed', context);
  throw error;
}
```

**Use breadcrumbs for complex flows:**
```typescript
import { createBreadcrumbTracker } from '@/lib/debug/error-context';

const tracker = createBreadcrumbTracker('checkout-flow');

tracker.log('User initiated checkout');
tracker.log('Cart validated', { items: 3, total: 99.99 });
tracker.log('Payment method selected', { method: 'card' });
tracker.warn('Retry attempt 1', { reason: 'timeout' });
tracker.error('Checkout failed', { error: 'card_declined' });
```

---

## 🔒 Security-Focused Debugging

### Always Use Secret Redaction

**Before passing data to LLMs:**
```typescript
import { redactSecrets } from '@/lib/secrets/redaction';

const codeToAnalyze = readFileSync('user-code.ts', 'utf-8');
const safeCode = redactSecrets(codeToAnalyze);

// Now safe to send to Claude
await analyzecode(safeCode);
```

### Verify Tenant Isolation in Fixes

**Test pattern:**
```typescript
describe('Tenant Isolation', () => {
  it('should not allow access to other org data', async () => {
    const org1User = await createUser({ organizationId: 'org-1' });
    const org2Data = await createData({ organizationId: 'org-2' });

    // Attempt to access org-2 data as org-1 user
    await expect(
      fetchData(org2Data.id, { user: org1User })
    ).rejects.toThrow('Not found'); // Should not exist for this user
  });
});
```

### Check for Secret Exposure in Logs

**Verify no secrets in debug output:**
```bash
# After debugging, check logs for secrets
./scripts/bug-debug.sh 123

# Search for potential secrets
grep -iE "(api_key|apikey|secret|password|token)" \
  logs/bug-triage/bug-123-debug-*.log
```

**Expected result:** Only `[REDACTED]` should appear, never actual secrets.

---

## 🧪 Testing Strategy for Bug Fixes

### Test Types

1. **Reproduction Test** - Fails before fix, passes after
2. **Regression Test** - Ensures bug doesn't reappear
3. **Edge Case Tests** - Covers boundary conditions
4. **Integration Test** - Verifies fix in realistic scenario

### Example Test Suite

```typescript
describe('Bug #123: Auth Token Expiry', () => {
  // Reproduction test
  it('should handle expired tokens correctly', async () => {
    const expiredToken = generateExpiredToken();
    const response = await fetch('/api/user', {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });

    expect(response.status).toBe(401);
    expect(response.headers.get('Location')).toBe('/auth/login');
  });

  // Edge cases
  it('should handle missing token', async () => {
    const response = await fetch('/api/user');
    expect(response.status).toBe(401);
  });

  it('should handle malformed token', async () => {
    const response = await fetch('/api/user', {
      headers: { Authorization: 'Bearer invalid-token' }
    });
    expect(response.status).toBe(401);
  });

  // Integration test
  it('should allow valid token through', async () => {
    const validToken = generateValidToken();
    const response = await fetch('/api/user', {
      headers: { Authorization: `Bearer ${validToken}` }
    });

    expect(response.status).toBe(200);
  });
});
```

---

## 📊 Common Debugging Scenarios

### Scenario 1: API Returns 404

**Symptoms:**
- API endpoint returns 404
- Expected data not found

**Debug checklist:**
1. ✅ Verify endpoint URL is correct
2. ✅ Check route is registered in Next.js
3. ✅ Verify tenant isolation (organizationId filter)
4. ✅ Check database for data existence
5. ✅ Review middleware that might intercept request

**Claude prompt:**
```
"API endpoint /api/v1/users/123 returns 404. Here's the route handler:

[paste code]

And here's the test output:

[paste logs]

Help me debug why the endpoint isn't found."
```

### Scenario 2: Database Query Returns Empty

**Symptoms:**
- Query executes but returns no results
- Data exists in database

**Debug checklist:**
1. ✅ Verify query filters (especially `organizationId`)
2. ✅ Check for typos in field names
3. ✅ Verify data exists (Prisma Studio)
4. ✅ Check for soft deletes (`deletedAt IS NULL`)
5. ✅ Review query relationships (includes)

**Claude prompt:**
```
"This Prisma query returns empty array, but data exists in database:

[paste query code]

Database has this data:

[paste Prisma Studio screenshot or data]

What's wrong with my query?"
```

### Scenario 3: Test Fails Intermittently

**Symptoms:**
- Test passes sometimes, fails other times
- No obvious pattern

**Debug checklist:**
1. ✅ Check for race conditions (async/await)
2. ✅ Verify test isolation (cleanup between tests)
3. ✅ Check for shared state
4. ✅ Review timing assumptions
5. ✅ Check for external dependencies (network, database)

**Claude prompt:**
```
"This test fails intermittently:

[paste test code]

Here are two runs - one passing, one failing:

Passing: [paste output]
Failing: [paste output]

Help me identify the race condition or timing issue."
```

### Scenario 4: Frontend Error Not Visible in Backend

**Symptoms:**
- Error shows in browser console
- Backend logs show no error

**Debug checklist:**
1. ✅ Check network tab for failed requests
2. ✅ Verify error is being thrown (not swallowed)
3. ✅ Check middleware error handling
4. ✅ Review try/catch blocks
5. ✅ Check if error is client-side only

**Claude prompt:**
```
"Browser shows this error:

[paste browser console error]

But backend logs show nothing. Network tab shows:

[paste network response]

Help me understand where the error is being swallowed."
```

---

## 🛠️ Tools & Commands Reference

### Bug Triage Scripts

```bash
# Initialize bug triage
./scripts/bug-triage.sh <bug-id> "description"

# Run debug session (with detailed logs)
./scripts/bug-debug.sh <bug-id> [test-file]

# Verify fix
./scripts/bug-verify.sh <bug-id>
```

### Manual Testing Commands

```bash
# Run specific test file
npm test -- path/to/test.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific E2E test
npx playwright test e2e/auth.spec.ts

# Run E2E with UI
npm run test:e2e:ui

# Run E2E in headed mode (visible browser)
npm run test:e2e:headed
```

### Database Commands

```bash
# Open Prisma Studio (view data)
npm run prisma:studio

# Run migrations
npm run prisma:migrate dev

# Reset database (WARNING: destructive)
npm run prisma:reset

# Verify schema
npm run db:verify
```

### Log Analysis Commands

```bash
# View full debug log
cat logs/bug-triage/bug-<id>-debug-*.log | less

# Find errors in logs
grep -i "error" logs/bug-triage/bug-<id>-debug-*.log

# Find specific function calls
grep "functionName" logs/bug-triage/bug-<id>-debug-*.log

# Count occurrences
grep -c "pattern" logs/bug-triage/bug-<id>-debug-*.log
```

---

## 🤝 Working with Claude

### Effective Prompts

**❌ Bad:**
```
"Fix the bug in user service"
```

**✅ Good:**
```
"The UserService.fetchUser method is returning 404 errors. Here's the code:

[paste code]

And here's the failing test output:

[paste test output]

The stack trace points to line 56. Help me identify why the endpoint is incorrect and suggest a fix with tests."
```

### Iterative Improvement

**Round 1: Initial analysis**
```
"Here's the failing test. What's wrong?"
```

**Round 2: Add logging**
```
"Based on your analysis, I added logging. Here's the output:

[paste debug logs]

What does this tell us?"
```

**Round 3: Root cause**
```
"The logs show X is null when Y happens. What's the root cause?"
```

**Round 4: Fix + tests**
```
"Perfect! Now help me write a fix and comprehensive tests."
```

### Code Review with Claude

**Before committing:**
```
"Review this fix for security issues:

[paste git diff]

Specifically check:
1. Tenant isolation (organizationId filtering)
2. Secret redaction
3. Input validation
4. SQL injection prevention
5. XSS vulnerabilities"
```

---

## 📚 Related Resources

### Documentation
- **CLAUDE.md** - AI assistant context
- **AI_CODE_REVIEW_CHECKLIST.md** - Review guidelines
- **SECURITY.md** - Security best practices
- **CONTRIBUTING.md** - Contribution guidelines

### Debug Utilities
- **lib/debug/debug-logger.ts** - Safe debug logging
- **lib/debug/error-context.ts** - Error context capture
- **lib/secrets/redaction.ts** - Secret redaction

### Scripts
- **scripts/bug-triage.sh** - Initialize triage
- **scripts/bug-debug.sh** - Debug session
- **scripts/bug-verify.sh** - Verify fix

---

## 🎯 Success Criteria

A bug is considered **properly fixed** when:

- ✅ Root cause identified and documented
- ✅ Reproduction test written (fails before fix)
- ✅ Fix implemented following project conventions
- ✅ All tests pass (unit + E2E + type + lint + build)
- ✅ Security checklist completed
- ✅ Code reviewed (human or AI-assisted)
- ✅ Progress tracking updated
- ✅ PR created with detailed description
- ✅ No regressions introduced

---

**Remember:** AI is a powerful debugging partner, but you're the pilot. Always review, always verify, always understand the fix before merging.
