/**
 * AI-Touched Code Heuristic & AST Detection Engine
 * 
 * Analyzes codebases for markers of AI-generated or AI-modified code:
 * - Characteristic hallucinated / phantom package imports
 * - AI comment signatures and unnatural comment density shifts
 * - Repetitive boilerplate and excessive defensive guard statements
 * - LLM placeholder remnants (e.g. YOUR_API_KEY_HERE)
 */

import { ParseResult } from '../code-parser';
import { Issue } from './index';

export interface AiDetectionSignal {
  type: 'hallucinated_import' | 'comment_signature' | 'repetition_pattern' | 'defensive_boilerplate' | 'placeholder_remnant';
  severity: 'critical' | 'high' | 'medium' | 'low';
  line: number;
  message: string;
  detail?: string;
  confidence: number;
}

export interface AiDetectionResult {
  isAiTouched: boolean;
  aiLikelihoodScore: number; // 0.0 - 1.0
  signals: AiDetectionSignal[];
  issues: Issue[];
}

// Known hallucinated / non-existent / outdated LLM-hallucinated library paths
const SUSPICIOUS_IMPORT_PATTERNS: Array<{ regex: RegExp; message: string }> = [
  { regex: /^['"]lodash-uuid['"]/, message: 'Import of phantom package "lodash-uuid" commonly hallucinated by LLMs' },
  { regex: /^['"]react-router-v6['"]/, message: 'Import of phantom package "react-router-v6"; should be "react-router-dom"' },
  { regex: /^['"]next-auth\/client\/v4['"]/, message: 'Hallucinated legacy subpath "next-auth/client/v4"' },
  { regex: /^['"]crypto-js\/sha256-fix['"]/, message: 'Non-standard package subpath "crypto-js/sha256-fix"' },
  { regex: /^['"]axios-mock-adapter-v2['"]/, message: 'Phantom package "axios-mock-adapter-v2"' },
  { regex: /^['"]node:(?:file|sys|json|helpers)['"]/, message: 'Hallucinated Node.js internal core module' },
  { regex: /^['"]@types\/bcrypt-nodejs['"]/, message: 'Obsolete/phantom types package "@types/bcrypt-nodejs"' },
  { regex: /^['"]zod-to-json-schema\/v4['"]/, message: 'Phantom version subpath "zod-to-json-schema/v4"' },
];

// Typical LLM instructional comment signatures
const AI_COMMENT_PATTERNS: Array<{ regex: RegExp; message: string; weight: number }> = [
  { regex: /^\s*\/\/\s*(?:Helper function to|Helper method to|Utility function to)\s+/i, message: 'LLM boilerplate function explanation comment', weight: 0.15 },
  { regex: /^\s*\/\/\s*(?:Ensure that|Make sure that|Verify that|Double-check that)\s+/i, message: 'Instructional assertion comment common in LLM generations', weight: 0.12 },
  { regex: /^\s*\/\/\s*(?:Loop through (?:all|the|each)|Iterate through)\s+/i, message: 'Verbose self-explanatory loop comment typical of LLM output', weight: 0.15 },
  { regex: /^\s*\/\/\s*(?:Handle error appropriately|Gracefully handle error|Log the error and rethrow)\s+/i, message: 'Generic error boilerplate comment', weight: 0.15 },
  { regex: /^\s*\/\/\s*(?:Return the (?:result|response|data|value))\s*$/i, message: 'Redundant self-explanatory return comment', weight: 0.12 },
  { regex: /^\s*\/\/\s*Step \d+:\s+/i, message: 'Step-by-step chain-of-thought commentary in production code', weight: 0.18 },
];

// Placeholder remnants left by LLM templates
const PLACEHOLDER_PATTERNS: Array<{ regex: RegExp; message: string }> = [
  { regex: /(?:YOUR|INSERT|REPLACE_WITH)_[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|ID|URL)/i, message: 'LLM placeholder token remnant left unpopulated' },
  { regex: /<insert[_-](?:api[_-]key|token|secret|url|here)>/i, message: 'LLM angle-bracket template placeholder left in code' },
  { regex: /"your[_-](?:api[_-]key|secret|token|account[_-]id)[_-]here"/i, message: 'LLM sample string literal left unpopulated' },
];

export class AiCodeDetector {
  /**
   * Run full AI-touched heuristic and AST analysis on file
   */
  detect(parseResult: ParseResult, filePath: string, content: string): AiDetectionResult {
    const lines = content.split('\n');
    const signals: AiDetectionSignal[] = [];
    const issues: Issue[] = [];

    // 1. AST Import Analysis (and fallback line regex)
    this.checkSuspiciousImports(parseResult, lines, filePath, signals, issues);

    // 2. Comment Signatures & Comment-to-Code Density Shifts
    this.checkCommentSignaturesAndDensity(lines, filePath, signals, issues);

    // 3. Placeholder Remnants
    this.checkPlaceholderRemnants(lines, filePath, signals, issues);

    // 4. Repetition & Defensive Boilerplate
    this.checkDefensiveBoilerplate(lines, filePath, signals, issues);

    // Calculate aggregated likelihood score
    let score = 0;
    for (const signal of signals) {
      if (signal.severity === 'critical') score += 0.40;
      else if (signal.severity === 'high') score += 0.25;
      else if (signal.severity === 'medium') score += 0.15;
      else score += 0.08;
    }
    const aiLikelihoodScore = Math.min(1.0, Math.round(score * 100) / 100);
    const isAiTouched = aiLikelihoodScore >= 0.45;

    if (isAiTouched) {
      issues.push({
        ruleId: 'ai.heightened-scrutiny',
        severity: aiLikelihoodScore >= 0.75 ? 'critical' : 'high',
        file: filePath,
        line: signals[0]?.line || 1,
        message: `High confidence AI-touched code detected (likelihood: ${Math.round(aiLikelihoodScore * 100)}%). Heightened scrutiny recommended.`,
        fix: 'Review logic carefully, verify library imports, and validate test coverage.',
        confidence: aiLikelihoodScore,
      });
    }

    return {
      isAiTouched,
      aiLikelihoodScore,
      signals,
      issues,
    };
  }

  private checkSuspiciousImports(
    parseResult: ParseResult,
    lines: string[],
    filePath: string,
    signals: AiDetectionSignal[],
    issues: Issue[]
  ): void {
    // Check parsed imports
    if (parseResult.imports && Array.isArray(parseResult.imports)) {
      for (const imp of parseResult.imports) {
        for (const pattern of SUSPICIOUS_IMPORT_PATTERNS) {
          if (pattern.regex.test(`"${imp.source}"`) || pattern.regex.test(`'${imp.source}'`)) {
            const signal: AiDetectionSignal = {
              type: 'hallucinated_import',
              severity: 'high',
              line: imp.line,
              message: pattern.message,
              detail: `Import: ${imp.source}`,
              confidence: 0.90,
            };
            signals.push(signal);
            issues.push({
              ruleId: 'ai.hallucinated-imports',
              severity: 'high',
              file: filePath,
              line: imp.line,
              message: pattern.message,
              fix: `Verify whether "${imp.source}" is an actual installed dependency.`,
              confidence: 0.90,
            });
          }
        }
      }
    }

    // Line regex fallback for non-parsed or raw import strings
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (/^\s*(?:import\s+.*from|const\s+.*=\s*require\()/i.test(line)) {
        for (const pattern of SUSPICIOUS_IMPORT_PATTERNS) {
          const match = line.match(pattern.regex);
          if (match) {
            // Avoid duplicate if already caught via AST
            if (!signals.some(s => s.line === lineNum && s.type === 'hallucinated_import')) {
              signals.push({
                type: 'hallucinated_import',
                severity: 'high',
                line: lineNum,
                message: pattern.message,
                detail: line.trim(),
                confidence: 0.88,
              });
              issues.push({
                ruleId: 'ai.hallucinated-imports',
                severity: 'high',
                file: filePath,
                line: lineNum,
                message: pattern.message,
                fix: `Verify whether package exists in package.json`,
                confidence: 0.88,
              });
            }
          }
        }
      }
    });
  }

  private checkCommentSignaturesAndDensity(
    lines: string[],
    filePath: string,
    signals: AiDetectionSignal[],
    issues: Issue[]
  ): void {
    let commentLineCount = 0;
    let codeLineCount = 0;

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      const lineNum = idx + 1;

      if (!trimmed) return;

      const isComment = trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
      if (isComment) {
        commentLineCount++;

        for (const pattern of AI_COMMENT_PATTERNS) {
          if (pattern.regex.test(trimmed)) {
            signals.push({
              type: 'comment_signature',
              severity: 'medium',
              line: lineNum,
              message: pattern.message,
              detail: trimmed,
              confidence: 0.70,
            });
            issues.push({
              ruleId: 'ai.comment-signatures',
              severity: 'medium',
              file: filePath,
              line: lineNum,
              message: pattern.message,
              fix: 'Remove redundant, non-informational AI commentary',
              confidence: 0.70,
            });
            break;
          }
        }
      } else {
        codeLineCount++;
      }
    });

    // Unnatural comment density ratio shift in concise files (> 40% comments in small-to-medium files)
    if (codeLineCount >= 10 && commentLineCount / (codeLineCount + commentLineCount) > 0.40) {
      signals.push({
        type: 'comment_signature',
        severity: 'low',
        line: 1,
        message: `High comment-to-code ratio (${Math.round((commentLineCount / (codeLineCount + commentLineCount)) * 100)}%), typical of conversational AI generation.`,
        confidence: 0.60,
      });
    }
  }

  private checkPlaceholderRemnants(
    lines: string[],
    filePath: string,
    signals: AiDetectionSignal[],
    issues: Issue[]
  ): void {
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.regex.test(line)) {
          signals.push({
            type: 'placeholder_remnant',
            severity: 'critical',
            line: lineNum,
            message: pattern.message,
            detail: line.trim(),
            confidence: 0.95,
          });
          issues.push({
            ruleId: 'ai.placeholder-remnant',
            severity: 'critical',
            file: filePath,
            line: lineNum,
            message: pattern.message,
            fix: 'Replace AI boilerplate placeholder with valid configuration or environment variable',
            confidence: 0.95,
          });
          break;
        }
      }
    });
  }

  private checkDefensiveBoilerplate(
    lines: string[],
    filePath: string,
    signals: AiDetectionSignal[],
    issues: Issue[]
  ): void {
    // Detect excessive repetitive null/undefined checks
    let defensiveChecksCount = 0;
    const defensiveRegex = /if\s*\(\s*(?:!\w+|\w+\s*===?\s*(?:null|undefined))\s*\)\s*\{\s*return\b/g;

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (defensiveRegex.test(line)) {
        defensiveChecksCount++;
        if (defensiveChecksCount >= 4) {
          signals.push({
            type: 'defensive_boilerplate',
            severity: 'medium',
            line: lineNum,
            message: 'Cluster of repetitive defensive guard statements characteristic of synthetic code',
            confidence: 0.65,
          });
          issues.push({
            ruleId: 'ai.defensive-boilerplate',
            severity: 'medium',
            file: filePath,
            line: lineNum,
            message: 'Cluster of repetitive defensive guard statements characteristic of synthetic code',
            fix: 'Simplify using optional chaining or schema-level input validation',
            confidence: 0.65,
          });
        }
      }
    });
  }
}

export const aiCodeDetector = new AiCodeDetector();
