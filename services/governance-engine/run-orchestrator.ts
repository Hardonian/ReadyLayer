/**
 * Governance Run Orchestrator
 * 
 * Orchestrates governance runs: single-model and opencode-baseline modes.
 * Executes LLM governance tasks, normalizes outputs, stores results with governance signals.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { llmService } from '@/services/llm';
import { logger } from '@/observability/logging';
import { createHash } from 'crypto';
import type { Finding } from '@/lib/types/review';
import { toJsonValue } from '@/lib/prisma-json';

export interface CreateGovernanceRunInput {
  organizationId: string;
  repositoryId?: string;
  mode: 'single-model' | 'opencode-baseline' | 'variance';
  model?: string; // Default: opencode-baseline-v1
  diff: string;
  intent?: string; // Optional user intent (PR description, commit message)
}

export interface GovernanceRunStatus {
  id: string;
  status: 'created' | 'executing' | 'completed' | 'failed';
  error?: string;
}

export class GovernanceRunOrchestrator {
  /**
   * Create a new governance run
   */
  async createGovernanceRun(input: CreateGovernanceRunInput): Promise<string> {
    try {
      // Validate diff size
      if (input.diff.length === 0) {
        throw new Error('Diff cannot be empty');
      }
      if (input.diff.length > 100000) {
        // 100KB limit
        throw new Error('Diff too large (max 100KB)');
      }

      // Hash diff and intent (never store raw values by default)
      const diffHash = createHash('sha256').update(input.diff).digest('hex');
      const intentHash = input.intent
        ? createHash('sha256').update(input.intent).digest('hex')
        : null;

      const run = await prisma.governanceRun.create({
        data: {
          organizationId: input.organizationId,
          repositoryId: input.repositoryId,
          mode: input.mode,
          model: input.model || 'opencode-baseline-v1',
          modelEpoch: new Date().toISOString(),
          status: 'created',
          diffHash,
          diffSize: input.diff.length,
          intentHash,
          intentSource: input.intent ? 'user-provided' : undefined,
        },
      });

      // Store intent artifact if provided and org allows it
      if (input.intent) {
        const orgConfig = await prisma.dataRetentionPolicy.findUnique({
          where: { organizationId: input.organizationId },
        });

        const allowRaw = orgConfig?.anonymizePII === false; // Inverse: if NOT anonymizing, allow raw

        await prisma.intentArtifact.create({
          data: {
            governanceRunId: run.id,
            intentFingerprint: intentHash!,
            intentSource: 'user-provided',
            rawIntent: allowRaw ? input.intent : null,
            rawIntentAllowed: allowRaw,
          },
        });
      }

      logger.info(
        {
          runId: run.id,
          organizationId: input.organizationId,
          mode: input.mode,
        },
        'Governance run created'
      );

      return run.id;
    } catch (error) {
      logger.error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
          organizationId: input.organizationId,
          mode: input.mode,
        },
        'Failed to create governance run'
      );
      throw error;
    }
  }

  /**
   * Execute a governance run
   */
  async executeGovernanceRun(
    runId: string,
    diff: string,
    intent?: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Update status to executing
      const run = await prisma.governanceRun.findUnique({
        where: { id: runId },
      });

      if (!run) {
        throw new Error(`Governance run ${runId} not found`);
      }

      await prisma.governanceRun.update({
        where: { id: runId },
        data: { status: 'executing' },
      });

      // Prepare governance prompt
      const prompt = this.buildGovernancePrompt(diff, intent);

      // Execute LLM call
      let content: string;
      try {
        const response = await llmService.complete({
          prompt,
          model: run.model,
          organizationId: run.organizationId,
          temperature: 0, // P0: Fully deterministic governance - same inputs = same outputs
          maxTokens: 4000,
        });
        content = response.content;
      } catch (error) {
        // Timeout: return static analysis results
        if (error instanceof Error && error.message.includes('timed out')) {
          logger.warn(
            {
              runId,
              model: run.model,
            },
            'LLM timeout - returning static analysis'
          );

          // Create minimal finding from static analysis
          const staticFindings = this.extractStaticFindings(diff);
          content = JSON.stringify({ findings: staticFindings });
        } else {
          throw error;
        }
      }

      // Parse governance findings from LLM output
      const findings = this.parseGovernanceFindings(content);

      // Calculate governance signals (to be implemented in later tasks)
      const governanceSignals = {
        variance_score: null,
        intent_drift: null,
        confidence_inflation: null,
        temporal_fragility: {
          tag: 'fresh',
          age_days: 0,
        },
        negative_space_gaps: this.detectNegativeSpaceGaps(diff),
        socio_technical_risk: null,
      };

      // Store results
      const executionDuration = Date.now() - startTime;
      await prisma.governanceRunResult.create({
        data: {
          governanceRunId: runId,
          findings: toJsonValue(findings), // JSON type
          varianceScore: null,
          intentDrift: governanceSignals.intent_drift === null ? Prisma.JsonNull : governanceSignals.intent_drift,
          temporalFragility: governanceSignals.temporal_fragility === null ? Prisma.JsonNull : governanceSignals.temporal_fragility,
          negativeSpaceGaps: governanceSignals.negative_space_gaps === null ? Prisma.JsonNull : governanceSignals.negative_space_gaps,
        },
      });

      // Update run status to completed
      await prisma.governanceRun.update({
        where: { id: runId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          executionDurationMs: executionDuration,
        },
      });

      logger.info(
        {
          runId,
          findingsCount: findings.length,
          durationMs: executionDuration,
        },
        'Governance run completed'
      );
    } catch (error) {
      const executionDuration = Date.now() - startTime;

      await prisma.governanceRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          executionDurationMs: executionDuration,
          completedAt: new Date(),
        },
      });

      logger.error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
          runId,
          durationMs: executionDuration,
        },
        'Governance run failed'
      );
    }
  }

  /**
   * Build governance analysis prompt
   */
  private buildGovernancePrompt(diff: string, intent?: string): string {
    const prompt = `You are a code governance analyzer. Analyze the following diff for security, quality, and compliance issues.

Intent (if provided):
${intent || 'None'}

Diff:
\`\`\`
${diff}
\`\`\`

Provide analysis in JSON format with the following structure:
{
  "findings": [
    {
      "id": "unique-id",
      "ruleId": "rule-identifier",
      "title": "Finding title",
      "description": "Detailed description",
      "severity": "critical|high|medium|low",
      "file": "file path",
      "line": 123,
      "confidence": 0.95,
      "remediation": "How to fix this"
    }
  ]
}

Focus on:
1. Security vulnerabilities (injection, auth, crypto)
2. Code quality issues (design, patterns)
3. Missing safeguards (no error handling, no validation)
4. Intent alignment (does the code match the intent?)`;

    return prompt;
  }

  /**
   * Parse governance findings from LLM output
   */
  private parseGovernanceFindings(content: string): Finding[] {
    try {
      // Safe parse LLM response (may be malformed JSON)
      const { extractAndParseJson } = require('@/lib/safe-json') as { extractAndParseJson: <T>(text: string, fallback: T) => T };
      const parsed: unknown = extractAndParseJson<Record<string, unknown>>(content, {});

      if (parsed && typeof parsed === 'object' && 'findings' in parsed) {
        const rawFindings = (parsed as { findings?: unknown }).findings;
        if (Array.isArray(rawFindings)) {
          return rawFindings
            .filter((finding): finding is Record<string, unknown> => typeof finding === 'object' && finding !== null)
            .map((finding) => ({
              id: typeof finding.id === 'string' ? finding.id : `finding-${Math.random()}`,
              ruleId: typeof finding.ruleId === 'string' ? finding.ruleId : 'unknown',
              title: typeof finding.title === 'string' ? finding.title : 'Governance Finding',
              description: typeof finding.description === 'string' ? finding.description : '',
              severity: (typeof finding.severity === 'string' ? finding.severity : 'medium') as 'info' | 'low' | 'medium' | 'high' | 'critical',
              status: 'open' as const,
              file: typeof finding.file === 'string' ? finding.file : undefined,
              line: typeof finding.line === 'number' ? finding.line : undefined,
              confidence: typeof finding.confidence === 'number' ? finding.confidence : 0.5,
              detectedBy: 'ai' as const,
              remediation: typeof finding.remediation === 'string' ? finding.remediation : undefined,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));
        }
      }
    } catch {
      // If JSON parsing fails, return empty
      logger.warn('Failed to parse governance findings from LLM output');
    }

    return [];
  }

  /**
   * Extract findings from static analysis (no LLM)
   */
  private extractStaticFindings(diff: string): Finding[] {
    const findings: Finding[] = [];

    // Simple pattern detection (fallback when LLM unavailable)
    if (diff.includes('eval(') || diff.includes('exec(')) {
      findings.push({
        id: 'static-eval',
        ruleId: 'dangerous-eval',
        title: 'Dangerous function use',
        description: 'Using eval() or exec() is dangerous',
        severity: 'critical',
        status: 'open',
        confidence: 0.9,
        detectedBy: 'policy',
        remediation: 'Avoid eval/exec; use safer alternatives',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (diff.includes('password') && !diff.includes('PASSWORD_ENV')) {
      findings.push({
        id: 'static-password',
        ruleId: 'hardcoded-credential',
        title: 'Possible hardcoded password',
        description: 'Code contains "password" string; verify it is not hardcoded',
        severity: 'high',
        status: 'open',
        confidence: 0.5,
        detectedBy: 'policy',
        remediation: 'Use environment variables for secrets',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return findings;
  }

  /**
   * Detect missing negative-space invariants
   */
  private detectNegativeSpaceGaps(
    diff: string
  ): Array<{ type: string; severity: string; recommendation: string }> {
    const gaps: Array<{ type: string; severity: string; recommendation: string }> = [];

    // Check for missing error handling
    if (diff.includes('fetch(') && !diff.includes('try') && !diff.includes('.catch')) {
      gaps.push({
        type: 'missing-errorbound',
        severity: 'high',
        recommendation: 'Add try-catch or error boundary for fetch calls',
      });
    }

    // Check for missing auth checks on sensitive operations
    if (
      (diff.includes('DELETE') || diff.includes('PUT') || diff.includes('POST')) &&
      !diff.includes('requireAuth') &&
      !diff.includes('authenticated')
    ) {
      gaps.push({
        type: 'missing-auth',
        severity: 'critical',
        recommendation: 'Add authentication check for sensitive operations',
      });
    }

    // Check for missing validation
    if (diff.includes('req.body') && !diff.includes('parse') && !diff.includes('validate')) {
      gaps.push({
        type: 'missing-validation',
        severity: 'high',
        recommendation: 'Add input validation for request body',
      });
    }

    return gaps;
  }

  /**
   * Get governance run status
   */
  async getGovernanceRunStatus(runId: string): Promise<GovernanceRunStatus> {
    try {
      const run = await prisma.governanceRun.findUnique({
        where: { id: runId },
      });

      if (!run) {
        throw new Error(`Governance run ${runId} not found`);
      }

      return {
        id: run.id,
        status: run.status as GovernanceRunStatus['status'],
        error: run.error || undefined,
      };
    } catch (error) {
      logger.error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
          runId,
        },
        'Failed to get governance run status'
      );
      throw error;
    }
  }
}

export const governanceRunOrchestrator = new GovernanceRunOrchestrator();
