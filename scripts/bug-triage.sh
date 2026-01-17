#!/bin/bash
# Bug Triage Helper Script
#
# Usage: ./scripts/bug-triage.sh <bug-id> [description]
# Example: ./scripts/bug-triage.sh 123 "fix auth token expiry"
#
# This script automates the bug triage workflow following the Ralph Loop:
# 1. READ - Capture failing test output
# 2. PINPOINT - Prepare logs for analysis
# 3. WRITE TEST - (Manual step with Claude)
# 4. FIX - (Manual step with Claude)
# 5. RUN - Verify fix
# 6. DOCUMENT - Update progress tracking

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOGS_DIR="logs/bug-triage"
PROGRESS_FILE="PROGRESS.md"

# Functions
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  🐛 ReadyLayer Bug Triage Workflow${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_step() {
    echo -e "${GREEN}➜${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check arguments
if [ $# -lt 1 ]; then
    print_error "Bug ID is required"
    echo ""
    echo "Usage: $0 <bug-id> [description]"
    echo ""
    echo "Examples:"
    echo "  $0 123 'fix auth token expiry'"
    echo "  $0 456 'handle null addresses in profile save'"
    exit 1
fi

BUG_ID=$1
DESCRIPTION=${2:-"bug-fix-$BUG_ID"}
BRANCH_NAME="bug/fix-$BUG_ID"
LOG_PREFIX="$LOGS_DIR/bug-$BUG_ID"

# Print header
print_header
echo ""
print_info "Bug ID: $BUG_ID"
print_info "Description: $DESCRIPTION"
print_info "Branch: $BRANCH_NAME"
echo ""

# Step 0: Create logs directory
print_step "Creating logs directory..."
mkdir -p "$LOGS_DIR"

# Step 1: Create and checkout branch
print_step "Creating branch: $BRANCH_NAME"
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    print_warning "Branch already exists. Checking out existing branch."
    git checkout "$BRANCH_NAME"
else
    git checkout -b "$BRANCH_NAME"
    print_info "Created new branch: $BRANCH_NAME"
fi

# Step 2: Run tests and capture output
print_step "Running full test suite and capturing output..."
echo ""
print_info "This may take a few minutes..."

# Run unit tests
print_info "Running unit tests (Vitest)..."
if npm test -- --run > "${LOG_PREFIX}-unit-tests.log" 2>&1; then
    print_info "✓ Unit tests passed"
else
    print_warning "⚠ Unit tests failed (this is expected for bug triage)"
fi

# Run E2E tests
print_info "Running E2E tests (Playwright)..."
if npm run test:e2e > "${LOG_PREFIX}-e2e-tests.log" 2>&1; then
    print_info "✓ E2E tests passed"
else
    print_warning "⚠ E2E tests failed (this is expected for bug triage)"
fi

# Run type check
print_info "Running type check..."
if npm run type-check > "${LOG_PREFIX}-type-check.log" 2>&1; then
    print_info "✓ Type check passed"
else
    print_warning "⚠ Type check failed"
fi

# Run linter
print_info "Running linter..."
if npm run lint > "${LOG_PREFIX}-lint.log" 2>&1; then
    print_info "✓ Linter passed"
else
    print_warning "⚠ Linter failed"
fi

echo ""
print_step "Test logs saved to:"
echo "  - Unit tests: ${LOG_PREFIX}-unit-tests.log"
echo "  - E2E tests: ${LOG_PREFIX}-e2e-tests.log"
echo "  - Type check: ${LOG_PREFIX}-type-check.log"
echo "  - Linter: ${LOG_PREFIX}-lint.log"
echo ""

# Step 3: Create initial progress entry
print_step "Creating progress tracking entry..."

# Create PROGRESS.md if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
    cat > "$PROGRESS_FILE" << EOF
# ReadyLayer Development Progress

This file tracks bug fixes, features, and improvements.

---

EOF
fi

# Add bug entry
cat >> "$PROGRESS_FILE" << EOF
## Bug #$BUG_ID - $DESCRIPTION

**Status:** 🔍 Investigating
**Branch:** \`$BRANCH_NAME\`
**Started:** $(date +"%Y-%m-%d %H:%M:%S")

### Investigation Notes
- Initial test run captured in \`${LOG_PREFIX}-*.log\`
- Logs ready for Claude analysis

### Next Steps
1. Analyze logs with Claude to identify root cause
2. Add detailed logging to pinpoint issue
3. Write reproduction test
4. Implement fix
5. Verify all tests pass
6. Update this entry with resolution

---

EOF

print_info "Progress entry added to $PROGRESS_FILE"
echo ""

# Step 4: Generate summary
print_step "Generating summary for Claude..."

SUMMARY_FILE="${LOG_PREFIX}-summary.md"

cat > "$SUMMARY_FILE" << EOF
# Bug Triage Summary - Bug #$BUG_ID

**Description:** $DESCRIPTION
**Branch:** $BRANCH_NAME
**Timestamp:** $(date +"%Y-%m-%d %H:%M:%S")

## Test Results Summary

### Unit Tests
$(tail -n 20 "${LOG_PREFIX}-unit-tests.log" 2>/dev/null || echo "No output available")

### E2E Tests
$(tail -n 20 "${LOG_PREFIX}-e2e-tests.log" 2>/dev/null || echo "No output available")

### Type Check
$(tail -n 10 "${LOG_PREFIX}-type-check.log" 2>/dev/null || echo "No output available")

### Linter
$(tail -n 10 "${LOG_PREFIX}-lint.log" 2>/dev/null || echo "No output available")

## Next Steps

1. **Review Logs:** Read the full logs in \`${LOG_PREFIX}-*.log\`
2. **Share with Claude:**
   - Paste the failing test output
   - Describe the expected vs actual behavior
   - Ask Claude to suggest logging points
3. **Add Logging:** Based on Claude's suggestions, add detailed logging
4. **Re-run Tests:** Run \`./scripts/bug-debug.sh $BUG_ID\` to capture detailed logs
5. **Iterate:** Share debug logs with Claude until root cause is identified

## Files to Check

Run these commands to explore potentially related files:
\`\`\`bash
# Find recent changes
git log --oneline --decorate -10

# Find files related to the bug (replace KEYWORD with relevant term)
rg "KEYWORD" --type ts --type tsx

# Check for similar issues in tests
rg "test.*KEYWORD" e2e/ --type ts
\`\`\`

## Environment Info

- Node Version: $(node -v)
- npm Version: $(npm -v)
- Git Branch: $(git branch --show-current)
- Git Status: $(git status --short | wc -l) files changed
EOF

print_info "Summary saved to $SUMMARY_FILE"
echo ""

# Step 5: Print next steps
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ Bug Triage Initialized${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
print_step "Next Steps:"
echo ""
echo "1. Review the summary:"
echo -e "   ${BLUE}cat $SUMMARY_FILE${NC}"
echo ""
echo "2. Share failing test output with Claude:"
echo -e "   ${BLUE}cat ${LOG_PREFIX}-unit-tests.log${NC}  # or e2e-tests.log"
echo ""
echo "3. Add debug logging based on Claude's suggestions"
echo ""
echo "4. Run debug session:"
echo -e "   ${BLUE}./scripts/bug-debug.sh $BUG_ID${NC}"
echo ""
echo "5. Iterate with Claude until root cause is found"
echo ""
echo "6. When fixed, run verification:"
echo -e "   ${BLUE}./scripts/bug-verify.sh $BUG_ID${NC}"
echo ""
echo "7. Commit and push:"
echo -e "   ${BLUE}git add .${NC}"
echo -e "   ${BLUE}git commit -m \"fix: $DESCRIPTION (closes #$BUG_ID)\"${NC}"
echo -e "   ${BLUE}git push -u origin $BRANCH_NAME${NC}"
echo ""
print_info "Happy debugging! 🐛🔍"
