/**
 * Next.js build plugin to ensure server/pages directory exists
 * 
 * This runs during the build process to prevent ENOENT errors
 * when Next.js tries to move error pages from .next/export to .next/server/pages
 */

const fs = require('fs');
const path = require('path');

class EnsureServerPagesPlugin {
  apply(compiler) {
    compiler.hooks.beforeCompile.tap('EnsureServerPagesPlugin', () => {
      const serverPagesDir = path.join(process.cwd(), '.next', 'server', 'pages');
      const serverDir = path.join(process.cwd(), '.next', 'server');
      
      try {
        if (!fs.existsSync(serverDir)) {
          fs.mkdirSync(serverDir, { recursive: true });
        }
        if (!fs.existsSync(serverPagesDir)) {
          fs.mkdirSync(serverPagesDir, { recursive: true });
        }
      } catch (err) {
        // Ignore - directory might be created by Next.js
      }
    });
    
    // Also ensure it exists after compilation
    compiler.hooks.afterCompile.tap('EnsureServerPagesPlugin', () => {
      const serverPagesDir = path.join(process.cwd(), '.next', 'server', 'pages');
      try {
        if (!fs.existsSync(serverPagesDir)) {
          fs.mkdirSync(serverPagesDir, { recursive: true });
        }
      } catch (err) {
        // Ignore
      }
    });
  }
}

module.exports = EnsureServerPagesPlugin;
