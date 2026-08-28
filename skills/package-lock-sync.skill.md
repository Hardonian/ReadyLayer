# Package Lock Sync Skill

**Trigger:** When modifying `package.json`, installing dependencies, or running `npm install`/`pnpm install`

## Overview

The `package-lock.json` file must always be in sync with `package.json`. Out-of-sync lockfiles cause Vercel deployment failures with error: "npm ci can only install packages when your package.json and package-lock.json are in sync."

## When to Update package-lock.json

**ALWAYS run** one of these commands after any `package.json` change:
- `npm install` (for npm-based projects)
- `pnpm install` (for pnpm-based projects - check for `pnpm-lock.yaml`)

**Never commit** `package.json` changes without also updating the lockfile.

## Detection Checklist

Before committing, verify:

### 1. Check Lockfile Status
```bash
# For npm/npm-based projects
git status package-lock.json

# For pnpm-based projects
git status pnpm-lock.yaml

# For yarn-based projects
git status yarn.lock
```

### 2. Verify Sync
```bash
# Test if lockfile is in sync (npm projects)
npm ci
```
If this fails, run `npm install` to regenerate.

### 3. Check for Vulnerabilities
```bash
npm audit
# Then fix any high/severity issues before committing
```

## Agent Workflow

When modifying dependencies:

### Step 1: Make package.json changes
- Add/remove packages from `package.json`
- Update version numbers

### Step 2: Update lockfile (MANDATORY)
```bash
npm install
# OR
pnpm install
```

### Step 3: Verify changes
```bash
git status
# Should show both package.json and package-lock.json (or pnpm-lock.yaml)
```

### Step 4: Test locally
```bash
npm ci             # Verify lockfile sync
npm run build      # Verify build succeeds
npm run test       # Run tests if present (optional)
```

### Step 5: Commit
```bash
git add package.json package-lock.json  # Both files
git commit -m "feat: add new dependency"
```

## Pre-Commit Hook Enforcement

Create `.git/hooks/pre-commit` (optional):

```bash
#!/bin/bash
# Prevent commits with out-of-sync lockfile

if git diff --cached --name-only | grep -q "package.json"; then
  echo "Checking package-lock.json sync status..."

  if git diff --cached --name-only | grep -q "package-lock.json"; then
    echo "✓ package-lock.json updated"
  else
    echo "✗ Error: package.json modified but package-lock.json not updated"
    echo "Run 'npm install' to regenerate lockfile"
    exit 1
  fi
fi
```

## Common Scenarios

### Adding a new package
```bash
npm install <package-name>
# Lockfile auto-updates
git add package.json package-lock.json
```

### Removing a package
```bash
npm uninstall <package-name>
# Lockfile auto-updates
git add package.json package-lock.json
```

### Updating a package
```bash
npm update <package-name>
npm install  # Regenerate lockfile
git add package.json package-lock.json
```

### Manual version edit in package.json
```bash
# After editing package.json manually
npm install  # CRITICAL: Regenerate lockfile
git add package.json package-lock.json
```

## Danger Signs - Never Commit These

❌ Committing `package.json` without lockfile changes
❌ Manually editing `package-lock.json` (let npm/pnpm handle it)
❌ Committing after partial install (use `npm install` to complete)
❌ Pulling changes with out-of-sync lockfiles (always run `npm install` after pull)

## Vercel-Specific Notes

Vercel uses `npm ci` which fails for out-of-sync lockfiles:

**Error:** "npm ci can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync."

**Solution:** Always commit lockfile with `package.json`. NEVER modify `dependencies` or `devDependencies` in `package.json` without ensuring lockfile is also committed.

## Verification Commands

Before any commit of `package.json`:

```bash
# Quick lockfile sync check
npm ci  # Should complete without errors

# If this fails, run:
npm install

# Verify build still works
npm run build
```

## Package Manager Variations

### npm (most common)
- Lockfile: `package-lock.json`
- Sync command: `npm install`
- Check: `npm ci` (should not fail)

### pnpm
- Lockfile: `pnpm-lock.yaml`
- Sync command: `pnpm install`
- Check: `pnpm install --frozen-lockfile`

### yarn
- Lockfile: `yarn.lock`
- Sync command: `yarn install`
- Check: `yarn install --frozen-lockfile`

## Summary

**Rule:** Any `package.json` change **MUST** include lockfile changes.

**When in doubt:** Run `npm install` (or `pnpm install`) before committing.

**Verification:** `npm ci` should never fail before pushing to remote.