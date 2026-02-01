/**
 * Security Validator for Debug Sessions
 *
 * Validates code changes and debug output for common security issues.
 * Use during bug triage to ensure fixes don't introduce vulnerabilities.
 *
 * @example
 * ```typescript
 * import { validateSecurity } from '@/lib/debug/security-validator';
 *
 * const issues = await validateSecurity({
 *   code: fileContent,
 *   type: 'api-route',
 * });
 *
 * if (issues.length > 0) {
 *   console.error('Security issues found:', issues);
 * }
 * ```
 */

import { redactSecrets } from '@/lib/secrets/redaction';

export interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
  codeSnippet?: string;
}

export interface ValidationOptions {
  /** The code to validate */
  code: string;

  /** Type of code being validated */
  type?: 'api-route' | 'service' | 'component' | 'utility' | 'test';

  /** File path (for context) */
  filePath?: string;

  /** Enable all checks (default: true) */
  enableAllChecks?: boolean;

  /** Specific checks to run */
  checks?: Array<
    | 'tenant-isolation'
    | 'secret-exposure'
    | 'sql-injection'
    | 'xss'
    | 'input-validation'
    | 'error-handling'
    | 'logging-safety'
  >;
}

/**
 * Validate code for security issues
 */
export async function validateSecurity(
  options: ValidationOptions
): Promise<SecurityIssue[]> {
  const {
    code,
    type = 'service',
    enableAllChecks = true,
    checks = [],
  } = options;

  const issues: SecurityIssue[] = [];
  const lines = code.split('\n');

  // Determine which checks to run
  const runCheck = (checkName: NonNullable<ValidationOptions['checks']>[number]): boolean => {
    if (enableAllChecks) return true;
    return checks.includes(checkName);
  };

  // Check 1: Tenant Isolation
  if (runCheck('tenant-isolation')) {
    issues.push(...checkTenantIsolation(code, lines, type));
  }

  // Check 2: Secret Exposure
  if (runCheck('secret-exposure')) {
    issues.push(...checkSecretExposure(code, lines));
  }

  // Check 3: SQL Injection
  if (runCheck('sql-injection')) {
    issues.push(...checkSQLInjection(code, lines));
  }

  // Check 4: XSS Prevention
  if (runCheck('xss')) {
    issues.push(...checkXSS(code, lines));
  }

  // Check 5: Input Validation
  if (runCheck('input-validation')) {
    issues.push(...checkInputValidation(code, lines, type));
  }

  // Check 6: Error Handling
  if (runCheck('error-handling')) {
    issues.push(...checkErrorHandling(code, lines));
  }

  // Check 7: Logging Safety
  if (runCheck('logging-safety')) {
    issues.push(...checkLoggingSafety(code, lines));
  }

  return issues;
}

/**
 * Check for proper tenant isolation (organizationId filtering)
 */
function checkTenantIsolation(
  code: string,
  lines: string[],
  _type: string
): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Look for Prisma queries without organizationId filter
  const prismaQueryPattern = /prisma\.\w+\.(findMany|findFirst|findUnique|count|aggregate|groupBy)/g;
  let match: RegExpExecArray | null;

  while ((match = prismaQueryPattern.exec(code)) !== null) {
    const queryStart = match.index;
    const lineNumber = code.substring(0, queryStart).split('\n').length;

    // Extract the query block (rough heuristic)
    const queryBlock = extractCodeBlock(code, queryStart, 300);

    // Check if organizationId is mentioned in the query
    if (!queryBlock.includes('organizationId')) {
      issues.push({
        severity: 'critical',
        category: 'tenant-isolation',
        message: 'Prisma query missing organizationId filter - potential data leak',
        line: lineNumber,
        suggestion: 'Add organizationId to where clause: where: { organizationId, ... }',
        codeSnippet: lines[lineNumber - 1],
      });
    }
  }

  return issues;
}

/**
 * Check for exposed secrets in code
 */
