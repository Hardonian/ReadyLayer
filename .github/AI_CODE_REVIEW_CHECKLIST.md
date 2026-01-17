# AI-Generated Code Review Checklist

> **⚠️ CRITICAL: Never merge AI-generated code without human review.**

This checklist ensures that AI-assisted code changes meet ReadyLayer's security, quality, and architectural standards before merging.

---

## 🔒 Security Review (MANDATORY)

### Authentication & Authorization
- [ ] **Tenant Isolation:** All database queries filter by `organizationId`
- [ ] **RBAC:** Role-based access control is enforced (owner/admin/member)
- [ ] **API Keys:** API keys are hashed (SHA-256) before storage, never logged
- [ ] **Session Management:** Cookies are httpOnly, SameSite, with appropriate expiry

### Secret Management
- [ ] **No Hardcoded Secrets:** No API keys, tokens, or passwords in code
- [ ] **Secret Redaction:** Data passed to LLMs uses `redactSecrets()` from `lib/secrets/redaction.ts`
- [ ] **Encryption:** Sensitive data encrypted with `encrypt()/decrypt()` from `lib/secrets/encrypt.ts`
- [ ] **Environment Variables:** All secrets stored in `.env`, not committed to git

### Input Validation & Sanitization
- [ ] **Zod Validation:** All API inputs validated with Zod schemas
- [ ] **SQL Injection:** Only Prisma ORM used (no raw SQL queries)
- [ ] **Path Traversal:** File paths validated with whitelist checks
- [ ] **XSS Prevention:** No `dangerouslySetInnerHTML` without proper sanitization
- [ ] **Size Limits:** Request body size limits enforced (2MB for server actions)

### OWASP Top 10 Compliance
- [ ] **A1 - Injection:** Prisma ORM prevents SQL injection
- [ ] **A2 - Broken Auth:** OAuth + JWT properly implemented
- [ ] **A3 - Sensitive Data:** Encryption + redaction in place
- [ ] **A5 - Broken Access Control:** RBAC + RLS enforced
- [ ] **A7 - XSS:** React auto-sanitizes, CSP headers set
- [ ] **A8 - Insecure Deserialization:** Zod validation on all inputs
- [ ] **A10 - Insufficient Logging:** Audit logs capture all actions

### Logging & Monitoring
- [ ] **No Secrets in Logs:** All logging uses `redactSecrets()` or safe loggers
- [ ] **Audit Trail:** Critical actions logged to `AuditLog` model
- [ ] **Error Context:** Errors include context without exposing sensitive data
- [ ] **Correlation IDs:** Requests tracked with correlation IDs for debugging

---

## ✅ Functionality Review

### Core Requirements
- [ ] **Addresses Root Cause:** Fix targets root cause, not just symptoms
- [ ] **All Tests Pass:** Unit tests + E2E tests + integration tests pass
- [ ] **No Regressions:** Related features still work correctly
- [ ] **Edge Cases Handled:** Null values, empty arrays, invalid inputs handled

### API Design (if applicable)
- [ ] **Consistent Response Format:** `{ success, data/error, meta }` structure
- [ ] **HTTP Status Codes:** Correct status codes (200, 201, 400, 401, 403, 404, 500)
- [ ] **Error Handling:** Custom error classes preserve HTTP status codes
- [ ] **Rate Limiting:** Appropriate rate limits applied
- [ ] **Pagination:** Large datasets paginated (limit, offset, cursor)

### Database Changes (if applicable)
- [ ] **Migration Created:** Prisma migration generated and tested
- [ ] **Backwards Compatible:** Migration doesn't break existing data
- [ ] **Indexes Added:** Appropriate indexes for query performance
- [ ] **Relationships Defined:** Foreign keys and relations properly set up

---

## 🎨 Code Quality

