#!/bin/bash
# Run ReadyLayer Migration
# This script executes the migration SQL in the database

set -e

echo "🚀 Running ReadyLayer migration..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL before running this script"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ ERROR: psql is not installed"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

# Run migration
echo "📦 Executing migration SQL..."
psql "$DATABASE_URL" -f prisma/migrations/20241230000000_init_readylayer/migration.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Verify tables were created: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
    echo "2. Verify RLS is enabled: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
    echo "3. Test tenant isolation with sample queries"
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi
