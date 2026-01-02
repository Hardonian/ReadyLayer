#!/bin/bash
# Build script with cleanup handling

set -e

# Run prebuild cleanup
node scripts/fix-build-cleanup.js || true
node scripts/ensure-server-pages-dir.js || true

# Run Next.js build
next build || BUILD_EXIT=$?

# Always run postbuild cleanup
node scripts/fix-build-cleanup.js || true

# Exit with build status
exit ${BUILD_EXIT:-0}
