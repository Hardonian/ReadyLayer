#!/bin/bash
# Run Migration Using GitHub Secrets
# This script is designed to run in GitHub Actions or CI/CD environments
# where secrets are available as environment variables

set -e

echo "🚀 ReadyLayer Migration Runner"
echo "=============================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "In GitHub Actions, ensure DATABASE_URL is set as a secret:"
    echo "  Settings → Secrets and variables → Actions → New repository secret"
    echo ""
    echo "Or set it manually:"
    echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo "   Database: $(echo $DATABASE_URL | sed -E 's|postgresql://[^@]+@([^/]+)/.*|\1|')"
echo ""

# Check if we're in a CI environment
if [ -n "$CI" ]; then
    echo "🔧 Running in CI environment"
    echo ""
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci
fi

# Generate Prisma Client
echo "🔨 Generating Prisma Client..."
npm run prisma:generate

# Run migration
echo ""
echo "📦 Running migration..."
npm run migrate:run

# Verify migration
echo ""
echo "🔍 Verifying migration..."
npm run migrate:verify

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "Next steps:"
echo "1. Test tenant isolation: npm run test:tenant-isolation"
echo "2. Test billing enforcement: npm run test:billing"
echo "3. Deploy to Vercel"
