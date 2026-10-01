/**
 * Package Slopsquatting & Hallucination Detector
 * 
 * Protects software repositories from AI hallucinated packages and slopsquatting attacks.
 * When LLMs/agents generate code, they frequently invent non-existent package names.
 * Attackers register these hallucinated names on npm/PyPI to achieve Remote Code Execution.
 * 
 * ReadyLayer deterministically flags hallucination risk based on:
 * - Package creation age and download velocity heuristics
 * - High-risk synthetic namespace patterns
 * - Levenshtein / typo-distance against top popular packages
 * - Structural analysis of dependency additions in diffs
 */

import { createHash } from 'crypto';

export type SlopsquattingRiskLevel = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PackageInspectionResult {
  packageName: string;
  ecosystem: 'npm' | 'pypi' | 'crates' | 'go';
  riskLevel: SlopsquattingRiskLevel;
  score: number; // 0 (safe) to 100 (critical hallucination risk)
  reasons: string[];
  remediation: string;
  isKnownPopular: boolean;
  sha256: string;
}

// Curated list of top verified baseline packages
const POPULAR_NPM_PACKAGES = new Set([
  'react', 'react-dom', 'next', 'express', 'lodash', 'axios', 'typescript',
  'zod', 'tailwind-merge', 'clsx', 'lucide-react', 'prisma', '@prisma/client',
  'vitest', 'jest', 'eslint', 'prettier', 'dotenv', 'pino', 'redis', 'stripe',
  '@supabase/supabase-js', '@tanstack/react-query', 'framer-motion', 'commander',
]);

const POPULAR_PYPI_PACKAGES = new Set([
  'requests', 'numpy', 'pandas', 'scipy', 'django', 'flask', 'fastapi',
  'pydantic', 'sqlalchemy', 'pytest', 'black', 'boto3', 'openai', 'anthropic',
  'langchain', 'llama-index', 'transformers', 'torch', 'uvicorn', 'celery',
]);

// Suspicious keywords frequently hallucinated by LLMs in synthetic package names
const SUSPICIOUS_SYNTHETIC_STEMS = [
  'fast-auth', 'jwt-helper', 'safe-eval', 'sql-guard', 'vault-client',
  'super-logger', 'ai-connector', 'prompt-filter', 'cloud-sync-pro',
  'secure-session-utils', 'crypto-fast-kit', 'token-checker-v2',
];

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Inspect a single package for hallucination / slopsquatting risk
 */
export function inspectPackage(
  packageName: string,
  ecosystem: 'npm' | 'pypi' | 'crates' | 'go' = 'npm',
  metadata?: { isNewlyRegistered?: boolean; weeklyDownloads?: number; ageInDays?: number }
): PackageInspectionResult {
  const reasons: string[] = [];
  let score = 0;

  const normalized = packageName.toLowerCase().trim();
  const popularSet = ecosystem === 'pypi' ? POPULAR_PYPI_PACKAGES : POPULAR_NPM_PACKAGES;
  const isKnown = popularSet.has(normalized);

  if (isKnown) {
    return {
      packageName,
      ecosystem,
      riskLevel: 'SAFE',
      score: 0,
      reasons: ['Verified high-reputation package in registry canonical index'],
      remediation: 'No action required.',
      isKnownPopular: true,
      sha256: createHash('sha256').update(`${ecosystem}:${packageName}`).digest('hex'),
    };
  }

  // Check 1: Suspicious synthetic stems common in AI hallucinations
  for (const stem of SUSPICIOUS_SYNTHETIC_STEMS) {
    if (normalized.includes(stem)) {
      score += 55;
      reasons.push(`Contains synthetic token signature '${stem}' frequently hallucinated by code-gen models`);
      break;
    }
  }

  // Check 2: Typosquatting distance against popular packages
  for (const popular of popularSet) {
    const dist = levenshteinDistance(normalized, popular);
    if (dist === 1 && normalized.length > 3) {
      score += 55;
      reasons.push(`Suspicious 1-character typo-distance from established package '${popular}' (Typosquatting risk)`);
      break;
    } else if (dist === 2 && normalized.length > 6) {
      score += 30;
      reasons.push(`Close edit-distance (2) to popular package '${popular}'`);
      break;
    }
  }

  // Check 3: Scoped package name imitation
  if (normalized.startsWith('@') && !normalized.includes('/')) {
    score += 40;
    reasons.push('Malformed package scope format');
  }

  // Check 4: Metadata signals if provided (e.g. from registry query or CI context)
  if (metadata) {
    if (metadata.isNewlyRegistered || (metadata.ageInDays !== undefined && metadata.ageInDays < 14)) {
      score += 40;
      reasons.push(`Package was registered very recently (${metadata.ageInDays ?? '<14'} days ago)`);
    }
    if (metadata.weeklyDownloads !== undefined && metadata.weeklyDownloads < 100) {
      score += 25;
      reasons.push(`Extremely low download velocity (${metadata.weeklyDownloads} downloads/week)`);
    }
  }

  // Default baseline for unverified non-popular packages
  if (reasons.length === 0) {
    score = 15;
    reasons.push('Package is not in curated high-reputation index; manual verification recommended');
  }

  // Normalize score
  score = Math.min(100, Math.max(0, score));

  let riskLevel: SlopsquattingRiskLevel = 'SAFE';
  if (score >= 70) riskLevel = 'CRITICAL';
  else if (score >= 50) riskLevel = 'HIGH';
  else if (score >= 25) riskLevel = 'MEDIUM';
  else if (score > 10) riskLevel = 'LOW';

  const remediation = riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
    ? `Block installation. Verify whether '${packageName}' was hallucinated by an AI agent. Check official registry and verify package author identity.`
    : `Verify '${packageName}' matches your intended package and lockfile checksum.`;

  return {
    packageName,
    ecosystem,
    riskLevel,
    score,
    reasons,
    remediation,
    isKnownPopular: false,
    sha256: createHash('sha256').update(`${ecosystem}:${packageName}:${score}`).digest('hex'),
  };
}

