#!/usr/bin/env node

/**
 * Asset Validation Script
 *
 * Validates that required visual assets exist and meet size thresholds.
 * Run this in CI to ensure assets are present before deployment.
 *
 * Usage:
 *   node scripts/validate-assets.js
 *   ASSET_STRICT=1 node scripts/validate-assets.js  (fails on missing assets)
 *
 * Exit codes:
 *   0 - All assets valid or strict mode disabled
 *   1 - Missing required assets (strict mode only)
 */

const fs = require('fs')
const path = require('path')

// Configuration
const ASSETS_DIR = path.join(process.cwd(), 'public', 'assets', 'visuals')
const STRICT_MODE = process.env.ASSET_STRICT === '1'

// Asset manifest - must match README.md
const REQUIRED_ASSETS = [
  // Tier 1: Critical
  { name: 'hero-governance.webp', maxSize: 200 * 1024, required: false },
  { name: 'empty-repo.webp', maxSize: 60 * 1024, required: false },
  { name: 'empty-reviews.webp', maxSize: 60 * 1024, required: false },
  { name: 'empty-policies.webp', maxSize: 60 * 1024, required: false },
  { name: 'empty-runs.webp', maxSize: 60 * 1024, required: false },
  { name: 'error-general.webp', maxSize: 60 * 1024, required: false },
  { name: 'error-404.webp', maxSize: 60 * 1024, required: false },
  { name: 'error-auth.webp', maxSize: 60 * 1024, required: false },

  // Tier 2: Feature
  { name: 'value-policy.webp', maxSize: 30 * 1024, required: false },
  { name: 'value-composable.webp', maxSize: 30 * 1024, required: false },
  { name: 'value-docs.webp', maxSize: 30 * 1024, required: false },
  { name: 'value-git.webp', maxSize: 30 * 1024, required: false },
]

// Helper to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Main validation
function validateAssets() {
  console.log('🔍 Validating visual assets...\n')

  const results = {
    found: [],
    missing: [],
    oversized: [],
    totalSize: 0,
  }

  // Check if assets directory exists
  if (!fs.existsSync(ASSETS_DIR)) {
    console.log(`⚠️  Assets directory not found: ${ASSETS_DIR}`)
    console.log('   Create it with: mkdir -p public/assets/visuals')
    console.log('   See public/assets/visuals/README.md for generation instructions.\n')

    if (STRICT_MODE) {
      console.error('❌ STRICT MODE: Failing due to missing assets directory')
      process.exit(1)
    }
    return
  }

  // Validate each asset
  for (const asset of REQUIRED_ASSETS) {
    const assetPath = path.join(ASSETS_DIR, asset.name)

    if (fs.existsSync(assetPath)) {
      const stats = fs.statSync(assetPath)
      const size = stats.size
      results.totalSize += size

      if (size > asset.maxSize) {
        results.oversized.push({
          name: asset.name,
          size,
          maxSize: asset.maxSize,
        })
        console.log(`⚠️  ${asset.name} - ${formatBytes(size)} (exceeds ${formatBytes(asset.maxSize)})`)
      } else {
        results.found.push({
          name: asset.name,
          size,
        })
        console.log(`✅ ${asset.name} - ${formatBytes(size)}`)
      }
    } else {
      results.missing.push(asset.name)
      if (asset.required) {
        console.log(`❌ ${asset.name} - REQUIRED but missing`)
      } else {
        console.log(`⚠️  ${asset.name} - missing (optional)`)
      }
    }
  }

  // Summary
  console.log('\n📊 Summary:')
  console.log(`   Found: ${results.found.length}/${REQUIRED_ASSETS.length}`)
  console.log(`   Missing: ${results.missing.length}/${REQUIRED_ASSETS.length}`)
  console.log(`   Oversized: ${results.oversized.length}/${REQUIRED_ASSETS.length}`)
  console.log(`   Total size: ${formatBytes(results.totalSize)}`)

  // Feature flag guidance
  console.log('\n🎨 Feature Flags:')
  console.log('   Enable hero image: NEXT_PUBLIC_ENABLE_HERO_IMAGE=true')
  console.log('   Enable value illustrations: NEXT_PUBLIC_ENABLE_VALUE_ILLUSTRATIONS=true')
  console.log('   Enable empty state images: NEXT_PUBLIC_ENABLE_EMPTY_STATE_IMAGES=true')
  console.log('   Enable error state images: NEXT_PUBLIC_ENABLE_ERROR_STATE_IMAGES=true')
  console.log('   Strict validation: ASSET_STRICT=1')

  // Strict mode handling
  if (STRICT_MODE) {
    const hasIssues = results.missing.length > 0 || results.oversized.length > 0

    if (hasIssues) {
      console.error('\n❌ STRICT MODE: Validation failed')
      if (results.missing.length > 0) {
        console.error(`   Missing assets: ${results.missing.join(', ')}`)
      }
      if (results.oversized.length > 0) {
        console.error(`   Oversized assets: ${results.oversized.map(a => a.name).join(', ')}`)
      }
      process.exit(1)
    } else {
      console.log('\n✅ STRICT MODE: All assets valid')
    }
  } else {
    console.log('\n✅ Validation complete (non-strict mode)')
    console.log('   Run with ASSET_STRICT=1 to fail on missing assets')
  }
}

// Run validation
validateAssets()
