/**
 * Check for unused exports
 * 
 * Scans the codebase for exported functions/variables that are never imported.
 * This helps keep the public API surface clean and identifies dead code.
 */

import path from 'node:path';
import { readFile, readdir } from 'fs/promises';

const IGNORE_PATTERNS = [
  // Config files
  /^config\//,
  /^\.next\//,
  /^node_modules\//,
  // Type definitions
  /\.d\.ts$/,
  // Test files
  /\.(test|spec)\.(ts|tsx)$/,
  // Entry points
  /^(cli|workers|app)\//,
  /^(index|main|server)\.ts$/,
  // Contract/schema files (often exported for external use)
  /contracts\//,
  /schemas\//,
  /types\//,
];

interface ExportInfo {
  name: string;
  file: string;
  line: number;
}

async function listTypeScriptFiles(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const results: string[] = [];
  const ignoredDirs = new Set(['node_modules', '.next', 'dist', 'build', 'out']);

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        continue;
      }
      results.push(...await listTypeScriptFiles(fullPath));
    } else if (entry.isFile()) {
      if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

async function findUnusedExports(): Promise<ExportInfo[]> {
  const tsFiles = await listTypeScriptFiles(process.cwd());

  // Parse all exports
  const allExports: ExportInfo[] = [];
  const allImports: Set<string> = new Set();

  for (const file of tsFiles) {
    const relativePath = path.relative(process.cwd(), file);
    const content = await readFile(file, 'utf-8');
    
    // Skip ignored files
    if (IGNORE_PATTERNS.some(pattern => pattern.test(relativePath))) {
      continue;
    }

    // Find exports
    const exportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      allExports.push({
        name: match[1],
        file: relativePath,
        line,
      });
    }

    // Find re-exports
    const reExportRegex = /export\s*\{([^}]+)\}/g;
    while ((match = reExportRegex.exec(content)) !== null) {
      const exports = match[1].split(',').map(e => e.trim().split(' as ')[0].trim());
      const line = content.substring(0, match.index).split('\n').length;
      for (const exp of exports) {
        allExports.push({
          name: exp,
        file: relativePath,
        line,
      });
    }
    }

    // Find imports
    const importRegex = /import\s*\{([^}]+)\}\s*from/g;
    while ((match = importRegex.exec(content)) !== null) {
      const imports = match[1].split(',').map(i => i.trim().split(' as ')[0].trim());
      for (const imp of imports) {
        allImports.add(imp);
      }
    }

    // Find default/named imports
    const namedImportRegex = /import\s+(\w+)\s+from/g;
    while ((match = namedImportRegex.exec(content)) !== null) {
      allImports.add(match[1]);
    }
  }

  // Find unused exports
  const unused = allExports.filter(exp => !allImports.has(exp.name));

  return unused;
}

async function main(): Promise<void> {
  console.log('Checking for unused exports...\n');

  const unused = await findUnusedExports();

  if (unused.length === 0) {
    console.log('✅ No unused exports found');
    process.exit(0);
  }

  console.log(`❌ Found ${unused.length} unused export(s):\n`);

  // Group by file
  const byFile = unused.reduce((acc, exp) => {
    acc[exp.file] = acc[exp.file] || [];
    acc[exp.file].push(exp);
    return acc;
  }, {} as Record<string, ExportInfo[]>);

  for (const [file, exports] of Object.entries(byFile)) {
    console.log(`${file}:`);
    for (const exp of exports) {
      console.log(`  - ${exp.name} (line ${exp.line})`);
    }
    console.log();
  }

  console.log('To fix:');
  console.log('  - Remove unused exports, OR');
  console.log('  - Add to IGNORE_PATTERNS if they are public API\n');

  process.exit(1);
}

main().catch((err: unknown) => {
  console.error('Error checking unused exports:', err instanceof Error ? err.message : err);
  process.exit(1);
});
