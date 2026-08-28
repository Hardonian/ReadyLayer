/**
 * License Detector
 *
 * Scans files for license headers and detects restrictive licenses.
 * Essential for OSS maintainers to prevent license violations.
 *
 * Detects:
 * - GPL (Copyleft) - v2, v3
 * - AGPL (Affero GPL) - most restrictive
 * - LGPL - weaker copyleft
 * - MPL - Mozilla Public License
 * - SSPL - Server-side Public License
 * - Other proprietary/restrictive licenses
 */

export interface LicenseIssue {
  file: string;
  line: number;
  license: string;
  licenseType: 'copyleft' | 'weak-copyleft' | 'proprietary' | 'permissive' | 'unknown';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  confidence: number;
}

// License patterns (sorted by risk level)
const LICENSE_PATTERNS = [
  {
    pattern: /AGPL|Affero General Public License/i,
    license: 'AGPL',
    type: 'copyleft',
    severity: 'critical',
    message: 'AGPL license detected - requires source code disclosure for network services',
  },
  {
    pattern: /GPL-?3|General Public License.*3/i,
    license: 'GPLv3',
    type: 'copyleft',
    severity: 'high',
    message: 'GPLv3 detected - copyleft license requires source code disclosure',
  },
  {
    pattern: /GPL-?2|General Public License.*2/i,
    license: 'GPLv2',
    type: 'copyleft',
    severity: 'high',
    message: 'GPLv2 detected - copyleft license requires source code disclosure',
  },
  {
    pattern: /SSPL|Server Side Public License/i,
    license: 'SSPL',
    type: 'proprietary',
    severity: 'high',
    message: 'SSPL detected - server-side public license with commercial restrictions',
  },
  {
    pattern: /LGPL|Lesser General Public License/i,
    license: 'LGPL',
    type: 'weak-copyleft',
    severity: 'medium',
    message: 'LGPL detected - weak copyleft, allows proprietary linking',
  },
  {
    pattern: /MPL|Mozilla Public License/i,
    license: 'MPL',
    type: 'weak-copyleft',
    severity: 'medium',
    message: 'MPL detected - requires source disclosure for modifications',
  },
  {
    pattern: /MIT|Apache-?2|BSD|ISC/i,
    license: 'Permissive',
    type: 'permissive',
    severity: 'low',
    message: 'Permissive license detected - good for compatibility',
  },
];

// Common license file names
const LICENSE_FILE_NAMES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'COPYING',
  'COPYING.md',
  'COPYING.txt',
  'LICENSE.rst',
  'LICENSE-MIT',
  'LICENSE-APACHE',
];

/**
 * Check if file is a license file
 */
export function isLicenseFile(filePath: string): boolean {
  const fileName = filePath.split('/').pop()?.toLowerCase() || '';
  return LICENSE_FILE_NAMES.some(name => fileName === name.toLowerCase());
}

/**
 * Detect license in file content
 */
export function detectLicense(content: string): LicenseIssue | null {
  // Only scan license-specific files and headers (first 1000 chars)
  const scanContent = content.substring(0, 1000);

  for (const { pattern, license, type, severity, message } of LICENSE_PATTERNS) {
    if (pattern.test(scanContent)) {
      // Find line number
      const lines = content.split('\n');
      let lineNumber = 1;
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          lineNumber = i + 1;
          break;
        }
      }

      return {
        file: '',
        line: lineNumber,
        license,
        licenseType: type as 'permissive' | 'weak-copyleft' | 'copyleft' | 'proprietary' | 'unknown',
        severity: severity as 'low' | 'medium' | 'high' | 'critical',
        message,
        confidence: 0.95,
      };
    }
  }

  return null;
}

/**
 * Scan file for license headers
 */
export function scanFileForLicense(filePath: string, content: string): LicenseIssue[] {
  const issues: LicenseIssue[] = [];

  // Only scan license-specific files
  if (!isLicenseFile(filePath)) {
    return issues;
  }

  const licenseIssue = detectLicense(content);
  if (licenseIssue) {
    issues.push({
      ...licenseIssue,
      file: filePath,
    });
  }

  return issues;
}

/**
 * Scan import statements for license conflicts
 * (Advanced: detects imports from GPL/AGPL packages)
 */
export function scanImportsForLicenseConflicts(
  filePath: string,
  content: string,
  _projectLicense?: string
): LicenseIssue[] {
  const issues: LicenseIssue[] = [];

  // Skip if not JavaScript/TypeScript
  if (!/\.(js|ts|jsx|tsx)$/.test(filePath)) {
    return issues;
  }

  // Common GPL/AGPL packages to warn about
  const restrictivePackages = [
    { name: 'elasticsearch', license: 'SSPL' },
    { name: 'mongodb', license: 'SSPL' },
    { name: 'redis', license: 'Various' }, // Redis Modules may have restrictions
  ];

  for (const { name, license } of restrictivePackages) {
    // Simple regex to find imports
    const importPattern = new RegExp(`import.*from\\s+['"]${name}['"]`, 'g');
    if (importPattern.test(content)) {
      const match = content.match(importPattern);
      if (match) {
        const lines = content.split('\n');
        let lineNumber = 1;
        for (let i = 0; i < lines.length; i++) {
          if (importPattern.test(lines[i])) {
            lineNumber = i + 1;
            break;
          }
        }

        issues.push({
          file: filePath,
          line: lineNumber,
          license,
          licenseType: 'proprietary',
          severity: 'medium',
          message: `Import from ${name} (${license}) may have license implications`,
          confidence: 0.7,
        });
      }
    }
  }

  return issues;
}

/**
 * Comprehensive license scan for a repository
 */
export async function scanRepositoryLicenses(files: Array<{
  path: string;
  content: string;
}>): Promise<LicenseIssue[]> {
  const allIssues: LicenseIssue[] = [];

  for (const file of files) {
    // Scan license files
    const licenseIssues = scanFileForLicense(file.path, file.content);
    allIssues.push(...licenseIssues);

    // Scan imports (in JS/TS files)
    const importIssues = scanImportsForLicenseConflicts(file.path, file.content);
    allIssues.push(...importIssues);
  }

  // Sort by severity (critical first)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return allIssues.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );
}

/**
 * Generate human-readable license report
 */
export function generateLicenseReport(issues: LicenseIssue[]): string {
  if (issues.length === 0) {
    return 'No license issues detected ✓';
  }

  const lines = ['License Analysis Report:', ''];
  const grouped = issues.reduce(
    (acc, issue) => {
      const key = issue.severity;
      if (!acc[key]) acc[key] = [];
      acc[key].push(issue);
      return acc;
    },
    {} as Record<string, LicenseIssue[]>
  );

  const severityOrder = ['critical', 'high', 'medium', 'low'] as const;
  for (const severity of severityOrder) {
    if (grouped[severity]?.length) {
      lines.push(`${severity.toUpperCase()} (${grouped[severity].length})`);
      for (const issue of grouped[severity]) {
        lines.push(`  - [${issue.file}:${issue.line}] ${issue.license}: ${issue.message}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
