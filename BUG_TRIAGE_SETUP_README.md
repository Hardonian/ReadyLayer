# Bug Triage Workflow Setup - Complete

> **Status:** ✅ Fully Implemented
>
> **Date:** 2026-01-17

This document describes the complete bug triage workflow implementation for ReadyLayer, following cybersecurity best practices and streamlined development processes.

---

## 📦 What Was Implemented

### 1. CLAUDE.md - AI Assistant Context File ✅

**Location:** `/CLAUDE.md`

**Purpose:** Comprehensive project context for Claude AI assistant

**Contains:**
- Project overview and architecture
- Development commands (setup, testing, build, database)
- Project structure and file locations
- Code style and conventions
- Security best practices
- Known issues and quirks
- Testing strategy
- Environment variables
- Quick reference guides

**Usage:**
```bash
# Claude automatically reads this file for context
# No manual action needed - it provides context for all AI assistance
```

---

### 2. Debug Utilities ✅

#### a) Debug Logger (`lib/debug/debug-logger.ts`)

**Features:**
- Safe, structured logging with automatic secret redaction
- Emoji-prefixed log levels (🚀 start, 📍 checkpoint, ✅ success, ❌ error)
- Performance profiling
- Request context tracking
- Correlation IDs for distributed tracing

**Usage:**
```typescript
import { createDebugLogger } from '@/lib/debug/debug-logger';

const debug = createDebugLogger('user-service');

function processUser(user: User) {
  debug.start('Processing user', { userId: user.id });

  const validated = validateUser(user);
  debug.checkpoint('Validation complete', { isValid: validated });

  debug.success('User processed successfully');
}
```

#### b) Error Context Capture (`lib/debug/error-context.ts`)

**Features:**
- Comprehensive error context capture
- Breadcrumb tracking (path leading to error)
- Request, user, and system context
- Formatted error reports

**Usage:**
```typescript
import { captureErrorContext, addBreadcrumb } from '@/lib/debug/error-context';

// Track breadcrumbs
addBreadcrumb('payment', 'Starting payment processing');
addBreadcrumb('payment', 'Validating card details');

try {
  await processPayment();
} catch (error) {
  const context = captureErrorContext(error, {
    userId: '123',
    amount: 99.99,
  });
  logger.error('Payment failed', context);
}
```

---

### 3. Bug Triage Scripts ✅

#### a) Initialize Bug Triage (`scripts/bug-triage.sh`)

**Purpose:** Set up bug triage workflow for a new bug

**Usage:**
```bash
./scripts/bug-triage.sh 123 "fix auth token expiry"
```

**What it does:**
1. Creates branch `bug/fix-123`
2. Runs full test suite (unit + E2E + type-check + lint)
3. Captures output to log files
4. Creates progress tracking entry
5. Generates summary for Claude

**Output:**
- `logs/bug-triage/bug-123-unit-tests.log`
- `logs/bug-triage/bug-123-e2e-tests.log`
- `logs/bug-triage/bug-123-type-check.log`
- `logs/bug-triage/bug-123-lint.log`
- `logs/bug-triage/bug-123-summary.md`

#### b) Debug Session (`scripts/bug-debug.sh`)

**Purpose:** Run tests with DEBUG_MODE enabled for detailed logging

**Usage:**
```bash
# Run all tests with debug logging
./scripts/bug-debug.sh 123

# Run specific test with debug logging
./scripts/bug-debug.sh 123 e2e/auth.spec.ts
./scripts/bug-debug.sh 123 services/user-service
```

**What it does:**
1. Enables DEBUG_MODE and verbose logging
2. Runs specified tests
3. Captures detailed debug output
4. Generates debug summary

**Output:**
- `logs/bug-triage/bug-123-debug-TIMESTAMP.log`
- `logs/bug-triage/bug-123-debug-summary.md`

#### c) Verify Bug Fix (`scripts/bug-verify.sh`)

**Purpose:** Comprehensive verification that bug is fixed

**Usage:**
```bash
./scripts/bug-verify.sh 123
```

**What it does:**
1. Runs unit tests
2. Runs E2E tests
3. Runs type check
4. Runs linter
5. Runs production build
6. Updates PROGRESS.md
7. Provides commit and PR instructions

**Output:**
- `logs/bug-triage/bug-123-verify-TIMESTAMP.log`
- Updated `PROGRESS.md`

---

### 4. Security Utilities ✅

#### a) Security Validator (`lib/debug/security-validator.ts`)

**Purpose:** Validate code for security issues during bug triage