function checkSecretExposure(code: string, lines: string[]): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Patterns for hardcoded secrets
  const secretPatterns = [
    {
      pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"](sk-[a-zA-Z0-9]{20,}|[a-zA-Z0-9]{32,})['"]/gi,
      message: 'Hardcoded API key detected',
    },
    {
      pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]+['"]/gi,
      message: 'Hardcoded password detected',
    },
    {
      pattern: /(?:secret|token)\s*[:=]\s*['"]((?!['"]\s*process\.env)[^'"]{16,})['"]/gi,
      message: 'Hardcoded secret or token detected',
    },
    {
      pattern: /AKIA[0-9A-Z]{16}/g,
      message: 'AWS Access Key detected',
    },
    {
      pattern: /-----BEGIN (?:RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/g,
      message: 'Private key detected',
    },
  ];

  secretPatterns.forEach(({ pattern, message }) => {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern);

    while ((match = regex.exec(code)) !== null) {
      const lineNumber = code.substring(0, match.index).split('\n').length;

      issues.push({
        severity: 'critical',
        category: 'secret-exposure',
        message,
        line: lineNumber,
        suggestion: 'Use environment variables: process.env.API_KEY',
        codeSnippet: redactSecrets(lines[lineNumber - 1]).redacted,
      });
    }
  });

  return issues;
}

/**
 * Check for SQL injection vulnerabilities
 */
function checkSQLInjection(code: string, lines: string[]): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Look for raw SQL usage
  const rawSQLPatterns = [
    /\$queryRaw/gi,
    /\$executeRaw/gi,
    /prisma\.\$queryRawUnsafe/gi,
    /prisma\.\$executeRawUnsafe/gi,
  ];

  rawSQLPatterns.forEach(pattern => {
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(code)) !== null) {
      const lineNumber = code.substring(0, match.index).split('\n').length;

      issues.push({
        severity: 'high',
        category: 'sql-injection',
        message: 'Raw SQL query detected - potential SQL injection risk',
        line: lineNumber,
        suggestion: 'Use Prisma ORM queries instead of raw SQL',
        codeSnippet: lines[lineNumber - 1],
      });
    }
  });

  return issues;
}

/**
 * Check for XSS vulnerabilities
 */
function checkXSS(code: string, lines: string[]): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Look for dangerouslySetInnerHTML usage
  const dangerousHTMLPattern = /dangerouslySetInnerHTML/gi;
  let match: RegExpExecArray | null;

  while ((match = dangerousHTMLPattern.exec(code)) !== null) {
    const lineNumber = code.substring(0, match.index).split('\n').length;

    issues.push({
      severity: 'high',
      category: 'xss',
      message: 'dangerouslySetInnerHTML usage detected - potential XSS vulnerability',
      line: lineNumber,
      suggestion: 'Sanitize HTML with DOMPurify before rendering',
      codeSnippet: lines[lineNumber - 1],
    });
  }

  return issues;
}

/**
 * Check for proper input validation
 */
function checkInputValidation(
  code: string,
  _lines: string[],
  type: string
): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // For API routes, check for Zod validation
  if (type === 'api-route') {
    const hasZodImport = /import.*zod/.test(code);
    const hasValidation = /\.parse\(|\.safeParse\(/.test(code);

    if (!hasZodImport || !hasValidation) {
      issues.push({
        severity: 'high',
        category: 'input-validation',
        message: 'API route missing input validation with Zod',
        suggestion: 'Import and use Zod schemas to validate all inputs',
      });
    }
  }

  return issues;
}

/**
 * Check for proper error handling
 */
function checkErrorHandling(code: string, lines: string[]): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Look for empty catch blocks
  const emptyCatchPattern = /catch\s*\([^)]*\)\s*\{\s*\}/gi;
  let match: RegExpExecArray | null;

  while ((match = emptyCatchPattern.exec(code)) !== null) {
    const lineNumber = code.substring(0, match.index).split('\n').length;

    issues.push({
      severity: 'medium',
      category: 'error-handling',
      message: 'Empty catch block - errors are being swallowed',
      line: lineNumber,
      suggestion: 'Log errors or rethrow them',
      codeSnippet: lines[lineNumber - 1],
    });
  }

  return issues;
}

