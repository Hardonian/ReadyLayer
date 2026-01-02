#!/usr/bin/env node
/**
 * Fix Next.js build cleanup issue
 * 
 * Removes .next/export directory that causes ENOTEMPTY errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const exportDir = path.join(process.cwd(), '.next', 'export');
const serverPagesDir = path.join(process.cwd(), '.next', 'server', 'pages');

// Ensure server/pages directory exists (Next.js needs this for error page moves)
// This must happen BEFORE Next.js tries to move files
const serverDir = path.join(process.cwd(), '.next', 'server');
try {
  if (!fs.existsSync(serverDir)) {
    fs.mkdirSync(serverDir, { recursive: true });
  }
  if (!fs.existsSync(serverPagesDir)) {
    fs.mkdirSync(serverPagesDir, { recursive: true });
  }
} catch (err) {
  // Ignore - might be created during build or already exists
}

// Use Node.js fs.rmSync if available (Node 14.14+), otherwise use system command
// This handles nested directories and files reliably
if (fs.existsSync(exportDir)) {
  try {
    // Try Node.js built-in rmSync first (most reliable, handles nested dirs)
    if (typeof fs.rmSync === 'function') {
      fs.rmSync(exportDir, { recursive: true, force: true, maxRetries: 5 });
    } else {
      // Fallback: use system command with proper handling
      execSync(`rm -rf "${exportDir}"`, { 
        stdio: 'ignore', 
        timeout: 15000 
      });
    }
  } catch (error) {
    // If that fails, try with find command (handles nested dirs better)
    try {
      // Delete all files and directories recursively, then remove the directory itself
      execSync(`find "${exportDir}" -type f -delete 2>/dev/null; find "${exportDir}" -type d -empty -delete 2>/dev/null; rmdir "${exportDir}" 2>/dev/null || rm -rf "${exportDir}" 2>/dev/null || true`, { 
        stdio: 'ignore',
        timeout: 15000,
        shell: '/bin/bash'
      });
    } catch (err) {
      // Last resort: manual recursive deletion with retries
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          function removeDir(dirPath) {
            if (!fs.existsSync(dirPath)) {
              return true;
            }

            let allRemoved = true;
            const files = fs.readdirSync(dirPath);
            for (const file of files) {
              const filePath = path.join(dirPath, file);
              try {
                const stat = fs.statSync(filePath);
                
                if (stat.isDirectory()) {
                  if (!removeDir(filePath)) {
                    allRemoved = false;
                  }
                } else {
                  fs.unlinkSync(filePath);
                }
              } catch (err) {
                // Continue on errors
                allRemoved = false;
              }
            }
            
            if (allRemoved) {
              try {
                fs.rmdirSync(dirPath);
                return true;
              } catch (err) {
                return false;
              }
            }
            return false;
          }
          
          if (removeDir(exportDir)) {
            break; // Success
          }
          
          if (attempt < 4) {
            // Wait before retrying
            try {
              execSync('sleep 0.3', { stdio: 'ignore' });
            } catch (e) {
              // Ignore sleep errors
            }
          }
        } catch (finalErr) {
          // Continue to next attempt
        }
      }
    }
  }
}
