#!/bin/bash
# Script to migrate Next.js route handlers to async params (Next.js 15+)

set -e

echo "Migrating route handlers to async params..."

# List of files to update
files=(
  "app/api/v1/api-keys/[keyId]/route.ts"
  "app/api/v1/config/repos/[repoId]/route.ts"
  "app/api/v1/cultural-artifacts/certificate/[reviewId]/route.ts"
  "app/api/v1/cultural-artifacts/readiness/[repositoryId]/route.ts"
  "app/api/v1/cultural-artifacts/risk-index/[organizationId]/route.ts"
  "app/api/v1/ethical-ai/explain/[reviewId]/route.ts"
  "app/api/v1/evidence/[bundleId]/export/route.ts"
  "app/api/v1/evidence/[bundleId]/route.ts"
  "app/api/v1/policies/[packId]/route.ts"
  "app/api/v1/policies/[packId]/rules/[ruleId]/route.ts"
  "app/api/v1/policies/[packId]/rules/route.ts"
  "app/api/v1/policies/templates/[templateId]/apply/route.ts"
  "app/api/v1/repos/[repoId]/test-connection/route.ts"
  "app/api/v1/reviews/[reviewId]/route.ts"
  "app/api/v1/waivers/[waiverId]/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."

    # Step 1: Update type signatures to Promise<{ ... }>
    sed -i 's/{ params }: { params: {/{ params }: { params: Promise<{/g' "$file"

    # Step 2: For single param routes, add await and destructure
    # This handles cases like { keyId: string }
    if grep -q "Promise<{ [a-zA-Z]*: string }>" "$file"; then
      # Extract the param name
      param=$(grep -o "Promise<{ [a-zA-Z]*:" "$file" | head -1 | sed 's/Promise<{ //' | sed 's/://')

      # Add await destructuring after function signature
      sed -i "/{ params }: { params: Promise/a\  const { $param } = await params;" "$file"

      # Replace params.paramName with paramName
      sed -i "s/params\.$param/$param/g" "$file"
    fi

    echo "✓ Updated $file"
  else
    echo "⚠ File not found: $file"
  fi
done

echo ""
echo "Migration complete!"
echo "Please review the changes and test the build."
