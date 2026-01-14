# Contributing to ReadyLayer

Thank you for your interest in contributing to ReadyLayer! We welcome all kinds of contributions, from bug reports to feature implementations.

## Code of Conduct

Please read and follow our **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)** — we're committed to providing a welcoming and inclusive environment for all contributors.

---

## Ways to Contribute

### 🐛 Report Bugs
Found a bug? Help us fix it!

1. Check if the issue already exists: **[GitHub Issues](https://github.com/readylayer/readylayer/issues)**
2. If not, create a new issue with:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment (OS, browser, Node version)
   - Screenshots/logs if relevant

### ✨ Suggest Features
Have an idea? We'd love to hear it!

1. **[Start a Discussion](https://github.com/readylayer/readylayer/discussions)** first (not an issue)
2. Describe your use case and why it matters
3. Wait for feedback from maintainers
4. Proceed with implementation if approved

### 📖 Improve Documentation
Documentation is never perfect. Help us make it better!

- Fix typos, grammar, or clarity
- Add examples or tutorials
- Improve architecture diagrams
- Clarify confusing sections
- Translate docs to other languages

### 🧪 Write Tests
We aim for 85%+ code coverage. Help us get there!

- Add unit tests for new features
- Add integration tests for complex flows
- Add E2E tests for user journeys
- Improve existing test coverage

### 🔧 Fix Code Issues
Ready to contribute code?

1. Look for issues labeled **[good first issue](https://github.com/readylayer/readylayer/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)**
2. Comment on the issue to claim it
3. Follow the development setup below
4. Submit a PR when ready

---

## Development Setup

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** 8+ (`npm install -g pnpm`)
- **PostgreSQL** 14+ (for local DB)
- **Git** ([Download](https://git-scm.com/))

### 1. Fork & Clone

```bash
# Fork the repo on GitHub (top-right corner)

# Clone your fork
git clone https://github.com/YOUR_USERNAME/readylayer.git
cd readylayer

# Add upstream remote
git remote add upstream https://github.com/readylayer/readylayer.git
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment

```bash
# Copy environment template
cp .env.example .env.local

# Update .env.local with your settings
# (leave defaults for local development)
```

### 4. Start Development Server

```bash
pnpm dev
```

Open **http://localhost:3000** in your browser.

### 5. Verify Everything Works

```bash
# Run tests
pnpm test

# Run linter
pnpm lint

# Run type checker
pnpm type

# Build for production
pnpm build
```

---

## Making Changes

### Create a Feature Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/my-awesome-feature
```

### Follow Code Standards

#### TypeScript
- Use **strict mode** (`"strict": true`)
- No `any` types (except documented escapes)
- All API responses must be typed
- Use discriminated unions for error types

#### Naming
- **Components:** PascalCase (`MyComponent.tsx`)
- **Functions:** camelCase (`myFunction()`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Files:** kebab-case for utilities (`my-util.ts`)

#### Code Organization
```
src/
├── app/              # Next.js app routes
├── components/       # React components
├── lib/             # Utilities & helpers
├── services/        # Business logic
├── workers/         # Background jobs
├── types/           # TypeScript types
└── styles/          # CSS files
```

#### Comments
- Write self-documenting code first
- Use comments for **why**, not **what**
- Document complex algorithms
- Add JSDoc for public APIs

```typescript
// ❌ Bad: Obvious from code
const x = data.length; // Get length

// ✅ Good: Explains intent
const uniqueUserCount = data.length; // Deduplicated via Set earlier

// ✅ Good: Explains complex logic
/**
 * Uses exponential backoff with jitter
 * to prevent thundering herd on retry
 */
async function retryWithBackoff() { ... }
```

### Commit Messages

Follow **[Conventional Commits](https://www.conventionalcommits.org/)**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style (formatting)
- `refactor:` Code reorganization
- `perf:` Performance improvement
- `test:` Test addition/changes
- `chore:` Build/tooling

**Examples:**
```bash
git commit -m "feat(auth): add CSRF token validation to GitHub OAuth"
git commit -m "fix(api): handle null responses in test runner"
git commit -m "docs(setup): improve local development instructions"
git commit -m "test(secrets): add redaction validation tests"
```

---

## Testing

### Run All Tests

```bash
# Unit tests
pnpm test

# Watch mode (re-run on changes)
pnpm test --watch

# Coverage report
pnpm test --coverage
```

### Add Tests

Tests live next to code:
```
src/lib/
├── auth.ts
└── auth.test.ts        # Test file
```

Write tests for:
- **Happy path** (normal usage)
- **Edge cases** (boundary conditions)
- **Error cases** (failure scenarios)
- **Security** (auth, validation)

```typescript
import { redactSecrets } from './redaction';

describe('redactSecrets', () => {
  it('should detect and redact API keys', () => {
    const code = "const key = 'sk-proj-abc123def456';";
    const result = redactSecrets(code);
    
    expect(result.secretsFound).toBe(1);
    expect(result.redacted).toContain('[API-KEY-OPENAI_REDACTED]');
    expect(result.redacted).not.toContain('sk-proj-');
  });
});
```

### Coverage Goals
- **Unit tests:** 85%+ coverage
- **Critical paths:** 100% coverage
- **Don't obsess:** Focus on meaningful tests, not coverage numbers

---

## Code Review

### Before Submitting a PR

```bash
# Update from upstream
git fetch upstream
git rebase upstream/main

# Run all checks
pnpm lint       # Fix linting errors
pnpm type       # Fix TypeScript errors
pnpm test       # Ensure tests pass
pnpm build      # Ensure build succeeds
```

### Submit a Pull Request

1. **Push your branch**
   ```bash
   git push origin feature/my-awesome-feature
   ```

2. **Create PR on GitHub**
   - Use the PR template
   - Link related issues (`Fixes #123`)
   - Describe what changed and why
   - Add screenshots for UI changes

3. **PR Title Format**
   ```
   feat: add CSRF protection to GitHub OAuth
   fix: handle null responses in test runner
   docs: improve setup guide
   ```

4. **Wait for Review**
   - Maintainers review in 48 hours
   - Address feedback with new commits
   - Don't force-push while under review

### What Maintainers Look For

✅ **Code Quality**
- Follows style guidelines
- Has tests
- Handles errors properly
- No console.log statements

✅ **Security**
- No hardcoded secrets
- Input validation
- Proper error handling
- No security vulnerabilities

✅ **Performance**
- No N+1 queries
- Efficient algorithms
- Caching where appropriate
- No memory leaks

✅ **Documentation**
- Comments for complex logic
- Updated docs if needed
- Commit messages clear
- PR description helpful

---

## Debugging Tips

### VS Code Configuration

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js",
      "type": "node",
      "request": "launch",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/node_modules/.bin/next",
      "args": ["dev"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Common Issues

**"Module not found"**
```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install
```

**"Port 3000 already in use"**
```bash
# Use different port
PORT=3001 pnpm dev
```

**"Database connection failed"**
```bash
# Check .env.local
# Ensure PostgreSQL is running
# Try resetting database
pnpm db:reset
```

---

## Documentation

### Writing Docs

Documentation lives in `/docs`:
```
docs/
├── getting-started/
├── features/
├── api/
├── architecture/
├── integrations/
└── README.md
```

### Format
- Use Markdown
- Include code examples
- Add diagrams where helpful
- Keep it up-to-date

### Example Doc Structure
```markdown
# Feature Name

## Overview
One-line description

## Benefits
Why would someone use this?

## Setup
Step-by-step instructions

## Examples
Real-world usage

## Troubleshooting
Common issues
```

---

## Deployment

### Staging Changes
```bash
# Deploy to staging
pnpm deploy:staging

# Verify on staging
# Then deploy to production
pnpm deploy:production
```

---

## Questions?

- 💬 **[GitHub Discussions](https://github.com/readylayer/readylayer/discussions)** — Ask community
- 🙌 **[Slack Community](https://readylayer.io/slack)** — Chat with maintainers
- 📧 **[Email](mailto:hello@readylayer.io)** — Contact core team

---

## Recognition

Contributors are recognized in:
- **[README.md](./README.md)** — List of contributors
- **Release notes** — Mentioned in changelog
- **GitHub** — Appears on contributor graph

Thank you for making ReadyLayer better! 🎉

---

<div align="center">

**Happy Contributing!** 🚀

Questions? Ask in **[GitHub Discussions](https://github.com/readylayer/readylayer/discussions)**

</div>
