#!/bin/bash
# Bug Debug Helper Script
#
# Usage: ./scripts/bug-debug.sh <bug-id> [test-file]
# Example: ./scripts/bug-debug.sh 123
# Example: ./scripts/bug-debug.sh 123 e2e/auth.spec.ts
#
# This script runs tests with DEBUG_MODE enabled to capture detailed logs.
# Use this AFTER adding debug logging to your code.

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOGS_DIR="logs/bug-triage"

# Functions
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  🔍 Bug Debug Session${NC}"
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
    echo "Usage: $0 <bug-id> [test-file]"
    echo ""
    echo "Examples:"
    echo "  $0 123                           # Run all tests with debug mode"
    echo "  $0 123 e2e/auth.spec.ts         # Run specific E2E test"
    echo "  $0 123 services/policy-engine   # Run specific unit tests"
    exit 1
fi

BUG_ID=$1
TEST_FILE=${2:-""}
LOG_PREFIX="$LOGS_DIR/bug-$BUG_ID"
DEBUG_LOG="${LOG_PREFIX}-debug-$(date +%Y%m%d-%H%M%S).log"

# Print header
print_header
echo ""
print_info "Bug ID: $BUG_ID"
if [ -n "$TEST_FILE" ]; then
    print_info "Test File: $TEST_FILE"
else
    print_info "Running all tests"
fi
print_info "Debug log: $DEBUG_LOG"
echo ""

# Ensure logs directory exists
mkdir -p "$LOGS_DIR"

# Step 1: Enable debug mode
print_step "Enabling DEBUG_MODE..."
export DEBUG_MODE=true
export LOG_LEVEL=debug

# Step 2: Run tests with debug logging
print_step "Running tests with detailed logging..."
echo ""
print_warning "This will produce VERBOSE output. Review carefully."
echo ""

if [ -n "$TEST_FILE" ]; then
    # Run specific test
    if [[ "$TEST_FILE" == e2e/* ]] || [[ "$TEST_FILE" == *.spec.ts ]]; then
        # E2E test
        print_info "Running E2E test: $TEST_FILE"
        DEBUG_MODE=true npx playwright test "$TEST_FILE" --reporter=line 2>&1 | tee "$DEBUG_LOG"
    else
        # Unit test
        print_info "Running unit test: $TEST_FILE"
        DEBUG_MODE=true npm test -- "$TEST_FILE" --reporter=verbose --run 2>&1 | tee "$DEBUG_LOG"
    fi
else
    # Run all tests
    print_info "Running all unit tests..."
    DEBUG_MODE=true npm test -- --reporter=verbose --run 2>&1 | tee "$DEBUG_LOG"
fi

echo ""
print_step "Debug log saved to: $DEBUG_LOG"
echo ""

# Step 3: Generate debug summary
print_step "Generating debug summary..."

DEBUG_SUMMARY="${LOG_PREFIX}-debug-summary.md"

cat > "$DEBUG_SUMMARY" << EOF
# Debug Session Summary - Bug #$BUG_ID

**Timestamp:** $(date +"%Y-%m-%d %H:%M:%S")
**Test File:** ${TEST_FILE:-"All tests"}
**Debug Log:** $DEBUG_LOG

## Debug Output Preview

### Last 50 Lines
\`\`\`
$(tail -n 50 "$DEBUG_LOG")
\`\`\`

## Analysis Checklist

- [ ] Identify where the error occurs (file:line)
- [ ] Check input values at error point
- [ ] Verify data transformations
- [ ] Check for null/undefined values
- [ ] Verify async/await handling
- [ ] Check database queries
- [ ] Verify API responses
- [ ] Check security filters (tenant isolation, secret redaction)

## Search Commands

Find specific patterns in the debug log:

\`\`\`bash
# Find errors
grep -i "error" "$DEBUG_LOG"

# Find warnings
grep -i "warn" "$DEBUG_LOG"

# Find specific function calls
grep "functionName" "$DEBUG_LOG"

# Find database queries
grep "prisma" "$DEBUG_LOG"

# Find API calls
grep "fetch\|axios\|api" "$DEBUG_LOG"
\`\`\`

## Next Steps

1. **Analyze the debug log:**
   \`cat $DEBUG_LOG | less\`

2. **Share with Claude:**
   - Paste relevant sections of the debug log
   - Highlight unexpected values or behaviors
   - Ask Claude to identify the root cause

3. **Add more logging if needed:**
   - Increase detail around the suspected area
   - Re-run this script to capture new logs

4. **Once root cause is found:**
   - Write a reproduction test
   - Implement the fix
   - Run \`./scripts/bug-verify.sh $BUG_ID\` to verify

EOF

print_info "Debug summary saved to $DEBUG_SUMMARY"
echo ""

# Step 4: Print next steps
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ Debug Session Complete${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
print_step "Review the debug output:"
echo ""
echo "1. Full debug log:"
echo -e "   ${BLUE}cat $DEBUG_LOG | less${NC}"
echo ""
echo "2. Summary:"
echo -e "   ${BLUE}cat $DEBUG_SUMMARY${NC}"
echo ""
echo "3. Find errors:"
echo -e "   ${BLUE}grep -i 'error' $DEBUG_LOG${NC}"
echo ""
echo "4. Share with Claude and iterate"
echo ""
print_info "Keep debugging! 🔍"
