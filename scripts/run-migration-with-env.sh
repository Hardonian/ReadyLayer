#!/bin/bash
# Run Installation Token Migration
# 
# Usage:
#   ./scripts/run-migration-with-env.sh
#
# Requires:
#   - DATABASE_URL environment variable (or set below)
#   - READY_LAYER_KMS_KEY, READY_LAYER_MASTER_KEY, or READY_LAYER_KEYS environment variable

set -e

echo "🔐 Installation Token Migration Script"
echo "========================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set DATABASE_URL before running this script:"
    echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo "   Database: $(echo $DATABASE_URL | sed -E 's|postgresql://[^@]+@([^/]+)/.*|\1|')"
echo ""

# Check if encryption key is set
if [ -z "$READY_LAYER_KMS_KEY" ] && [ -z "$READY_LAYER_MASTER_KEY" ] && [ -z "$READY_LAYER_KEYS" ]; then
    echo "❌ ERROR: Encryption key not configured"
    echo ""
    echo "Please set one of:"
    echo "  export READY_LAYER_KMS_KEY='your-base64-key'"
    echo "  export READY_LAYER_MASTER_KEY='your-base64-key'"
    echo "  export READY_LAYER_KEYS='v1:key1;v2:key2'"
    echo ""
    echo "Generate a key with:"
    echo "  node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    exit 1
fi

echo "✅ Encryption key is configured"
if [ -n "$READY_LAYER_KEYS" ]; then
    echo "   Using: READY_LAYER_KEYS (multiple keys)"
elif [ -n "$READY_LAYER_KMS_KEY" ]; then
    echo "   Using: READY_LAYER_KMS_KEY"
else
    echo "   Using: READY_LAYER_MASTER_KEY"
fi
echo ""

echo "🚀 Starting migration..."
echo ""

# Run the migration script
npm run secrets:migrate-tokens

echo ""
echo "✅ Migration completed!"