### TypeScript & Type Safety
- [ ] **Strict Mode:** No `any` types (use `unknown` if necessary)
- [ ] **Type Inference:** Let TypeScript infer types where obvious
- [ ] **Interfaces Documented:** Complex types have JSDoc comments
- [ ] **Type Check Passes:** `npm run type-check` succeeds

### Code Style & Conventions
- [ ] **Follows Project Conventions:** Matches existing code style
- [ ] **ESLint Passes:** `npm run lint` succeeds without warnings
- [ ] **Naming Conventions:** PascalCase (components), camelCase (functions/vars)
- [ ] **File Organization:** Files in correct directories per project structure

### Code Complexity
- [ ] **No Over-Engineering:** Solution is as simple as possible
- [ ] **Single Responsibility:** Functions/components do one thing well
- [ ] **No Premature Abstraction:** Helpers created only when needed (3+ uses)
- [ ] **No Dead Code:** Unused code removed completely (no comments like `// removed`)

### Documentation
- [ ] **Complex Logic Commented:** "Why" explained, not "what"
- [ ] **API Documented:** Public APIs have JSDoc comments
- [ ] **README Updated:** User-facing changes reflected in docs
- [ ] **CHANGELOG Updated:** Entry added to CHANGELOG.md (if applicable)

---

## 🧪 Testing

### Test Coverage
- [ ] **Unit Tests Added:** Business logic in `services/` tested
- [ ] **E2E Tests Added:** User-facing features tested end-to-end
- [ ] **Test Coverage Maintained:** Coverage stays above 82%
- [ ] **Tests Are Meaningful:** Tests verify behavior, not just coverage

### Test Quality
- [ ] **Clear Test Names:** `it('should do X when Y', ...)` format
- [ ] **Arrange-Act-Assert:** Tests follow AAA pattern
- [ ] **No Flaky Tests:** Tests are deterministic and reliable
- [ ] **Proper Mocking:** External services mocked appropriately

### Security Testing
- [ ] **Tenant Isolation Tested:** Verify users can't access other orgs' data
- [ ] **Secret Redaction Tested:** Verify secrets are redacted before LLM calls
- [ ] **Input Validation Tested:** Test with malicious/invalid inputs
- [ ] **Error Handling Tested:** Verify errors don't leak sensitive info

---

## 🚀 Performance

### Response Time
- [ ] **API Latency:** Endpoints respond in < 500ms (excluding async LLM)
- [ ] **Database Queries:** Queries optimized (< 100ms for most)
- [ ] **Async Processing:** Long-running tasks (LLM) processed in background
- [ ] **Caching:** Appropriate caching for expensive operations

### Resource Usage
- [ ] **Memory Leaks:** No obvious memory leaks introduced
- [ ] **Database Connections:** Prisma connection pooling used correctly
- [ ] **Bundle Size:** No unnecessary dependencies added
- [ ] **Image Optimization:** Images optimized with Next.js Image component

---

## 🚫 Red Flags (IMMEDIATE REJECTION)

If ANY of these are present, **REJECT the code immediately** and ask Claude to fix:

- ❌ **Disabled Tests:** Tests commented out or skipped without justification
- ❌ **TypeScript Ignores:** `@ts-ignore` or `eslint-disable` without explanation
- ❌ **Hardcoded Credentials:** API keys, passwords, or tokens in code
- ❌ **Removed Error Handling:** Error handling deleted or bypassed
- ❌ **Unrelated Changes:** "Improvements" beyond the stated bug fix/feature
- ❌ **No Tenant Isolation:** Database queries missing `organizationId` filter
- ❌ **Secrets in Logs:** API keys or tokens logged to console/files
- ❌ **Raw SQL Queries:** Direct SQL instead of Prisma ORM
- ❌ **Force Push to Main:** Attempting to force push to protected branches

---

## ⚠️ Requires Deeper Review

These patterns require extra scrutiny (not automatic rejection):

