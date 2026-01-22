#!/usr/bin/env tsx

/**
 * Dependency audit wrapper for depcheck with allowlist support.
 */

import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { console } from './logger';

interface DepcheckResult {
  dependencies: string[];
  devDependencies: string[];
  missing: Record<string, string[]>;
  invalidFiles: Record<string, string[]>;
  invalidDirs: string[];
}

interface DepcheckAllowlist {
  ignoreUnused: string[];
  ignoreMissing: string[];
}

function loadAllowlist(): DepcheckAllowlist {
  const allowlistPath = resolve('config/depcheck-allowlist.json');
  const raw = readFileSync(allowlistPath, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<DepcheckAllowlist>;
  return {
    ignoreUnused: parsed.ignoreUnused ?? [],
    ignoreMissing: parsed.ignoreMissing ?? [],
  };
}

function runDepcheck(): DepcheckResult {
  const output = execFileSync('npx', [
    'depcheck',
    '--json',
    '--ignore-dirs=node_modules,dist,build',
  ], { encoding: 'utf-8' });

  return JSON.parse(output) as DepcheckResult;
}

function main(): void {
  const allowlist = loadAllowlist();
  const result = runDepcheck();

  const unusedDeps = result.dependencies.filter((dep) => !allowlist.ignoreUnused.includes(dep));
  const unusedDevDeps = result.devDependencies.filter((dep) => !allowlist.ignoreUnused.includes(dep));
  const missingDeps = Object.keys(result.missing || {}).filter(
    (dep) => !allowlist.ignoreMissing.includes(dep)
  );

  if (unusedDeps.length === 0 && unusedDevDeps.length === 0 && missingDeps.length === 0) {
    console.log('✅ Depcheck passed with allowlist');
    return;
  }

  if (unusedDeps.length > 0) {
    console.error(`Unused dependencies: ${unusedDeps.join(', ')}`);
  }

  if (unusedDevDeps.length > 0) {
    console.error(`Unused devDependencies: ${unusedDevDeps.join(', ')}`);
  }

  if (missingDeps.length > 0) {
    console.error(`Missing dependencies: ${missingDeps.join(', ')}`);
  }

  process.exit(1);
}

main();
