/**
 * Static Analysis Service
 * 
 * Code pattern detection and rule evaluation
 * Security, quality, and style rules
 */

import { CodeParserService, ParseResult } from '../code-parser';

export interface Rule {
  id: string;
  name: string;
  category: 'security' | 'quality' | 'style' | 'ai';
  severity: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
  evaluate: (parseResult: ParseResult, filePath: string, content: string) => Issue[];
}

export interface Issue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number;
  column?: number;
  message: string;
  fix?: string;
  confidence: number; // 0-1
}

export class StaticAnalysisService {
  private rules: Map<string, Rule> = new Map();
  private codeParser: CodeParserService;

  constructor() {
    this.codeParser = new CodeParserService();
    this.registerDefaultRules();
  }

  /**
   * Analyze code file
   */
  async analyze(filePath: string, content: string): Promise<Issue[]> {
    // Parse code for AST analysis
    const parseResult = await this.codeParser.parse(filePath, content);
    const issues: Issue[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) {
        continue;
      }

      try {
        const ruleIssues = rule.evaluate(parseResult, filePath, content);
        issues.push(...ruleIssues);
      } catch (error) {
        // Log error but don't fail analysis
        // Error is handled gracefully, analysis continues with other rules
      }
    }

    return issues;
  }

  /**
   * Register a rule
   */
  registerRule(rule: Rule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Enable/disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Get all rules
   */
  getRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Register default security and quality rules
   */
  private registerDefaultRules(): void {
    // SQL Injection Detection
    this.registerRule({
      id: 'security.sql-injection',
      name: 'SQL Injection Risk',
      category: 'security',
      severity: 'critical',
      enabled: true,
      evaluate: (_parseResult, filePath, content) => {
        const issues: Issue[] = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Detect unparameterized SQL queries
          if (
            /SELECT|INSERT|UPDATE|DELETE/i.test(line) &&
            /\$\{|\+\s*\w+|`.*\$\{/.test(line) &&
            !/\.query\(|\.execute\(|prepareStatement/i.test(line)
          ) {
            issues.push({
              ruleId: 'security.sql-injection',
              severity: 'critical',
              file: filePath,
              line: index + 1,
              message: 'Potential SQL injection vulnerability: unparameterized query detected',
              fix: 'Use parameterized queries: db.query(\'SELECT * FROM users WHERE id = $1\', [userId])',
              confidence: 0.9,
            });
          }
        });

        return issues;
      },
    });

    // Secrets Detection
    this.registerRule({
      id: 'security.secrets',
      name: 'Secrets in Code',
      category: 'security',
      severity: 'critical',
      enabled: true,
      evaluate: (_parseResult, filePath, content) => {
        const issues: Issue[] = [];
        const lines = content.split('\n');

        // Common secret patterns
        const secretPatterns = [
          /api[_-]?key\s*[:=]\s*['"]([^'"]{20,})['"]/i,
          /secret\s*[:=]\s*['"]([^'"]{20,})['"]/i,
          /password\s*[:=]\s*['"]([^'"]{8,})['"]/i,
          /token\s*[:=]\s*['"]([^'"]{20,})['"]/i,
          /sk_live_[a-zA-Z0-9]{32,}/,
          /AKIA[0-9A-Z]{16}/,
        ];

        lines.forEach((line, index) => {
          secretPatterns.forEach((pattern) => {
            if (pattern.test(line) && !line.includes('process.env') && !line.includes('import')) {
              issues.push({
                ruleId: 'security.secrets',
                severity: 'critical',
                file: filePath,
                line: index + 1,
                message: 'Potential secret or API key exposed in code',
                fix: 'Move secrets to environment variables: process.env.SECRET_KEY',
                confidence: 0.8,
              });
            }
          });
        });

        return issues;
      },
    });

    // High Complexity Detection
    this.registerRule({
      id: 'quality.high-complexity',
      name: 'High Cyclomatic Complexity',
      category: 'quality',
      severity: 'high',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];

        parseResult.functions.forEach((func) => {
          // Count decision points (if, for, while, switch, catch, &&, ||, ?)
          const funcContent = this.getFunctionContent(content, func);
          const complexity = this.calculateComplexity(funcContent);

          if (complexity > 15) {
            issues.push({
              ruleId: 'quality.high-complexity',
              severity: 'high',
              file: filePath,
              line: func.line,
              message: `Function '${func.name}' has high cyclomatic complexity (${complexity})`,
              fix: 'Break down into smaller functions with single responsibility',
              confidence: 0.9,
            });
          }
        });

        return issues;
      },
    });

    // Missing Error Handling
    this.registerRule({
      id: 'quality.missing-error-handling',
      name: 'Missing Error Handling',
      category: 'quality',
      severity: 'high',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];

        parseResult.functions.forEach((func) => {
          const funcContent = this.getFunctionContent(content, func);

          // Check for async functions without try/catch
          if (func.isAsync && !/try\s*\{/.test(funcContent) && /await|Promise/.test(funcContent)) {
            issues.push({
              ruleId: 'quality.missing-error-handling',
              severity: 'high',
              file: filePath,
              line: func.line,
              message: `Async function '${func.name}' lacks error handling`,
              fix: 'Wrap async operations in try/catch blocks',
              confidence: 0.7,
            });
          }
        });

        return issues;
      },
    });

    // AI Hallucination Detection (pattern-based)
    this.registerRule({
      id: 'ai.hallucination',
      name: 'AI Hallucination Risk',
      category: 'ai',
      severity: 'high',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];

        // Detect common AI hallucination patterns
        // 1. Non-existent API calls
        parseResult.functions.forEach((func) => {
          const funcContent = this.getFunctionContent(content, func);

          // Check for calls to APIs that don't exist in imports
          const apiCalls = funcContent.match(/(\w+)\.(get|post|put|delete|patch)\(/g) || [];
          apiCalls.forEach((call) => {
            const match = call.match(/(\w+)\./);
            if (match) {
              const apiName = match[1];
              const hasImport = parseResult.imports.some(
                (imp) => imp.specifiers.includes(apiName) || imp.source.includes(apiName)
              );

              if (!hasImport && !['fetch', 'axios', 'request'].includes(apiName)) {
                issues.push({
                  ruleId: 'ai.hallucination',
                  severity: 'high',
                  file: filePath,
                  line: func.line,
                  message: `Potential AI hallucination: '${apiName}' API call not found in imports`,
                  fix: 'Verify API exists and add proper import statement',
                  confidence: 0.6,
                });
              }
            }
          });
        });

        return issues;
      },
    });

    // FOUNDER-SPECIFIC RULES (based on real pain events)

    // Edge Runtime Compatibility Check
    this.registerRule({
      id: 'founder.edge-runtime',
      name: 'Edge Runtime Compatibility',
      category: 'ai',
      severity: 'critical',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];

        // Check if this is middleware or Edge runtime code
        const isEdgeCode = filePath.includes('middleware') || 
                          filePath.includes('edge-') ||
                          content.includes('export const runtime = \'edge\'') ||
                          content.includes('export const config = { runtime: \'edge\' }');

        if (!isEdgeCode) {
          return issues; // Skip if not Edge code
        }

        // Node-only modules that break Edge runtime
        const nodeOnlyModules = [
          'fs', 'path', 'crypto', 'stream', 'util', 'os', 'http', 'https',
          '@prisma/client', 'prisma', 'redis', 'pino', 'ioredis',
          'rate-limiter-flexible', 'bull', 'kue'
        ];

        parseResult.imports.forEach((imp) => {
          const importSource = imp.source;
          
          // Check for Node-only modules
          nodeOnlyModules.forEach((module) => {
            if (importSource.includes(module)) {
              issues.push({
                ruleId: 'founder.edge-runtime',
                severity: 'critical',
                file: filePath,
                line: imp.line,
                message: `Edge runtime incompatible: '${module}' is Node-only and will crash at runtime`,
                fix: `Remove import of '${module}' or move this code to Node.js runtime (export const runtime = 'nodejs')`,
                confidence: 0.95,
              });
            }
          });

          // Check for relative imports that might transitively import Node modules
          if (importSource.startsWith('.') || importSource.startsWith('..')) {
            // This would require transitive analysis - flag for manual review
            if (importSource.includes('prisma') || 
                importSource.includes('redis') || 
                importSource.includes('rate-limit') ||
                importSource.includes('logging') && !importSource.includes('edge-')) {
              issues.push({
                ruleId: 'founder.edge-runtime',
                severity: 'high',
                file: filePath,
                line: imp.line,
                message: `Potential Edge runtime issue: Import '${importSource}' may transitively import Node-only modules`,
                fix: 'Verify this import chain is Edge-safe or use edge-safe alternatives',
                confidence: 0.7,
              });
            }
          }
        });

        return issues;
      },
    });

    // Type Safety Erosion Detection
    this.registerRule({
      id: 'founder.type-erosion',
      name: 'Type Safety Erosion',
      category: 'ai',
      severity: 'high',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          const lineNum = index + 1;

          // Detect unnecessary 'any' types
          if (/\b:\s*any\b/.test(line) && !line.includes('// @ts-ignore') && !line.includes('// eslint-disable')) {
            // Allow in specific contexts (type definitions, generics)
            if (!line.includes('Record<') && !line.includes('Map<') && !line.includes('Set<')) {
              issues.push({
                ruleId: 'founder.type-erosion',
                severity: 'high',
                file: filePath,
                line: lineNum,
                message: `Type safety erosion: Unnecessary 'any' type detected`,
                fix: 'Replace with proper type or use `unknown` if type is truly unknown',
                confidence: 0.8,
              });
            }
          }

          // Detect type assertions that might hide problems
          if (/\bas\s+any\b/.test(line)) {
            issues.push({
              ruleId: 'founder.type-erosion',
              severity: 'high',
              file: filePath,
              line: lineNum,
              message: `Type safety erosion: 'as any' assertion hides type errors`,
              fix: 'Fix the underlying type issue instead of using type assertion',
              confidence: 0.9,
            });
          }

          // Detect loose object types
          if (/\b:\s*\{\s*\[key:\s*string\]:\s*any\s*\}\b/.test(line)) {
            issues.push({
              ruleId: 'founder.type-erosion',
              severity: 'medium',
              file: filePath,
              line: lineNum,
              message: `Type safety erosion: Loose object type with string index signature`,
              fix: 'Use Record<string, SpecificType> or define proper interface',
              confidence: 0.7,
            });
          }
        });

        return issues;
      },
    });

    // Unused Imports Detection
    this.registerRule({
      id: 'founder.unused-imports',
      name: 'Unused Imports',
      category: 'quality',
      severity: 'medium',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];

        parseResult.imports.forEach((imp) => {
          // Check if imported symbols are actually used
          imp.specifiers.forEach((specifier) => {
            // Skip default imports and namespace imports
            if (specifier === 'default' || specifier === '*') {
              return;
            }

            // Check if specifier is used in code
            const usagePattern = new RegExp(`\\b${specifier}\\b`);
            const isUsed = usagePattern.test(content);

            if (!isUsed && specifier.length > 0) {
              issues.push({
                ruleId: 'founder.unused-imports',
                severity: 'medium',
                file: filePath,
                line: imp.line,
                message: `Unused import: '${specifier}' is imported but never used`,
                fix: `Remove '${specifier}' from import statement`,
                confidence: 0.85,
              });
            }
          });

          // Check default imports
          if (imp.specifiers.includes('default')) {
            const defaultName = imp.source.split('/').pop()?.replace(/['"]/g, '') || '';
            // This is heuristic - would need better analysis
            const defaultUsagePattern = new RegExp(`\\b${defaultName}\\b|import\\s+${defaultName}`);
            if (!defaultUsagePattern.test(content) && defaultName.length > 0) {
              issues.push({
                ruleId: 'founder.unused-imports',
                severity: 'medium',
                file: filePath,
                line: imp.line,
                message: `Potentially unused default import from '${imp.source}'`,
                fix: 'Verify this import is actually used, remove if not',
                confidence: 0.6,
              });
            }
          }
        });

        return issues;
      },
    });

    // Auth Pattern Detection
    this.registerRule({
      id: 'founder.auth-patterns',
      name: 'Auth Pattern Detection',
      category: 'security',
      severity: 'critical',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];
        const lines = content.split('\n');

        // Check for common auth anti-patterns
        lines.forEach((line, index) => {
          const lineNum = index + 1;

          // Pattern 1: userId from request body (should be from auth)
          if (/userId.*=.*(?:req\.body|body\.|request\.body|params\.body)/i.test(line) &&
              !line.includes('getAuthenticatedUser') &&
              !line.includes('requireAuth') &&
              !line.includes('// TODO') &&
              !line.includes('// FIXME')) {
            issues.push({
              ruleId: 'founder.auth-patterns',
              severity: 'critical',
              file: filePath,
              line: lineNum,
              message: `CRITICAL: userId taken from request body - allows impersonation`,
              fix: 'Use authenticated user ID from requireAuth() or getAuthenticatedUser()',
              confidence: 0.95,
            });
          }

          // Pattern 2: fromUserId/toUserId confusion
          if (/fromUserId.*=.*toUserId/i.test(line) || /toUserId.*=.*fromUserId/i.test(line)) {
            issues.push({
              ruleId: 'founder.auth-patterns',
              severity: 'critical',
              file: filePath,
              line: lineNum,
              message: `CRITICAL: fromUserId/toUserId confusion - potential auth bug`,
              fix: 'Verify user ID assignment is correct',
              confidence: 0.9,
            });
          }

          // Pattern 3: Missing auth check before resource access
          if (/await\s+prisma\.\w+\.(?:find|create|update|delete)/i.test(line) &&
              !content.substring(0, content.indexOf(line)).includes('requireAuth') &&
              !content.substring(0, content.indexOf(line)).includes('getAuthenticatedUser') &&
              filePath.includes('/api/')) {
            // This is heuristic - would need better context analysis
            issues.push({
              ruleId: 'founder.auth-patterns',
              severity: 'high',
              file: filePath,
              line: lineNum,
              message: `Potential missing auth check: Database operation without visible auth check`,
              fix: 'Ensure requireAuth() or getAuthenticatedUser() is called before database operations',
              confidence: 0.6,
            });
          }
        });

        return issues;
      },
    });

    // Error Handling Detection
    this.registerRule({
      id: 'founder.error-handling',
      name: 'Error Handling Completeness',
      category: 'quality',
      severity: 'high',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];

        parseResult.functions.forEach((func) => {
          const funcContent = this.getFunctionContent(content, func);
          const isAsync = func.isAsync;
          const hasAwait = /await\s+/.test(funcContent);
          const hasTryCatch = /try\s*\{/.test(funcContent);

          // Async functions with await should have error handling
          if (isAsync && hasAwait && !hasTryCatch) {
            issues.push({
              ruleId: 'founder.error-handling',
              severity: 'high',
              file: filePath,
              line: func.line,
              message: `Async function '${func.name}' has await but no try/catch error handling`,
              fix: 'Wrap async operations in try/catch blocks',
              confidence: 0.8,
            });
          }

          // Functions that call prisma should have error handling
          if (/prisma\.\w+\.(?:find|create|update|delete|upsert)/.test(funcContent) && !hasTryCatch) {
            issues.push({
              ruleId: 'founder.error-handling',
              severity: 'high',
              file: filePath,
              line: func.line,
              message: `Function '${func.name}' calls Prisma without error handling`,
              fix: 'Wrap database operations in try/catch blocks',
              confidence: 0.75,
            });
          }
        });

        return issues;
      },
    });

    // Large Refactor Detection (overconfident AI changes)
    this.registerRule({
      id: 'founder.large-refactor',
      name: 'Large Refactor Flag',
      category: 'ai',
      severity: 'medium',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];

        // This rule works best with diff context, but we can flag files with many changes
        // In practice, this would be called with diff context from Review Guard
        const functionCount = parseResult.functions.length;
        const lineCount = content.split('\n').length;

        // Flag files with many functions as potentially risky refactors
        if (functionCount > 20 && lineCount > 500) {
          issues.push({
            ruleId: 'founder.large-refactor',
            severity: 'medium',
            file: filePath,
            line: 1,
            message: `Large file detected (${functionCount} functions, ${lineCount} lines) - ensure refactor doesn't break edge cases`,
            fix: 'Review diff carefully, test edge cases, consider breaking into smaller changes',
            confidence: 0.5,
          });
        }

        return issues;
      },
    });

    // ============================================================================
    // PERSONA-SPECIFIC RULES
    // ============================================================================

    // ENTERPRISE-CTO: Compliance & Security Rules

    // Compliance Pattern Detection (SOC2, HIPAA, GDPR)
    this.registerRule({
      id: 'enterprise.compliance',
      name: 'Compliance Pattern Detection',
      category: 'security',
      severity: 'critical',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          const lineNum = index + 1;

          // Detect PII handling without encryption
          if (/(?:ssn|social.?security|credit.?card|password|email|phone)/i.test(line) &&
              /(?:log|console|print|store|save)/i.test(line) &&
              !/(?:encrypt|hash|bcrypt|scrypt|argon2)/i.test(line)) {
            issues.push({
              ruleId: 'enterprise.compliance',
              severity: 'critical',
              file: filePath,
              line: lineNum,
              message: `CRITICAL: PII handling detected without encryption - violates GDPR/HIPAA`,
              fix: 'Encrypt PII before logging/storing, use hashing for passwords',
              confidence: 0.85,
            });
          }

          // Detect hardcoded secrets (compliance violation)
          if (/(?:api.?key|secret|token|password)\s*[:=]\s*['"]([^'"]{10,})['"]/i.test(line) &&
              !line.includes('process.env') &&
              !line.includes('// TODO')) {
            issues.push({
              ruleId: 'enterprise.compliance',
              severity: 'critical',
              file: filePath,
              line: lineNum,
              message: `CRITICAL: Hardcoded secret detected - violates SOC2 compliance`,
              fix: 'Move secrets to environment variables or secret management system',
              confidence: 0.9,
            });
          }

          // Detect missing audit logging for sensitive operations
          if (/(?:delete|update|modify|change).*(?:user|account|data|record)/i.test(line) &&
              !/(?:log|audit|track)/i.test(content.substring(Math.max(0, index - 10), index + 10))) {
            issues.push({
              ruleId: 'enterprise.compliance',
              severity: 'high',
              file: filePath,
              line: lineNum,
              message: `Missing audit logging for sensitive operation - required for SOC2 compliance`,
              fix: 'Add audit logging for all data modification operations',
              confidence: 0.7,
            });
          }
        });

        return issues;
      },
    });

    // Team Consistency Enforcement
    this.registerRule({
      id: 'enterprise.consistency',
      name: 'Team Consistency Enforcement',
      category: 'quality',
      severity: 'medium',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];

        // Check for inconsistent naming patterns
        const functions = parseResult.functions;
        const namingPatterns = new Set<string>();

        functions.forEach(func => {
          const pattern = func.name.match(/^(get|set|create|update|delete|fetch|load)/i)?.[1]?.toLowerCase();
          if (pattern) {
            namingPatterns.add(pattern);
          }
        });

        // If multiple naming patterns exist, flag for consistency
        if (namingPatterns.size > 3 && functions.length > 5) {
          issues.push({
            ruleId: 'enterprise.consistency',
            severity: 'medium',
            file: filePath,
            line: 1,
            message: `Inconsistent naming patterns detected (${Array.from(namingPatterns).join(', ')}) - may indicate team inconsistency`,
            fix: 'Standardize naming patterns across team (e.g., use get/fetch consistently)',
            confidence: 0.6,
          });
        }

        return issues;
      },
    });

    // JUNIOR-DEVELOPER: Learning & Mentorship Rules

    // Best Practice Guidance
    this.registerRule({
      id: 'junior.best-practices',
      name: 'Best Practice Guidance',
      category: 'quality',
      severity: 'medium',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          const lineNum = index + 1;

          // Detect console.log in production code
          if (/console\.(log|debug|info)/.test(line) && !line.includes('// TODO') && !filePath.includes('.test.')) {
            issues.push({
              ruleId: 'junior.best-practices',
              severity: 'low',
              file: filePath,
              line: lineNum,
              message: `Consider using proper logging instead of console.log for production code`,
              fix: 'Use a logging library (e.g., pino, winston) instead of console.log',
              confidence: 0.7,
            });
          }

          // Detect magic numbers
          if (/\b\d{3,}\b/.test(line) && !/(?:id|timestamp|date|year|month|day)/i.test(line)) {
            issues.push({
              ruleId: 'junior.best-practices',
              severity: 'low',
              file: filePath,
              line: lineNum,
              message: `Magic number detected - consider using a named constant for clarity`,
              fix: 'Extract magic numbers to named constants (e.g., const MAX_RETRIES = 3)',
              confidence: 0.6,
            });
          }

          // Detect nested ternaries (hard to read)
          if ((line.match(/\?/g) || []).length > 1) {
            issues.push({
              ruleId: 'junior.best-practices',
              severity: 'low',
              file: filePath,
              line: lineNum,
              message: `Nested ternary detected - consider using if/else for better readability`,
              fix: 'Use if/else statements instead of nested ternaries for clarity',
              confidence: 0.7,
            });
          }
        });

        return issues;
      },
    });

    // Pre-Review Validation
    this.registerRule({
      id: 'junior.pre-review',
      name: 'Pre-Review Validation',
      category: 'quality',
      severity: 'high',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];

        // Check for common code review rejection patterns
        const hasTests = filePath.includes('.test.') || filePath.includes('.spec.');
        const hasFunctions = parseResult.functions.length > 0;

        if (hasFunctions && !hasTests && filePath.match(/\.(ts|tsx|js|jsx)$/) && !filePath.includes('index.')) {
          issues.push({
            ruleId: 'junior.pre-review',
            severity: 'medium',
            file: filePath,
            line: 1,
            message: `No test file found - PR may be rejected for missing tests`,
            fix: 'Add test file before submitting PR',
            confidence: 0.8,
          });
        }

        // Check for TODO/FIXME comments
        const todoMatches = content.match(/(?:TODO|FIXME|XXX|HACK):\s*(.+)/gi);
        if (todoMatches && todoMatches.length > 0) {
          issues.push({
            ruleId: 'junior.pre-review',
            severity: 'low',
            file: filePath,
            line: 1,
            message: `${todoMatches.length} TODO/FIXME comment(s) found - consider addressing before PR`,
            fix: 'Address TODO/FIXME comments or remove them',
            confidence: 0.7,
          });
        }

        return issues;
      },
    });

    // OPEN-SOURCE-MAINTAINER: Community & Reputation Rules

    // Breaking Change Detection
    this.registerRule({
      id: 'opensource.breaking-change',
      name: 'Breaking Change Detection',
      category: 'quality',
      severity: 'critical',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          const lineNum = index + 1;

          // Detect function signature changes (potential breaking change)
          if (/export\s+(?:async\s+)?function\s+(\w+)/.test(line)) {
            const funcName = line.match(/export\s+(?:async\s+)?function\s+(\w+)/)?.[1];
            if (funcName && parseResult.functions.some(f => f.name === funcName)) {
              const func = parseResult.functions.find(f => f.name === funcName);
              // Check if parameters changed (would need diff context for full validation)
              // This is a simplified check
            }
          }

          // Detect removal of exported functions
          if (/\/\/\s*(?:removed|deleted|deprecated)\s+export/i.test(line)) {
            issues.push({
              ruleId: 'opensource.breaking-change',
              severity: 'critical',
              file: filePath,
              line: lineNum,
              message: `CRITICAL: Exported function removed - this is a breaking change`,
              fix: 'Follow semantic versioning: major version bump required, add deprecation notice first',
              confidence: 0.9,
            });
          }
        });

        return issues;
      },
    });

    // License Compatibility Check
    this.registerRule({
      id: 'opensource.license',
      name: 'License Compatibility Check',
      category: 'legal',
      severity: 'critical',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];

        // Check imports for known license-incompatible packages
        const gplPackages = ['some-gpl-package']; // Would be populated from license database
        parseResult.imports.forEach(imp => {
          gplPackages.forEach(pkg => {
            if (imp.source.includes(pkg)) {
              issues.push({
                ruleId: 'opensource.license',
                severity: 'critical',
                file: filePath,
                line: imp.line,
                message: `CRITICAL: GPL-licensed package detected - incompatible with MIT/Apache licenses`,
                fix: 'Replace with MIT/Apache-licensed alternative or consult legal',
                confidence: 0.95,
              });
            }
          });
        });

        return issues;
      },
    });

    // AGENCY-FREELANCER: Client Relationship Rules

    // Client Codebase Consistency
    this.registerRule({
      id: 'agency.consistency',
      name: 'Client Codebase Consistency',
      category: 'quality',
      severity: 'high',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];

        // Check for inconsistent patterns (would need codebase context for full validation)
        // This is a simplified check for common inconsistencies

        const functions = parseResult.functions;
        const asyncFunctions = functions.filter(f => f.isAsync);
        const syncFunctions = functions.filter(f => !f.isAsync);

        // Flag if mixing async/await with callbacks
        const hasCallbacks = /\.then\(|\.catch\(|callback\(/i.test(content);
        const hasAsyncAwait = /await\s+/.test(content);

        if (hasCallbacks && hasAsyncAwait && functions.length > 3) {
          issues.push({
            ruleId: 'agency.consistency',
            severity: 'medium',
            file: filePath,
            line: 1,
            message: `Inconsistent async patterns detected - mixing callbacks with async/await`,
            fix: 'Use consistent async pattern throughout (prefer async/await)',
            confidence: 0.7,
          });
        }

        return issues;
      },
    });

    // Requirement Validation (simplified)
    this.registerRule({
      id: 'agency.requirements',
      name: 'Requirement Validation',
      category: 'quality',
      severity: 'high',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];

        // Check for incomplete implementations
        const incompletePatterns = [
          /\/\/\s*(?:TODO|FIXME|XXX).*implement/i,
          /throw\s+new\s+Error\(['"]Not\s+implemented/i,
          /return\s+null\s*;?\s*\/\/\s*(?:TODO|temporary)/i,
        ];

        incompletePatterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            issues.push({
              ruleId: 'agency.requirements',
              severity: 'high',
              file: filePath,
              line: 1,
              message: `Incomplete implementation detected - may not meet client requirements`,
              fix: 'Complete implementation before delivery',
              confidence: 0.8,
            });
          }
        });

        return issues;
      },
    });

    // STARTUP-CTO: Scaling & Stability Rules

    // Production Stability Check
    this.registerRule({
      id: 'startup.stability',
      name: 'Production Stability Check',
      category: 'quality',
      severity: 'critical',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          const lineNum = index + 1;

          // Detect unhandled promise rejections
          if (/await\s+\w+\(/i.test(line) && !/try\s*\{/.test(content.substring(Math.max(0, index - 5), index + 5))) {
            const func = parseResult.functions.find(f => Math.abs(f.line - lineNum) < 5);
            if (func && func.isAsync) {
              const funcContent = this.getFunctionContent(content, func);
              if (/await\s+/.test(funcContent) && !/try\s*\{/.test(funcContent)) {
                issues.push({
                  ruleId: 'startup.stability',
                  severity: 'critical',
                  file: filePath,
                  line: lineNum,
                  message: `CRITICAL: Unhandled promise rejection - will crash production`,
                  fix: 'Wrap async operations in try/catch blocks',
                  confidence: 0.9,
                });
              }
            }
          }

          // Detect missing error boundaries
          if (/export\s+(?:default\s+)?function/i.test(line) && filePath.includes('page.') || filePath.includes('layout.')) {
            // React/Next.js error boundary check (simplified)
            if (!content.includes('error') && !content.includes('ErrorBoundary')) {
              // Would need more context for full validation
            }
          }
        });

        return issues;
      },
    });

    // Scaling Readiness Check
    this.registerRule({
      id: 'startup.scaling',
      name: 'Scaling Readiness Check',
      category: 'performance',
      severity: 'high',
      enabled: true,
      evaluate: (parseResult, filePath, content) => {
        const issues: Issue[] = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          const lineNum = index + 1;

          // Detect N+1 query patterns
          if (/await\s+prisma\.\w+\.findMany/i.test(line)) {
            const nextLines = lines.slice(index + 1, index + 10).join('\n');
            if (/await\s+prisma\.\w+\.findUnique/i.test(nextLines) || /await\s+prisma\.\w+\.findFirst/i.test(nextLines)) {
              issues.push({
                ruleId: 'startup.scaling',
                severity: 'high',
                file: filePath,
                line: lineNum,
                message: `Potential N+1 query pattern detected - will not scale`,
                fix: 'Use Prisma include/select to fetch related data in single query',
                confidence: 0.7,
              });
            }
          }

          // Detect synchronous operations in async context
          if (/await\s+.*\.(?:readFileSync|writeFileSync|execSync)/i.test(line)) {
            issues.push({
              ruleId: 'startup.scaling',
              severity: 'high',
              file: filePath,
              line: lineNum,
              message: `Synchronous file operation detected - blocks event loop, won't scale`,
              fix: 'Use async file operations (fs.promises or async alternatives)',
              confidence: 0.9,
            });
          }
        });

        return issues;
      },
    });
  }

  /**
   * Get function content from file
   */
  private getFunctionContent(content: string, func: any): string {
    const lines = content.split('\n');
    const startLine = func.line - 1;
    
    // Try to get function body by finding matching braces
    let braceCount = 0;
    let inFunction = false;
    let endLine = startLine;
    
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      
      if (openBraces > 0) {
        inFunction = true;
        braceCount += openBraces;
      }
      if (closeBraces > 0) {
        braceCount -= closeBraces;
        if (inFunction && braceCount === 0) {
          endLine = i;
          break;
        }
      }
    }
    
    // Return function body (or at least the function line if parsing fails)
    return lines.slice(startLine, endLine + 1).join('\n') || lines[startLine] || '';
  }

  /**
   * Calculate cyclomatic complexity
   */
  private calculateComplexity(content: string): number {
    let complexity = 1; // Base complexity

    // Count decision points
    const patterns = [
      /\bif\s*\(/g,
      /\belse\s*if\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bswitch\s*\(/g,
      /\bcatch\s*\(/g,
      /&&/g,
      /\|\|/g,
      /\?/g,
    ];

    patterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }
}

export const staticAnalysisService = new StaticAnalysisService();