/**
 * Check for safe logging practices
 */
function checkLoggingSafety(code: string, lines: string[]): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Look for console.log/error with sensitive data
  const consoleLogPattern = /console\.(log|error|warn)\([^)]*(?:password|token|secret|key)[^)]*\)/gi;
  let match: RegExpExecArray | null;

  while ((match = consoleLogPattern.exec(code)) !== null) {
    const lineNumber = code.substring(0, match.index).split('\n').length;

    issues.push({
      severity: 'medium',
      category: 'logging-safety',
      message: 'Logging potentially sensitive data',
      line: lineNumber,
      suggestion: 'Use redactSecrets() before logging or use safe logger',
      codeSnippet: redactSecrets(lines[lineNumber - 1]).redacted,
    });
  }

  return issues;
}

/**
 * Extract a code block around a position
 */
function extractCodeBlock(code: string, start: number, length: number): string {
  return code.substring(start, Math.min(start + length, code.length));
}

/**
 * Generate a security report
 */
export function generateSecurityReport(issues: SecurityIssue[]): string {
  if (issues.length === 0) {
    return '✅ No security issues found!';
  }

  const lines: string[] = [];

  lines.push('🔒 Security Validation Report');
  lines.push('='.repeat(50));
  lines.push('');

  // Group by severity
  const bySeverity = {
    critical: issues.filter(i => i.severity === 'critical'),
    high: issues.filter(i => i.severity === 'high'),
    medium: issues.filter(i => i.severity === 'medium'),
    low: issues.filter(i => i.severity === 'low'),
    info: issues.filter(i => i.severity === 'info'),
  };

  const formatIssues = (severity: string, issueList: SecurityIssue[]): void => {
    if (issueList.length === 0) return;

    const icon = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵',
      info: '⚪',
    }[severity] || '⚪';

    lines.push(`${icon} ${severity.toUpperCase()} (${issueList.length})`);
    lines.push('-'.repeat(50));

    issueList.forEach((issue, index) => {
      lines.push(`${index + 1}. [${issue.category}] ${issue.message}`);
      if (issue.line) {
        lines.push(`   Line: ${issue.line}`);
      }
      if (issue.codeSnippet) {
        lines.push(`   Code: ${issue.codeSnippet.trim()}`);
      }
      if (issue.suggestion) {
        lines.push(`   💡 ${issue.suggestion}`);
      }
      lines.push('');
    });
  };

  formatIssues('critical', bySeverity.critical);
  formatIssues('high', bySeverity.high);
  formatIssues('medium', bySeverity.medium);
  formatIssues('low', bySeverity.low);
  formatIssues('info', bySeverity.info);

  lines.push('='.repeat(50));
  lines.push(`Total Issues: ${issues.length}`);

  return lines.join('\n');
}

/**
 * CLI utility to validate a file
 */
export async function validateFile(filePath: string): Promise<void> {
  const fs = await import('fs/promises');
  const code = await fs.readFile(filePath, 'utf-8');

  const type = determineFileType(filePath);

  const issues = await validateSecurity({
    code,
    type,
    filePath,
  });

  process.stdout.write(`${generateSecurityReport(issues)}\n`);

  // Exit with error if critical or high issues found
  const hasCriticalIssues = issues.some(
    i => i.severity === 'critical' || i.severity === 'high'
  );

  if (hasCriticalIssues) {
    process.exit(1);
  }
}

/**
 * Determine file type from path
 */
function determineFileType(
  filePath: string
): ValidationOptions['type'] {
  if (filePath.includes('/api/')) return 'api-route';
  if (filePath.includes('/services/')) return 'service';
  if (filePath.includes('/components/')) return 'component';
  if (filePath.includes('.test.') || filePath.includes('.spec.')) return 'test';
  return 'utility';
}
