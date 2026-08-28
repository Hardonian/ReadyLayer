#!/usr/bin/env node
/**
 * Fix Node.js Globals in JS/MJS Files
 *
 * Automatically adds global declarations for Node.js built-in globals (process, URL, etc.)
 * in .mjs and .js files that use them but lack proper declarations.
 *
 * This resolves ESLint warnings: "X is not defined"
 *
 * Usage: node scripts/fix-node-globals.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Node.js globals that might need declarations in .mjs/.js files
const NODE_GLOBALS = [
  'process',
  'URL',
  'URLSearchParams',
  'global',
  'Buffer',
  '__filename',
  '__dirname',
  'console',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'queueMicrotask',
  'performance',
];

// File patterns to search
const FILE_PATTERNS = [
  '**/*.mjs',
  '**/*.js',
];

// Paths to skip
const SKIP_PATHS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
];

/**
 * Check if a path should be skipped
 */
function shouldSkip(filePath) {
  return SKIP_PATHS.some(skipPath => filePath.includes(skipPath));
}

/**
 * Check if a file uses any Node.js globals
 */
function usesNodeGlobals(content) {
  return NODE_GLOBALS.some(globalName => new RegExp(`\\b${globalName}\\b(?!['"])`).test(content));
}

/**
 * Check if a file has proper global declarations
 */
function hasGlobalDeclaration(content) {
  // Look for /* global ... */ comment
  const globalCommentPattern = /\/\*\s*global\s+([^*]+?)\s*\*\//g;
  if (globalCommentPattern.test(content)) return true;

  return false;
}

/**
 * Generate global declaration comment for a file
 */
function generateGlobalComment(fileGlobals) {
  const formattedGlobals = fileGlobals.join(', ');
  return `/* global ${formattedGlobals} */\n`;
}

/**
 * Find globals actually used in the file content
 */
function findUsedGlobals(content) {
  return NODE_GLOBALS.filter(globalName => {
    const pattern = new RegExp(`\\b${globalName}\\b(?!['"])`);
    return pattern.test(content);
  });
}

/**
 * Fix globals in a single file
 */
function fixFileGlobals(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Skip if file doesn't use Node globals
    if (!usesNodeGlobals(content)) {
      return { fixed: false, reason: 'No Node.js globals used' };
    }

    // Skip if file already has global declarations
    if (hasGlobalDeclaration(content)) {
      return { fixed: false, reason: 'Already has global declarations' };
    }

    // Find which globals are actually used
    const usedGlobals = findUsedGlobals(content);

    // Generate global declaration comment
    if (usedGlobals.length === 0) {
      return { fixed: false, reason: 'No globals detected' };
    }

    const globalComment = generateGlobalComment(usedGlobals);

    // Add global comment at the top of the file (after shebang if present)
    let newContent = content;
    const firstLineEnd = content.indexOf('\n');

    if (content.startsWith('#!')) {
      // Insert after shebang
      newContent = content.substring(0, firstLineEnd + 1) + globalComment + content.substring(firstLineEnd + 1);
    } else {
      // Insert at the very beginning
      newContent = globalComment + content;
    }

    fs.writeFileSync(filePath, newContent, 'utf-8');

    console.log(`✓ Fixed: ${filePath} (added: ${usedGlobals.join(', ')})`);
    return { fixed: true, reason: 'Added global declarations' };
  } catch (error) {
    console.error(`✗ Error: ${filePath} - ${error.message}`);
    return { fixed: false, reason: error.message };
  }
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Scanning for files that need Node.js global declarations...\n');

  const rootDir = path.resolve(__dirname, '..');

  // Find all .mjs and .js files
  const files = [];
  for (const pattern of FILE_PATTERNS) {
    const matches = glob.sync(pattern, { cwd: rootDir, absolute: false });
    files.push(...matches);
  }

  // Deduplicate files
  const uniqueFiles = [...new Set(files)];

  console.log(`📊 Found ${uniqueFiles.length} total files\n`);

  // Process each file
  const results = {
    fixed: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  for (const file of uniqueFiles) {
    // Check if file should be skipped
    if (shouldSkip(file)) {
      results.skipped++;
      continue;
    }

    const filePath = path.join(rootDir, file);
    const result = fixFileGlobals(filePath);
    const relativePath = path.relative(rootDir, filePath);

    if (result.fixed) {
      results.fixed++;
      results.details.push({
        file: relativePath,
        reason: result.reason,
      });
    } else {
      results.skipped++;
    }

    if (result.reason?.startsWith('Error:')) {
      results.errors++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 Summary:');
  console.log('  ✓ Fixed:', results.fixed);
  console.log('  ⏭ Skipped:', results.skipped);
  console.log('  ✗ Errors:', results.errors);
  console.log('  📊 Total:', results.details.length + results.skipped);
  console.log('='.repeat(60) + '\n');

  if (results.fixed > 0) {
    console.log('✅ Completed. Fixed files need to be committed:');
    results.details.forEach(detail => {
      console.log(`  - ${detail.file} (${detail.reason})`);
    });
  } else {
    console.log('✅ All files already have proper global declarations!');
  }

  // Exit with appropriate code
  process.exit(results.details.length > 0 ? 1 : 0);
}

// Run the script
main();