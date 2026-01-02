#!/usr/bin/env node
/**
 * Ensure .next/server/pages directory exists
 * 
 * Next.js needs this directory to move error pages from .next/export
 * This script runs during the build process to prevent ENOENT errors
 */

const fs = require('fs');
const path = require('path');

const serverPagesDir = path.join(process.cwd(), '.next', 'server', 'pages');
const serverDir = path.join(process.cwd(), '.next', 'server');

// Create directories if they don't exist
try {
  if (!fs.existsSync(serverDir)) {
    fs.mkdirSync(serverDir, { recursive: true });
  }
  if (!fs.existsSync(serverPagesDir)) {
    fs.mkdirSync(serverPagesDir, { recursive: true });
  }
} catch (error) {
  // Ignore errors - directories might be created by Next.js
  process.exit(0);
}
