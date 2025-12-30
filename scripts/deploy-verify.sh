#!/bin/bash
# Post-Deployment Verification Script
# Run this after deploying to Vercel to verify everything works

set -e

echo "🚀 ReadyLayer Post-Deployment Verification"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if API_BASE_URL is set
if [ -z "$API_BASE_URL" ]; then
    echo -e "${YELLOW}⚠️  API_BASE_URL not set, using default: https://readylayer.vercel.app${NC}"
    API_BASE_URL="https://readylayer.vercel.app"
fi

BASE_URL="${API_BASE_URL}"

echo "Testing against: ${BASE_URL}"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/health")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed (${HEALTH_RESPONSE})${NC}"
else
    echo -e "${RED}❌ Health check failed (${HEALTH_RESPONSE})${NC}"
    exit 1
fi

# Test 2: Ready Check
echo "2️⃣  Testing ready endpoint..."
READY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/ready")
if [ "$READY_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Ready check passed (${READY_RESPONSE})${NC}"
else
    echo -e "${RED}❌ Ready check failed (${READY_RESPONSE})${NC}"
    exit 1
fi

# Test 3: API Version Check
echo "3️⃣  Testing API version endpoint..."
API_RESPONSE=$(curl -s "${BASE_URL}/api/v1/repos" -H "Authorization: Bearer invalid" 2>&1)
if echo "$API_RESPONSE" | grep -q "401\|403\|Unauthorized"; then
    echo -e "${GREEN}✅ API endpoint exists and requires auth (expected)${NC}"
else
    echo -e "${YELLOW}⚠️  API response unexpected: ${API_RESPONSE:0:100}${NC}"
fi

# Test 4: Frontend Check
echo "4️⃣  Testing frontend..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/")
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Frontend loads (${FRONTEND_RESPONSE})${NC}"
else
    echo -e "${RED}❌ Frontend failed (${FRONTEND_RESPONSE})${NC}"
    exit 1
fi

# Test 5: Dashboard Check
echo "5️⃣  Testing dashboard..."
DASHBOARD_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/dashboard")
if [ "$DASHBOARD_RESPONSE" = "200" ] || [ "$DASHBOARD_RESPONSE" = "307" ] || [ "$DASHBOARD_RESPONSE" = "302" ]; then
    echo -e "${GREEN}✅ Dashboard accessible (${DASHBOARD_RESPONSE})${NC}"
else
    echo -e "${YELLOW}⚠️  Dashboard response: ${DASHBOARD_RESPONSE} (may redirect to auth)${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Basic verification complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Test authentication flow (sign up/login)"
echo "2. Create an organization"
echo "3. Connect a repository"
echo "4. Test tenant isolation (create 2 orgs, verify isolation)"
echo "5. Test billing enforcement (try exceeding limits)"
echo "6. Check Vercel logs for errors"
echo "7. Monitor Supabase dashboard for RLS policy violations"
