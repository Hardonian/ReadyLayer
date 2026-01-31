#!/bin/bash
#
# Deploy worker to Fly.io
# Usage: ./deploy-fly.sh [environment]
# Example: ./deploy-fly.sh production

set -e

ENVIRONMENT="${1:-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "🚀 Deploying worker to Fly.io (${ENVIRONMENT})"
echo "==============================================="

# Check prerequisites
if ! command -v fly &> /dev/null; then
    echo "❌ Error: fly CLI not installed"
    echo "   Install from: https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Verify we're in the right directory
if [ ! -f "${PROJECT_ROOT}/services/worker-py/fly.toml" ]; then
    echo "❌ Error: fly.toml not found"
    exit 1
fi

cd "${PROJECT_ROOT}/services/worker-py"

# Check if app exists
if ! fly apps list | grep -q "readylayer-worker-py"; then
    echo ""
    echo "🆕 Creating new Fly.io app..."
    fly launch --config fly.toml --name readylayer-worker-py --no-deploy
fi

# Set required secrets
echo ""
echo "🔐 Checking secrets..."
if ! fly secrets list | grep -q "DATABASE_URL"; then
    echo "   ⚠️  DATABASE_URL secret not set!"
    echo "      Set it with: fly secrets set DATABASE_URL='postgresql://...'"
    exit 1
else
    echo "   ✅ DATABASE_URL is set"
fi

# Deploy
echo ""
echo "🔨 Building and deploying..."
fly deploy --config fly.toml

# Check health
echo ""
echo "🏥 Checking worker health..."
sleep 5

# Get app URL and check health
APP_URL=$(fly status --json 2>/dev/null | grep -o '"Hostname": "[^"]*"' | cut -d'"' -f4 || true)
if [ -n "$APP_URL" ]; then
    if curl -sf "https://${APP_URL}/health" > /dev/null 2>&1; then
        echo "   ✅ Worker is healthy"
    else
        echo "   ⚠️  Worker health check failed (may still be starting)"
    fi
else
    echo "   ℹ️  Check status manually: fly status"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "  - View logs: fly logs"
echo "  - Check status: fly status"
echo "  - SSH into machine: fly ssh console"
echo "  - Run smoke test: cd ${PROJECT_ROOT} && pnpm jobs:smoke"
