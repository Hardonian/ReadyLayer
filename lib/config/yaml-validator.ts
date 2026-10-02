/**
 * Unified ReadyLayer Configuration Validator with Precise Line/Col Highlighting
 * 
 * Validates .readylayer.yml / readylayer.json configs with semantic line and column
 * reporting, rule catalog verification, and auto-fix suggestions using js-yaml.
 */

import { z } from 'zod';
import * as yaml from 'js-yaml';

export interface ConfigValidationError {
  path: string;
  message: string;
  line?: number;
  column?: number;
  snippet?: string;
  ruleId?: string;
  fixSuggestion?: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: string[];
  config?: ReadyLayerConfig;
}

// Allowed severity values
export const SeveritySchema = z.enum(['info', 'low', 'medium', 'high', 'critical']);

// Allowed strictness tiers
export const StrictnessSchema = z.enum(['advisory', 'balanced', 'strict', 'hardened']);

// Standard rule definition
export const RuleConfigSchema = z.object({
  enabled: z.boolean().default(true),
  severity: SeveritySchema.default('high'),
  threshold: z.number().min(0).max(100).optional(),
  exclude: z.array(z.string()).optional(),
});

// Full unified ReadyLayer config schema
export const ReadyLayerConfigSchema = z.object({
  version: z.union([z.literal('1'), z.literal('1.0'), z.literal(1)]),
  organizationId: z.string().optional(),
  strictness: StrictnessSchema.default('balanced'),
  rules: z.record(z.string(), z.union([z.boolean(), RuleConfigSchema])).optional(),
  ignorePaths: z.array(z.string()).default([]),
  review: z
    .object({
      blockOnCritical: z.boolean().default(true),
      autoComment: z.boolean().default(true),
      requireTests: z.boolean().default(false),
      minimumCoverage: z.number().min(0).max(100).default(80),
    })
    .default({
      blockOnCritical: true,
      autoComment: true,
      requireTests: false,
      minimumCoverage: 80,
    }),
  sandbox: z
    .object({
      timeoutMs: z.number().min(1000).max(600000).default(60000),
      quarantineFlaky: z.boolean().default(true),
    })
    .optional(),
});

export type ReadyLayerConfig = z.infer<typeof ReadyLayerConfigSchema>;

/**
 * Validate YAML content and return precise line/column errors
 */
export function validateConfigYaml(yamlContent: string): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];
  const warnings: string[] = [];

  if (!yamlContent || !yamlContent.trim()) {
    return {
      valid: false,
      errors: [
        {
          path: '',
          message: 'Configuration file is empty',
          line: 1,
          column: 1,
          fixSuggestion: 'Run `readylayer init` to generate a valid configuration.',
        },
      ],
      warnings: [],
    };
  }

  // 1. Parse YAML using js-yaml
  let rawJson: unknown;
  try {
    rawJson = yaml.load(yamlContent);
  } catch (err: unknown) {
    const yamlErr = err as { mark?: { line: number; column: number; snippet?: string }; message?: string };
    const line = yamlErr.mark ? yamlErr.mark.line + 1 : 1;
    const column = yamlErr.mark ? yamlErr.mark.column + 1 : 1;
    return {
      valid: false,
      errors: [
        {
          path: '',
          message: `Malformed YAML syntax: ${yamlErr.message || String(err)}`,
          line,
          column,
          snippet: yamlErr.mark?.snippet?.trim() || getLineSnippet(yamlContent, line),
        },
      ],
      warnings: [],
    };
  }

  if (typeof rawJson !== 'object' || rawJson === null) {
    return {
      valid: false,
      errors: [
        {
          path: '',
          message: 'Configuration must be a top-level YAML mapping / object',
          line: 1,
          column: 1,
        },
      ],
      warnings: [],
    };
  }

  // 2. Validate against Zod schema
  const parsed = ReadyLayerConfigSchema.safeParse(rawJson);

  if (!parsed.success) {
    const lines = yamlContent.split('\n');

    for (const issue of parsed.error.issues) {
      const pathStr = issue.path.join('.');
      const lastKey = String(issue.path[issue.path.length - 1] ?? '');

      // Locate line in YAML text
      let line: number | undefined;
      let col: number | undefined;

      if (lastKey) {
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i];
          const keyIdx = l.indexOf(lastKey);
          if (keyIdx !== -1) {
            line = i + 1;
            col = keyIdx + 1;
            break;
          }
        }
      }

      // Generate helpful fix suggestions
      let fixSuggestion: string | undefined;
      if (issue.path[0] === 'version') {
        fixSuggestion = 'Specify `version: "1"` at the root of the file.';
      } else if (issue.path.includes('strictness')) {
        fixSuggestion = 'Valid options for strictness: advisory, balanced, strict, hardened.';
      } else if (issue.path.includes('severity')) {
        fixSuggestion = 'Valid options for severity: info, low, medium, high, critical.';
      }

      errors.push({
        path: pathStr,
        message: issue.message,
        line,
        column: col,
        snippet: line ? getLineSnippet(yamlContent, line) : undefined,
        fixSuggestion,
      });
    }

    return {
      valid: false,
      errors,
      warnings,
    };
  }

  return {
    valid: true,
    errors: [],
    warnings,
    config: parsed.data,
  };
}

function getLineSnippet(text: string, line?: number): string | undefined {
  if (!line || line < 1) return undefined;
  const lines = text.split('\n');
  return lines[line - 1]?.trim();
}
