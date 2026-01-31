#!/bin/bash
#
# Deploy worker to Render.com
# Usage: ./deploy-render.sh [environment]
# Example: ./deploy-render.sh production

set -e

ENVIRONMENT="${1:-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "🚀 Deploying worker to Render.com (${ENVIRONMENT})"
echo "=================================================="

# Check prerequisites
if ! command -v render &> /dev/null; then
    echo "❌ Error: render CLI not installed"
    echo "   Install from: https://render.com/docs/cli"
    exit 1
fi

# Verify we're in the right directory
if [ ! -f "${PROJECT_ROOT}/services/worker-py/render.yaml" ]; then
    echo "❌ Error: render.yaml not found"
    exit 1
fi

cd "${PROJECT_ROOT}/services/worker-py"

# Set environment variables on Render
echo ""
echo "📋 Checking environment variables..."
REQUIRED_VARS=(
    "DATABASE_URL"
    "WORKER_ID"
)

for var in "${REQUIRED_VARS[@]}"; do
    value=$(render env get "${var}" --service readylayer-worker-py 2>/dev/null || true)
    if [ -z "$value" ]; then
        echo "   ⚠️  ${var} not set"
    else
        echo "   ✅ ${var} is set"
    fi
done

# Deploy using render CLI
echo ""
echo "🔨 Building and deploying..."
render deploy --service readylayer-worker-py

# Wait for deployment to complete
echo ""
echo "⏳ Waiting for deployment to be ready..."
sleep 10

# Check health
echo ""
echo "🏥 Checking worker health..."
HEALTH_URL=$(render services | grep readylayer-worker-py | awk '{print $4}')
if [ -n "$HEALTH_URL" ]; then
    if curl -sf "${HEALTH_URL}/health" > /dev/null 2>&1; then
        echo "   ✅ Worker is healthy"
    else
        echo "   ⚠️  Worker health check failed (may still be starting)"
    fi
else
    echo "   ⚠️  Could not determine health check URL"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "  - View logs: render logs --service readylayer-worker-py"
echo "  - Check status: render services"
echo "  - Run smoke test: cd ${PROJECT_ROOT} && pnpm jobs:smoke"