/**
 * Extract dependencies added in a git diff or file content
 */
export function extractAddedDependenciesFromDiff(
  diffContent: string
): Array<{ name: string; ecosystem: 'npm' | 'pypi' }> {
  const dependencies: Array<{ name: string; ecosystem: 'npm' | 'pypi' }> = [];
  const lines = diffContent.split('\n');

  let inNpmPackageJson = false;
  let inPythonRequirements = false;

  for (const line of lines) {
    if (line.startsWith('diff --git') || line.startsWith('---') || line.startsWith('+++')) {
      if (line.includes('package.json')) {
        inNpmPackageJson = true;
        inPythonRequirements = false;
      } else if (line.includes('requirements.txt') || line.includes('pyproject.toml')) {
        inPythonRequirements = true;
        inNpmPackageJson = false;
      } else if (line.startsWith('diff --git')) {
        inNpmPackageJson = false;
        inPythonRequirements = false;
      }
    }

    // Check for added lines
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const addedText = line.substring(1).trim();

      // npm package.json dependency match: "package-name": "^1.0.0",
      if (inNpmPackageJson || addedText.includes('":')) {
        const match = addedText.match(/^"([^"]+)":\s*"[^"]*"/);
        if (match && !match[1].startsWith('//') && match[1] !== 'name' && match[1] !== 'version') {
          dependencies.push({ name: match[1], ecosystem: 'npm' });
        }
      }

      // Python requirements.txt match: package-name==1.0.0
      if (inPythonRequirements || addedText.match(/^[a-zA-Z0-9_-]+[=<>~!]=/)) {
        const match = addedText.match(/^([a-zA-Z0-9_-]+)(?:[=<>~!].*)?$/);
        if (match && match[1] && !match[1].startsWith('#')) {
          dependencies.push({ name: match[1], ecosystem: 'pypi' });
        }
      }
    }
  }

  return dependencies;
}

/**
 * Scan an entire diff for AI package slopsquatting risks
 */
export function scanDiffForSlopsquatting(
  diffContent: string
): {
  passed: boolean;
  criticalCount: number;
  highCount: number;
  inspections: PackageInspectionResult[];
  summary: string;
} {
  const deps = extractAddedDependenciesFromDiff(diffContent);
  const inspections = deps.map((d) => inspectPackage(d.name, d.ecosystem));

  const criticalCount = inspections.filter((i) => i.riskLevel === 'CRITICAL').length;
  const highCount = inspections.filter((i) => i.riskLevel === 'HIGH').length;
  const passed = criticalCount === 0 && highCount === 0;

  const summary = passed
    ? `All ${inspections.length} inspected dependencies cleared slopsquatting checks.`
    : `Detected ${criticalCount + highCount} suspicious/hallucinated packages in diff that violate enterprise supply-chain policy.`;

  return {
    passed,
    criticalCount,
    highCount,
    inspections,
    summary,
  };
}
