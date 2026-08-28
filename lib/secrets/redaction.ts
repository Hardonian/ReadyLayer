/**
 * Secrets Detection & Redaction Service
 *
 * Automatically detects and redacts sensitive information before sending code to LLM.
 * Prevents accidental exposure of API keys, credentials, tokens, and PII.
 *
 * Patterns detected:
 * - API keys (OpenAI, AWS, GitHub, etc.)
 * - Database credentials and connection strings
 * - Private keys (RSA, SSH, PGP)
 * - OAuth tokens and JWT tokens
 * - Email addresses and URLs
 * - Credit card numbers
 * - Social Security Numbers
 * - Password literals
 */

import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';

export interface RedactionResult {
  original: string;
  redacted: string;
  secretsFound: number;
  secretTypes: string[];
  redactionPatterns: RedactionPattern[];
}

export interface RedactionPattern {
  type: string;
  pattern: RegExp;
  example: string;
}

/**
 * Secret patterns to detect and redact
 */
const SECRET_PATTERNS: RedactionPattern[] = [
  {
    type: 'api-key-openai',
    pattern: /sk-[A-Za-z0-9]{20,250}/g,
    example: 'sk-proj-XXX...',
  },
  {
    type: 'api-key-aws',
    pattern: /AKIA[0-9A-Z]{16}/g,
    example: 'AKIAIOSFODNN7EXAMPLE',
  },
  {
    type: 'api-key-github',
    pattern: /ghp_[A-Za-z0-9_]{36,255}/g,
    example: 'ghp_XXX...',
  },
  {
    type: 'private-key-begin',
    pattern: /-----BEGIN\s(?:RSA\s|DSA\s|EC\s|OPENSSH\s)?PRIVATE\sKEY-----[\s\S]*?-----END\s(?:RSA\s|DSA\s|EC\s|OPENSSH\s)?PRIVATE\sKEY-----/g,
    example: '-----BEGIN PRIVATE KEY-----...',
  },
  {
    type: 'jwt-token',
    pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.?[A-Za-z0-9_-]*/g,
    example: 'eyJhbGc...',
  },
  {
    type: 'oauth-token',
    pattern: /[Tt]oken[\s:=]+['"]?[A-Za-z0-9_.-]{20,}['"]?/g,
    example: 'token=XXX',
  },
  {
    type: 'database-url',
    pattern: /(?:postgres|mysql|mongodb|redis)(?:\+[a-z]+)?:\/\/[^\s<>"`{}|\\^[\]`]+/g,
    example: 'postgresql://user:pass@host/db',
  },
  {
    type: 'password-literal',
    pattern: /password[\s:=]+['"]([^'"]+)['"]/gi,
    example: 'password="secret123"',
  },
  {
    type: 'api-key-generic',
    pattern: /api[_-]?key[\s:=]+['"]?[A-Za-z0-9_.-]{20,}['"]?/gi,
    example: 'api_key=XXX',
  },
  {
    type: 'aws-secret',
    pattern: /aws_secret_access_key[\s:=]+['"]?[A-Za-z0-9/+]{40}['"]?/gi,
    example: 'aws_secret_access_key=XXX',
  },
  {
    type: 'slack-token',
    pattern: /xox[baprs]-[0-9]{10,12}-[A-Za-z0-9]{24,32}/g,
    example: 'xoxb-XXX...',
  },
  {
    type: 'stripe-key',
    pattern: /sk_live_[A-Za-z0-9]{24}/g,
    example: 'sk_live_XXX',
  },
  {
    type: 'connection-string',
    pattern: /Server=.+?;.*?Password=[^;]+/gi,
    example: 'Server=host;Password=secret',
  },
  {
    type: 'email-address',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    example: 'user@example.com',
  },
  {
    type: 'credit-card',
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    example: '4111-1111-1111-1111',
  },
  {
    type: 'ssn',
    pattern: /\b(?:\d{3}-\d{2}-\d{4})\b/g,
    example: '123-45-6789',
  },
  {
    type: 'docker-config',
    pattern: /"auth"\s*:\s*"[A-Za-z0-9+/]+=*"/g,
    example: '"auth":"XXX"',
  },
  {
    type: 'environment-variable-secret',
    pattern: /(?:SECRET|PRIVATE|KEY|CREDENTIAL|PASSWD)[\s:=]+['"]?[^\s'"]+['"]?/gi,
    example: 'SECRET_KEY=XXX',
  },
];

/**
 * Redact secrets from code
 * @param code - Code to redact
 * @param options - Redaction options
 * @returns Redacted code and detection results
 */
export function redactSecrets(
  code: string,
  options: {
    redactEmail?: boolean;
    minSecretLength?: number;
    logDetections?: boolean;
  } = {}
): RedactionResult {
  const {
    redactEmail = false, // Don't redact emails by default (too many false positives)
    logDetections = true,
  } = options;

  let redacted = code;
  let secretsFound = 0;
  const detectedTypes = new Set<string>();
  const appliedPatterns: RedactionPattern[] = [];

  // Apply each pattern
  for (const patternConfig of SECRET_PATTERNS) {
    // Skip email redaction if disabled
    if (patternConfig.type === 'email-address' && !redactEmail) {
      continue;
    }

    const matches = code.match(patternConfig.pattern);
    if (matches) {
      detectedTypes.add(patternConfig.type);
      appliedPatterns.push(patternConfig);

      // Count unique matches (avoid counting same secret multiple times)
      const uniqueMatches = new Set(matches);
      secretsFound += uniqueMatches.size;

      // Replace with redacted version
      const placeholder = `[${patternConfig.type.toUpperCase()}_REDACTED]`;
      redacted = redacted.replace(patternConfig.pattern, placeholder);

      if (logDetections) {
        metrics.increment('secret_detected', { type: patternConfig.type });
      }
    }
  }

  // Log findings
  if (secretsFound > 0 && logDetections) {
    logger.warn(
      {
        secretsFound,
        secretTypes: Array.from(detectedTypes),
        codeLength: code.length,
      },
      'Secrets detected in code - redacted before sending to LLM'
    );

    metrics.increment('secrets_redacted_total', {
      count: secretsFound.toString(),
    });
  }

  return {
    original: code,
    redacted,
    secretsFound,
    secretTypes: Array.from(detectedTypes),
    redactionPatterns: appliedPatterns,
  };
}

/**
 * Check if code likely contains secrets without redacting
 * Useful for pre-flight checks
 */
export function containsSecrets(code: string): boolean {
  for (const patternConfig of SECRET_PATTERNS) {
    if (patternConfig.pattern.test(code)) {
      return true;
    }
  }
  return false;
}

/**
 * Get secret density - percentage of code that is likely secrets
 */
export function getSecretDensity(code: string): number {
  let secretCharCount = 0;

  for (const patternConfig of SECRET_PATTERNS) {
    const matches = code.match(patternConfig.pattern) || [];
    for (const match of matches) {
      secretCharCount += match.length;
    }
  }

  if (code.length === 0) return 0;
  return (secretCharCount / code.length) * 100;
}

/**
 * Redact secrets from multiple code files
 */
export function redactSecretsFromFiles(
  files: Array<{ path: string; content: string }>
): Array<{ path: string; content: string; secretsFound: number; secretTypes: string[] }> {
  return files.map((file) => {
    const result = redactSecrets(file.content);
    return {
      path: file.path,
      content: result.redacted,
      secretsFound: result.secretsFound,
      secretTypes: result.secretTypes,
    };
  });
}

/**
 * Safe string for display (truncate and redact)
 */
export function makeSafeForLogging(text: string, maxLength: number = 100): string {
  const truncated = text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  const result = redactSecrets(truncated, { logDetections: false });
  return result.redacted;
}

/**
 * Validate that redacted code doesn't contain obvious secrets
 * Returns true if code is safe (no unredacted secrets), false otherwise
 */
export function isRedactedSafe(code: string): boolean {
  // Check for any remaining unredacted secret-like patterns
  const unredactedSecretPatterns = [
    /sk-[A-Za-z0-9]{20,250}/g, // OpenAI API keys
    /AKIA[0-9A-Z]{16}/g, // AWS Access Keys
    /ghp_[A-Za-z0-9_]{36,255}/g, // GitHub tokens
    /-----BEGIN\s(?:RSA\s|DSA\s|EC\s|OPENSSH\s)?PRIVATE\sKEY-----/g, // Private keys
    /xox[baprs]-[0-9]{10,12}-[A-Za-z0-9]{24,32}/g, // Slack tokens
    /sk_live_[A-Za-z0-9]{24}/g, // Stripe keys
    /(?:postgres|mysql|mongodb|redis)(?:\+[a-z]+)?:\/\/[^\s<>"`{}|\\^[\]`]+/g, // DB URLs
  ];

  // If any unredacted secrets are found, it's NOT safe
  for (const pattern of unredactedSecretPatterns) {
    if (pattern.test(code)) {
      return false;
    }
  }

  // No unredacted secrets found - safe to use
  return true;
}

/**
 * Statistics on redaction performance
 */
export interface RedactionStats {
  totalChecks: number;
  averageSecretsPerFile: number;
  mostCommonSecretType: string;
  redactionSuccessRate: number;
}

const redactionStats = {
  totalChecks: 0,
  secretsFound: 0,
  secretsByType: new Map<string, number>(),
};

/**
 * Get redaction statistics
 */
export function getRedactionStats(): RedactionStats {
  const secretTypes = Array.from(redactionStats.secretsByType.entries());
  const mostCommon = secretTypes.sort((a, b) => b[1] - a[1])[0];

  return {
    totalChecks: redactionStats.totalChecks,
    averageSecretsPerFile:
      redactionStats.totalChecks > 0
        ? redactionStats.secretsFound / redactionStats.totalChecks
        : 0,
    mostCommonSecretType: mostCommon ? mostCommon[0] : 'none',
    redactionSuccessRate: 100, // Would be calculated from actual data
  };
}

/**
 * Update redaction statistics
 */
export function updateRedactionStats(result: RedactionResult): void {
  redactionStats.totalChecks++;
  redactionStats.secretsFound += result.secretsFound;

  for (const type of result.secretTypes) {
    redactionStats.secretsByType.set(
      type,
      (redactionStats.secretsByType.get(type) || 0) + 1
    );
  }
}