- ⚠️ **Auth/Authorization Changes:** Any changes to authentication or access control
- ⚠️ **Database Schema Changes:** Migrations, model changes, relationship updates
- ⚠️ **New Dependencies:** Third-party packages added to package.json
- ⚠️ **Build Config Changes:** Modifications to next.config.js, tsconfig.json, etc.
- ⚠️ **Performance-Critical Code:** Changes to hot paths (API routes, middleware)
- ⚠️ **Encryption Changes:** Modifications to `lib/secrets/` or `lib/crypto/`
- ⚠️ **Policy Engine Changes:** Changes to deterministic evaluation logic

---

## 📋 Pre-Commit Checklist

Before committing AI-generated code:

1. **Review the Diff:**
   ```bash
   git diff --staged
   ```

2. **Run Full Verification:**
   ```bash
   npm test                    # Unit tests
   npm run test:e2e           # E2E tests
   npm run type-check         # TypeScript
   npm run lint               # ESLint
   npm run build              # Production build
   ```

3. **Manual Testing:**
   - [ ] Test the feature/fix manually in the browser
   - [ ] Test edge cases and error scenarios
   - [ ] Verify no visual regressions (if UI change)

4. **Security Verification:**
   - [ ] Run `npm audit` to check for vulnerable dependencies
   - [ ] Verify no secrets exposed (search codebase for API keys)
   - [ ] Test tenant isolation (try accessing other org's data)

5. **Documentation:**
   - [ ] Update PROGRESS.md with fix details
   - [ ] Add comments explaining complex logic
   - [ ] Update API docs if endpoints changed

---

## ✅ Approval Process

### Level 1: Code Review (During Development)
- Ask Claude questions if anything is unclear
- Verify the approach makes sense architecturally
- Check for obvious security issues

### Level 2: Pre-Commit Review
```bash
# Review complete changeset
git diff --staged

# Run verification
./scripts/bug-verify.sh <bug-id>

# Manual testing in browser
npm run dev
```

### Level 3: Commit with Approval
```bash
git commit -m "fix(scope): description

- Detailed change 1
- Detailed change 2

AI-assisted: Claude
Reviewed-by: [Your Name]
Fixes: #<bug-id>"
```

### Level 4: Pull Request Review
- Create PR with detailed description
- Include testing checklist
- Mention AI assistance in PR body
- Request additional review for security-sensitive changes

---

## 📖 Examples

### ✅ Good Commit Message
```
fix(auth): handle expired tokens in middleware

- Add token expiration check before API calls
- Redirect to login on 401 errors
- Add test coverage for token refresh flow

AI-assisted: Claude
Reviewed-by: John Doe
Fixes: #123
```

### ❌ Bad Commit Message
```
fix stuff

AI generated
```

---

## 🤔 When to Ask Claude for Revisions

Ask Claude to revise the code if:

1. **Security Concerns:** Any of the security checks fail
2. **Unclear Logic:** You don't understand what the code does
3. **Missing Tests:** No tests provided for new functionality
4. **Over-Complexity:** Solution seems unnecessarily complex
5. **Style Violations:** Code doesn't match project conventions
6. **Incomplete Fix:** Only addresses symptoms, not root cause

**Example Prompt:**
> "This fix looks good, but I have concerns about tenant isolation. The query in `services/user-service.ts:56` doesn't filter by `organizationId`. Can you update it to ensure users can only access their own organization's data? Also, add a test to verify this isolation."

---

## 📚 Related Documentation

- **CLAUDE.md** - Project context for AI assistance
- **SECURITY.md** - Security best practices and vulnerability reporting
- **CONTRIBUTING.md** - Contribution guidelines
- **docs/architecture/deep-dives.md** - Technical architecture details

---

## 🎯 Remember

> **AI is a co-pilot, not the pilot.**
>
> You are responsible for code quality, security, and correctness.
> Always review, always verify, always approve.

**Never merge code you don't understand.**
