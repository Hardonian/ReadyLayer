#!/bin/bash
# Security Check Script
#
# Usage: ./scripts/security-check.sh [file-or-directory]
# Example: ./scripts/security-check.sh services/user-service.ts
# Example: ./scripts/security-check.sh app/api/
#
# Validates code for common security issues before committing.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  🔒 ReadyLayer Security Check${NC}"
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

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_header
echo ""

TARGET=${1:-.}

print_info "Scanning: $TARGET"
echo ""

# Step 1: Check for secrets in code
print_step "Checking for exposed secrets..."
if grep -rE "(AKIA[0-9A-Z]{16}|sk-[a-zA-Z0-9]{32,}|-----BEGIN.*PRIVATE KEY-----)" \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
    "$TARGET" 2>/dev/null; then
    print_error "Exposed secrets found in code!"
    echo ""
    print_warning "Secrets must be stored in environment variables (.env)"
    echo ""
    exit 1
else
    print_success "No exposed secrets found"
fi

# Step 2: Check for hardcoded passwords
print_step "Checking for hardcoded passwords..."
if grep -rE "(password|passwd|pwd)\s*[:=]\s*['\"][^'\"]+['\"]" \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
    "$TARGET" 2>/dev/null | grep -v "password:" | grep -v "type:" | grep -v "placeholder"; then
    print_warning "Potential hardcoded passwords found"
    echo ""
    print_info "Review the matches above to ensure they're not real passwords"
    echo ""
else
    print_success "No hardcoded passwords found"
fi

# Step 3: Check for SQL injection risks (raw queries)
print_step "Checking for SQL injection risks..."
if grep -rE "(\\\$queryRaw|\\\$executeRaw|queryRawUnsafe|executeRawUnsafe)" \
    --include="*.ts" --include="*.tsx" \
    "$TARGET" 2>/dev/null; then
    print_warning "Raw SQL queries found - verify they're necessary"
    echo ""
    print_info "Prefer Prisma ORM queries over raw SQL"
    echo ""
else
    print_success "No raw SQL queries found"
fi

# Step 4: Check for XSS risks
print_step "Checking for XSS vulnerabilities..."
if grep -rE "dangerouslySetInnerHTML" \
    --include="*.tsx" --include="*.jsx" \
    "$TARGET" 2>/dev/null; then
    print_warning "dangerouslySetInnerHTML usage found"
    echo ""
    print_info "Ensure HTML is sanitized with DOMPurify before rendering"
    echo ""
else
    print_success "No dangerouslySetInnerHTML usage found"
fi

# Step 5: Check for missing tenant isolation
print_step "Checking for tenant isolation..."
if grep -rE "prisma\.\w+\.(findMany|findFirst|findUnique|count)" \
    --include="*.ts" \
    "$TARGET" 2>/dev/null | grep -v "organizationId" | head -5; then
    print_warning "Potential missing organizationId filters found"
    echo ""
    print_info "Review Prisma queries to ensure tenant isolation"
    print_info "All queries should filter by organizationId"
    echo ""
else
    print_success "Tenant isolation checks passed"
fi

# Step 6: Check for unsafe logging
print_step "Checking for unsafe logging..."
if grep -rE "console\.(log|error|warn)\([^)]*(?:password|token|secret|apiKey)" \
    --include="*.ts" --include="*.tsx" \
    "$TARGET" 2>/dev/null; then
    print_warning "Potentially unsafe logging found"
    echo ""
    print_info "Use redactSecrets() before logging sensitive data"
    echo ""
else
    print_success "No unsafe logging found"
fi

# Step 7: Check for .env files in git
print_step "Checking for committed .env files..."
if git ls-files | grep -E "\.env$" | grep -v "\.env\.example" 2>/dev/null; then
    print_error ".env files should not be committed!"
    echo ""
    print_warning "Add .env to .gitignore and remove from git:"
    echo "  git rm --cached .env"
    echo ""
    exit 1
else
    print_success "No .env files in git"
fi

# Step 8: Run npm audit
print_step "Running npm audit for vulnerable dependencies..."
if npm audit --audit-level=moderate 2>&1 | grep -E "(found [1-9]|vulnerabilities)"; then
    print_warning "Vulnerable dependencies found"
    echo ""
    print_info "Run 'npm audit fix' to update dependencies"
    echo ""
else
    print_success "No vulnerable dependencies found"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ Security Check Complete${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
print_info "Review any warnings above before committing."
echo ""
