/**
 * Check for unused exports
 * 
 * Scans the codebase for exported functions/variables that are never imported.
 * This helps keep the public API surface clean and identifies dead code.
 */

import { glob } from 'glob';
import { readFile } from 'fs/promises';

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

async function findUnusedExports(): Promise<ExportInfo[]> {
  const tsFiles = await glob('**/*.{ts,tsx}', {
    ignore: ['node_modules/**', '.next/**', 'dist/**'],
  });

  // Parse all exports
  const allExports: ExportInfo[] = [];
  const allImports: Set<string> = new Set();

  for (const file of tsFiles) {
    const content = await readFile(file, 'utf-8');
    
    // Skip ignored files
    if (IGNORE_PATTERNS.some(pattern => pattern.test(file))) {
      continue;
    }

    // Find exports
    const exportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      allExports.push({
        name: match[1],
        file,
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
          file,
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

async function main() {
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

main().catch(err => {
  console.error('Error checking unused exports:', err);
  process.exit(1);
});
