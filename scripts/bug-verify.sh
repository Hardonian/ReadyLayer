#!/bin/bash
# Bug Fix Verification Script
#
# Usage: ./scripts/bug-verify.sh <bug-id>
# Example: ./scripts/bug-verify.sh 123
#
# This script verifies that a bug fix is complete by running:
# - Full test suite
# - Type checking
# - Linting
# - Build verification

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
    echo -e "${BLUE}  ✓ Bug Fix Verification${NC}"
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

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Check arguments
if [ $# -lt 1 ]; then
    print_error "Bug ID is required"
    echo ""
    echo "Usage: $0 <bug-id>"
    echo ""
    echo "Example:"
    echo "  $0 123"
    exit 1
fi

BUG_ID=$1
LOG_PREFIX="$LOGS_DIR/bug-$BUG_ID"
VERIFY_LOG="${LOG_PREFIX}-verify-$(date +%Y%m%d-%H%M%S).log"

# Print header
print_header
echo ""
print_info "Bug ID: $BUG_ID"
print_info "Verification log: $VERIFY_LOG"
echo ""

# Create logs directory
mkdir -p "$LOGS_DIR"

# Verification steps
FAILED=0

# Step 1: Run unit tests
print_step "Running unit tests..."
if npm test -- --run >> "$VERIFY_LOG" 2>&1; then
    print_success "Unit tests passed"
else
    print_error "Unit tests failed"
    FAILED=1
fi

# Step 2: Run E2E tests
print_step "Running E2E tests..."
if npm run test:e2e >> "$VERIFY_LOG" 2>&1; then
    print_success "E2E tests passed"
else
    print_error "E2E tests failed"
    FAILED=1
fi

# Step 3: Type check
print_step "Running type check..."
if npm run type-check >> "$VERIFY_LOG" 2>&1; then
    print_success "Type check passed"
else
    print_error "Type check failed"
    FAILED=1
fi

# Step 4: Linting
print_step "Running linter..."
if npm run lint >> "$VERIFY_LOG" 2>&1; then
    print_success "Linter passed"
else
    print_error "Linter failed"
    FAILED=1
fi

# Step 5: Build verification
print_step "Running production build..."
if npm run build >> "$VERIFY_LOG" 2>&1; then
    print_success "Build succeeded"
else
    print_error "Build failed"
    FAILED=1
fi

echo ""

# Check results
if [ $FAILED -eq 0 ]; then
    # All passed
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✓ ALL CHECKS PASSED${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    print_success "Bug fix verified successfully!"
    echo ""

    # Update progress file
    print_step "Updating progress tracking..."

    # Get changed files
    CHANGED_FILES=$(git diff --name-only main...HEAD | tr '\n' ', ' | sed 's/,$//')

    # Update PROGRESS.md
    TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

    # Find the bug entry and update it
    if grep -q "Bug #$BUG_ID" "$PROGRESS_FILE"; then
        # Create updated section
        TEMP_FILE=$(mktemp)

        # Update status
        sed "s/\*\*Status:\*\* 🔍 Investigating/\*\*Status:\*\* ✅ Fixed/" "$PROGRESS_FILE" > "$TEMP_FILE"

        # Add resolution info if not present
        if ! grep -q "### Resolution" "$TEMP_FILE"; then
            # Insert resolution section before "---"
            awk -v bug="Bug #$BUG_ID" -v timestamp="$TIMESTAMP" -v files="$CHANGED_FILES" '
            /^## Bug #'"$BUG_ID"'/ { found=1 }
            found && /^---/ && !added {
                print "### Resolution"
                print "- **Fixed:** " timestamp
                print "- **Files Changed:** " files
                print "- **Verification:** All tests passed ✓"
                print ""
                added=1
            }
            { print }
            ' "$TEMP_FILE" > "$PROGRESS_FILE"
        else
            mv "$TEMP_FILE" "$PROGRESS_FILE"
        fi

        rm -f "$TEMP_FILE"
        print_success "Progress file updated"
    else
        print_warning "Bug entry not found in $PROGRESS_FILE"
    fi

    echo ""
    print_step "Next steps:"
    echo ""
    echo "1. Review changes:"
    echo -e "   ${BLUE}git diff${NC}"
    echo ""
    echo "2. Commit the fix:"
    echo -e "   ${BLUE}git add .${NC}"
    echo -e "   ${BLUE}git commit -m \"fix: description (closes #$BUG_ID)\"${NC}"
    echo ""
    echo "3. Push to remote:"
    echo -e "   ${BLUE}git push -u origin \$(git branch --show-current)${NC}"
    echo ""
    echo "4. Create pull request:"
    echo -e "   ${BLUE}gh pr create --title \"Fix: Bug #$BUG_ID\" --body \"$(cat <<EOF
## Summary
- Fixed bug #$BUG_ID

## Changes
$CHANGED_FILES

## Testing
- [x] Unit tests pass
- [x] E2E tests pass
- [x] Type check passes
- [x] Linter passes
- [x] Production build succeeds

## Verification Log
See: $VERIFY_LOG
EOF
)\"${NC}"
    echo ""
    print_info "Great work! 🎉"

else
    # Some checks failed
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  ✗ VERIFICATION FAILED${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    print_error "Some checks failed. Review the log:"
    echo -e "   ${BLUE}cat $VERIFY_LOG${NC}"
    echo ""
    print_info "Fix the issues and run this script again."
    exit 1
fi