**Features:**
- Tenant isolation checks (organizationId filtering)
- Secret exposure detection
- SQL injection prevention
- XSS vulnerability detection
- Input validation checks
- Error handling verification
- Logging safety validation

**Usage:**
```typescript
import { validateSecurity } from '@/lib/debug/security-validator';

const issues = await validateSecurity({
  code: fileContent,
  type: 'api-route',
});

console.log(generateSecurityReport(issues));
```

#### b) Security Check Script (`scripts/security-check.sh`)

**Purpose:** Run security checks before committing

**Usage:**
```bash
# Check entire codebase
./scripts/security-check.sh

# Check specific file or directory
./scripts/security-check.sh services/user-service.ts
./scripts/security-check.sh app/api/
```

**Checks:**
1. Exposed secrets (API keys, tokens, private keys)
2. Hardcoded passwords
3. SQL injection risks (raw queries)
4. XSS vulnerabilities (dangerouslySetInnerHTML)
5. Missing tenant isolation (organizationId)
6. Unsafe logging (secrets in logs)
7. Committed .env files
8. Vulnerable dependencies (npm audit)

---

### 5. MCP Tools Configuration ✅

**Location:** `.mcp-config.json`

**Purpose:** Configure Model Context Protocol tools for debugging

**Tools Configured:**
- **Playwright:** UI debugging and E2E test creation
- **Filesystem:** File system access for logs and code
- **GitHub:** Issue tracking and PR analysis
- **Sequential Thinking:** Enhanced reasoning for complex bugs

**Workflow Steps:**
1. Capture - Read logs and error context
2. Reproduce - Create minimal reproduction
3. Analyze - AI-assisted root cause analysis
4. Fix - Implement and verify
5. Document - Update progress tracking

---

### 6. Review and Approval Templates ✅

#### a) AI Code Review Checklist (`.github/AI_CODE_REVIEW_CHECKLIST.md`)

**Purpose:** Ensure AI-generated code meets security and quality standards

**Sections:**
- 🔒 Security Review (MANDATORY)
  - Authentication & Authorization
  - Secret Management
  - Input Validation
  - OWASP Top 10 Compliance
  - Logging & Monitoring
- ✅ Functionality Review
- 🎨 Code Quality
- 🧪 Testing
- 🚀 Performance
- 🚫 Red Flags (immediate rejection criteria)
- ⚠️ Requires Deeper Review

#### b) Pull Request Template (`.github/PULL_REQUEST_TEMPLATE.md`)

**Purpose:** Standardized PR description with security focus

**Sections:**
- Summary and related issue
- Changes made
- Testing checklist (unit, E2E, manual, security)
- Security review checklist
- Code quality verification
- Performance considerations
- Documentation updates
- AI assistance disclosure
- Dependencies and database changes
- Deployment notes

---

### 7. Progress Tracking ✅

#### a) PROGRESS.md Template

**Purpose:** Track bugs, features, and improvements

**Sections:**
- Current sprint status
- Health metrics
- Bug fixes (with template)
- Features (with template)
- Improvements & refactoring
- Testing improvements
- Documentation updates
- Deployment history
- Metrics & analytics
- Sprint retrospectives
- Notes & learnings
- Future work & backlog

#### b) Bug Triage Workflow Guide (`docs/BUG_TRIAGE_WORKFLOW.md`)

**Purpose:** Complete guide for AI-assisted bug debugging

**Contents:**
- Quick start guide
- The Ralph Loop (6-step process)
- Interactive debugging loop
- Security-focused debugging
- Testing strategy
- Common debugging scenarios
- Tools and commands reference
- Working with Claude (effective prompts)
- Success criteria

---

## 🚀 Getting Started

### Initial Setup

1. **Review CLAUDE.md**
   ```bash
   cat CLAUDE.md
   ```
   This file is automatically read by Claude for context.

2. **Test the scripts**
   ```bash
   # Ensure scripts are executable
   chmod +x scripts/*.sh

   # Try a mock bug triage
   ./scripts/bug-triage.sh test-123 "test bug triage workflow"
   ```

3. **Enable debug mode (optional)**
   ```bash
   # Add to .env.local
   echo "DEBUG_MODE=true" >> .env.local
   ```

### Your First Bug Triage

1. **Initialize triage**
   ```bash
   ./scripts/bug-triage.sh <bug-id> "brief description"
   ```

2. **Review logs**
   ```bash
   cat logs/bug-triage/bug-<id>-summary.md
   ```

3. **Share with Claude**
   - Paste failing test output
   - Ask Claude for logging suggestions
   - Add suggested logging to code

4. **Run debug session**
   ```bash
   ./scripts/bug-debug.sh <bug-id>
   ```

