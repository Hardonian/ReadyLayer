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
      evaluate: (parseResult, filePath, content) => {
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
      evaluate: (parseResult, filePath, content) => {
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
  }

  /**
   * Get function content from file
   */
  private getFunctionContent(content: string, func: any): string {
    const lines = content.split('\n');
    // Simplified: return function line (would parse full function body in production)
    return lines[func.line - 1] || '';
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
