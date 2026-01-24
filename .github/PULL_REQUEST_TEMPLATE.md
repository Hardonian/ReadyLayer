## 🎯 Summary

<!-- Provide a brief description of the changes in this PR -->



## 🏷️ Type of Change

<!-- Check all that apply -->

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📖 Documentation update
- [ ] 🧪 Test improvement (new tests or better coverage)
- [ ] ♻️ Refactor (code improvement without changing behavior)
- [ ] ⚡ Performance improvement
- [ ] 🔒 Security fix
- [ ] 🎨 Style/formatting change

## 🔗 Related Issue

<!-- Link to the issue this PR addresses -->
Fixes #<!-- issue number -->

## 📝 Changes

<!-- List the key changes made in this PR -->

-
-
-

## 💥 Breaking Changes

<!-- If this introduces breaking changes, describe them -->

- [ ] No breaking changes
- [ ] Yes, breaking changes (describe below)

<!-- If yes, provide migration path: -->
**What breaks:**

**Migration path:**

## 🧪 Testing

<!-- Describe how you tested these changes -->

### Unit Tests
- [ ] All existing tests pass
- [ ] New tests added for changed functionality
- [ ] Test coverage maintained/improved (>82%)

### E2E Tests
- [ ] All E2E tests pass
- [ ] New E2E tests added (if applicable)
- [ ] Tested in multiple browsers (if UI changes)

### Manual Testing
- [ ] Tested locally in development mode
- [ ] Tested edge cases and error scenarios
- [ ] No visual regressions (if UI changes)

### Security Testing
- [ ] Tenant isolation verified (users can't access other org's data)
- [ ] Secret redaction tested (no secrets exposed to LLM)
- [ ] Input validation tested with malicious inputs
- [ ] Verified no secrets in logs or error messages

## 🔒 Security Review

<!-- Check all that apply -->

### Security Checklist
- [ ] **Tenant Isolation:** All queries filter by `organizationId`
- [ ] **Input Validation:** Zod schemas used for all API inputs
- [ ] **Secret Redaction:** Data passed to LLMs uses `redactSecrets()`
- [ ] **No Hardcoded Secrets:** No API keys, tokens, or passwords in code
- [ ] **SQL Injection Prevention:** Only Prisma ORM used (no raw SQL)
- [ ] **XSS Prevention:** No unsafe `dangerouslySetInnerHTML` usage
- [ ] **Audit Logging:** Critical actions logged to `AuditLog` model
- [ ] **Error Handling:** Errors don't expose sensitive information

### Security Impact
- [ ] No security impact
- [ ] Low impact (internal change, no user-facing security effect)
- [ ] Medium impact (changes authentication/authorization logic)
- [ ] High impact (changes encryption, secret management, or core security)

<!-- If Medium/High impact, please provide details: -->


## 🎨 Code Quality

- [ ] TypeScript strict mode compliant (no `any` types)
- [ ] ESLint passes without warnings
- [ ] Code follows project conventions and style guide
- [ ] Complex logic includes explanatory comments
- [ ] No over-engineering or premature abstractions
- [ ] Dead code removed (no commented-out code)

## 🚀 Performance

- [ ] No obvious performance regressions
- [ ] Database queries optimized (< 100ms for most)
- [ ] Async processing used for long-running tasks
- [ ] Appropriate caching applied (if applicable)
- [ ] No memory leaks introduced

## 📚 Documentation

- [ ] Code comments added for complex logic
- [ ] API documentation updated (if endpoints changed)
- [ ] README updated (if user-facing changes)
- [ ] CHANGELOG.md updated (if applicable)
- [ ] PROGRESS.md updated with fix/feature details

## 🔓 OSS vs Enterprise Boundary

<!-- See docs/OSS_VS_ENTERPRISE_BOUNDARY.md for guidance -->

**Where does this feature belong?**

- [ ] OSS (core governance logic, scanning, policy evaluation)
- [ ] Enterprise (operational convenience: SSO, SLA, managed infra)
- [ ] Both (core in OSS, convenience in Enterprise)
- [ ] NA - This is a bug fix or maintenance change

**Justification:**
<!-- Explain why this belongs in OSS or Enterprise -->

## 🤖 AI Assistance

<!-- Check if AI was used and describe how -->

- [ ] This PR includes AI-generated code
- [ ] All AI-generated code has been reviewed by a human
- [ ] Security checklist completed for AI-generated code
- [ ] All tests pass with AI-generated changes

### AI Assistance Details
<!-- If AI was used, describe what Claude helped with -->

**Claude was used for:**
-


**Human verification performed:**
-


## 📦 Dependencies

<!-- Check all that apply -->

- [ ] No new dependencies added
- [ ] New dependencies added (list below)
- [ ] Dependencies updated (list below)

<!-- If dependencies changed, list them here: -->


## 🔄 Database Changes

<!-- Check all that apply -->

- [ ] No database changes
- [ ] New Prisma migration created
- [ ] Migration tested locally
- [ ] Migration is backwards compatible
- [ ] Seed script updated (if applicable)

<!-- If database changes, describe them: -->


## 🎬 Deployment Notes

<!-- Any special deployment considerations? -->

- [ ] No special deployment steps required
- [ ] Requires environment variable changes (list below)
- [ ] Requires database migration before deploy
- [ ] Requires worker restart after deploy
- [ ] Other (describe below)

<!-- Deployment details: -->


## 📸 Screenshots

<!-- If UI changes, include before/after screenshots -->

### Before


### After


## ✅ Reviewer Checklist

<!-- For reviewers -->

### Code Review
- [ ] Code is clear and understandable
- [ ] No obvious bugs or logic errors
- [ ] Error handling is appropriate
- [ ] Tests cover the changes adequately

### Security Review
- [ ] No security vulnerabilities introduced
- [ ] Tenant isolation maintained
- [ ] Secrets properly managed
- [ ] Input validation in place

### Architecture Review
- [ ] Changes align with project architecture
- [ ] No anti-patterns introduced
- [ ] Code is maintainable and scalable
- [ ] Technical debt not increased

## 📋 Pre-Merge Checklist

<!-- Complete before merging -->

- [ ] All CI checks pass (tests, lint, type-check, build)
- [ ] All review comments addressed
- [ ] Approved by at least one reviewer
- [ ] Branch is up to date with base branch
- [ ] Squash commits if necessary for clean history

---

## 🙏 Additional Notes

<!-- Any other context or information for reviewers -->

