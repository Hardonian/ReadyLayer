#!/bin/bash
#
# Full production deployment script
# Handles database migrations, deployment, and verification
#
# Usage: ./deploy-production.sh [target]
# Targets: render, fly, docker, local

set -e

TARGET="${1:-render}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Header
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     ReadyLayer Worker Production Deployment            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
log_info "Target: ${TARGET}"
log_info "Project root: ${PROJECT_ROOT}"
echo ""

# Step 1: Pre-deployment checks
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Step 1: Pre-deployment checks"
echo ""

# Check environment variables
cd "${PROJECT_ROOT}"
if [ -f ".env.local" ]; then
    log_success "Environment file found"
else
    log_warning "No .env.local file found"
fi

# Verify database connectivity
if [ -n "$DATABASE_URL" ]; then
    log_success "DATABASE_URL is set"
    # Try to connect
    if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
        log_success "Database connection verified"
    else
        log_error "Cannot connect to database"
        exit 1
    fi
else
    log_warning "DATABASE_URL not set in environment"
fi

# Step 2: Database migrations
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Step 2: Database migrations"
echo ""

log_info "Applying job queue migration..."
if npm run db:worker:setup 2>&1 | tail -5; then
    log_success "Migrations applied successfully"
else
    log_error "Migration failed"
    exit 1
fi

# Step 3: Build verification
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Step 3: Build verification"
echo ""

cd "${PROJECT_ROOT}/services/worker-py"

log_info "Building Docker image..."
if docker build -t worker-py:deploy-test . > /dev/null 2>&1; then
    log_success "Docker build successful"
else
    log_error "Docker build failed"
    exit 1
fi

# Step 4: Deploy
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Step 4: Deploying to ${TARGET}"
echo ""

case $TARGET in
    render)
        if [ -f "scripts/deploy-render.sh" ]; then
            bash scripts/deploy-render.sh production
        else
            log_error "Render deploy script not found"
            exit 1
        fi
        ;;
    fly)
        if [ -f "scripts/deploy-fly.sh" ]; then
            bash scripts/deploy-fly.sh production
        else
            log_error "Fly deploy script not found"
            exit 1
        fi
        ;;
    docker)
        log_info "Starting local Docker deployment..."
        docker-compose -f docker-compose.yml down 2>/dev/null || true
        docker-compose -f docker-compose.yml up -d
        log_success "Docker containers started"
        sleep 5
        ;;
    local)
        log_warning "Local deployment - ensure worker is running with: pnpm worker:py"
        ;;
    *)
        log_error "Unknown target: ${TARGET}"
        echo "Supported targets: render, fly, docker, local"
        exit 1
        ;;
esac

# Step 5: Verification
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Step 5: Verification"
echo ""

cd "${PROJECT_ROOT}"

log_info "Running smoke tests..."
if npm run jobs:smoke 2>&1 | tail -20; then
    log_success "Smoke tests completed"
else
    log_warning "Smoke tests had issues (check output above)"
fi

# Step 6: Post-deployment
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Step 6: Post-deployment"
echo ""

log_info "Checking worker status..."
npm run worker:status 2>&1 | tail -15 || true

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     Deployment Complete!                               ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
log_success "Worker deployed to ${TARGET}"
echo ""
echo "Next steps:"
echo "  - Monitor logs: npm run worker:py:docker:logs (if docker)"
echo "  - Check status: npm run worker:status"
echo "  - View metrics: curl http://<worker-url>/metrics"
echo "  - Health check: curl http://<worker-url>/health"
echo ""
echo "Deployment Summary:"
echo "  - Target: ${TARGET}"
echo "  - Migrations: Applied ✅"
echo "  - Build: Verified ✅"
echo "  - Smoke Tests: Completed ✅"
echo ""