5. **Iterate with Claude**
   - Share debug logs
   - Identify root cause
   - Implement fix

6. **Verify fix**
   ```bash
   ./scripts/bug-verify.sh <bug-id>
   ```

7. **Commit and PR**
   ```bash
   git add .
   git commit -m "fix: description (closes #<bug-id>)"
   git push -u origin $(git branch --show-current)
   gh pr create
   ```

---

## 📚 Documentation Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI assistant project context |
| `.github/AI_CODE_REVIEW_CHECKLIST.md` | Security-focused code review |
| `.github/PULL_REQUEST_TEMPLATE.md` | Standardized PR template |
| `PROGRESS.md` | Development progress tracking |
| `docs/BUG_TRIAGE_WORKFLOW.md` | Complete bug triage guide |
| `lib/debug/debug-logger.ts` | Safe debug logging utility |
| `lib/debug/error-context.ts` | Error context capture |
| `lib/debug/security-validator.ts` | Security validation utility |
| `scripts/bug-triage.sh` | Initialize bug triage |
| `scripts/bug-debug.sh` | Run debug session |
| `scripts/bug-verify.sh` | Verify bug fix |
| `scripts/security-check.sh` | Security validation |
| `.mcp-config.json` | MCP tools configuration |

---

## 🔒 Security Features

All utilities follow ReadyLayer's security principles:

1. **Automatic Secret Redaction**
   - All logging uses `redactSecrets()` from `lib/secrets/redaction.ts`
   - Debug output automatically sanitized

2. **Tenant Isolation Enforcement**
   - Security validator checks for `organizationId` filters
   - Alerts on missing tenant isolation

3. **OWASP Top 10 Protection**
   - SQL injection prevention (Prisma ORM only)
   - XSS protection (dangerouslySetInnerHTML detection)
   - Secret exposure detection
   - Input validation enforcement

4. **Audit Trail**
   - All debug sessions logged
   - Progress tracking in PROGRESS.md
   - Git commits include AI-assistance disclosure

---

## 🎯 Best Practices

### Working with Claude

1. **Be Specific**
   ```
   ❌ "Fix the bug"
   ✅ "The UserService.fetchUser returns 404. Here's the code and logs..."
   ```

2. **Share Context**
   - Always include error messages
   - Provide code snippets
   - Share relevant logs

3. **Iterate**
   - Start with basic logging
   - Increase detail iteratively
   - Root cause emerges through iteration

4. **Review Everything**
   - Never merge without human review
   - Use AI_CODE_REVIEW_CHECKLIST.md
   - Verify security implications

### Debugging Workflow

1. **Reproduce First**
   - Write failing test
   - Confirm bug exists
   - Document expected vs actual

2. **Add Logging Strategically**
   - Start at error location
   - Work backwards through call stack
   - Log inputs, transformations, outputs

3. **Analyze Logs Carefully**
   - Look for unexpected values
   - Check for null/undefined
   - Verify data transformations

4. **Fix Root Cause**
   - Address cause, not symptoms
   - Consider edge cases
   - Update tests

---

## 📊 Metrics

Track these metrics in PROGRESS.md:

- **Test Coverage:** Current 82%, target 85%
- **Bug Fix Time:** Average time from triage to resolution
- **Security Issues:** Count of security issues caught
- **AI Assistance:** Percentage of bugs resolved with AI help

---

## 🤝 Contributing

When adding new debugging utilities:

1. Follow existing patterns in `lib/debug/`
2. Include automatic secret redaction
3. Add comprehensive JSDoc comments
4. Include usage examples
5. Update CLAUDE.md with new utilities
6. Add tests for new utilities

---

## 🆘 Troubleshooting

### Scripts Not Executing

```bash
# Make scripts executable
chmod +x scripts/*.sh
```

### Debug Logs Too Verbose

```bash
# Disable debug mode
export DEBUG_MODE=false

# Or remove from .env
```

### MCP Tools Not Working

```bash
# Install MCP tools
npx -y @modelcontextprotocol/server-playwright
npx -y @modelcontextprotocol/server-filesystem
```

---

## 🎉 Success!

You now have a complete, security-focused bug triage workflow with AI assistance!

**Key Benefits:**
- ✅ Systematic approach to bug fixing (Ralph Loop)
- ✅ AI-assisted debugging with Claude
- ✅ Automatic security validation
- ✅ Comprehensive progress tracking
- ✅ Safe debug logging with secret redaction
- ✅ Standardized review process

**Start triaging bugs with confidence! 🐛🔍**

---

For questions or improvements, open an issue on GitHub.
