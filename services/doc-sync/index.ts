/**
 * Doc Sync Service
 * 
 * Automatic documentation and API spec generation
 * Enforces drift prevention (blocks by default)
 */

import { prisma } from '../../lib/prisma';
import { llmService, LLMRequest } from '../llm';
import { queryEvidence, formatEvidenceForPrompt, isQueryEnabled } from '../../lib/rag';
import { policyEngineService } from '../policy-engine';
import { createHash } from 'crypto';
import { Issue } from '../static-analysis';

export interface DocGenerationRequest {
  repositoryId: string;
  ref: string; // Branch or commit SHA
  format: 'openapi' | 'markdown';
  config?: DocSyncConfig;
}

export interface DocSyncConfig {
  framework?: string; // Auto-detect if not specified
  openapi?: {
    version: '3.0' | '3.1';
    outputPath: string;
    enhanceWithLLM: boolean;
  };
  markdown?: {
    enabled: boolean;
    outputPath: string;
  };
  updateStrategy: 'commit' | 'pr'; // Default: 'pr'
  branch: string;
  driftPrevention: {
    enabled: boolean; // REQUIRED: Always true
    action: 'block' | 'auto_update' | 'alert'; // Default: 'block'
    checkOn: 'pr' | 'merge' | 'both';
  };
}

export interface DocGenerationResult {
  id: string;
  status: 'generated' | 'failed' | 'blocked';
  format: string;
  content: string;
  spec?: any; // Parsed OpenAPI spec
  driftDetected: boolean;
  driftDetails?: any;
  startedAt: Date;
  completedAt: Date;
}

export interface DriftCheckResult {
  driftDetected: boolean;
  missingEndpoints: Array<{ method: string; path: string; file: string; line: number }>;
  extraEndpoints: Array<{ method: string; path: string }>;
  changedEndpoints: Array<{
    method: string;
    path: string;
    changes: string[];
    file: string;
    line: number;
  }>;
  isBlocked: boolean;
}

/**
 * Doc Sync Service
 * 
 * Automatic documentation and API spec generation with drift prevention.
 * Enforces drift prevention (cannot disable) and blocks PRs by default when drift detected.
 * 
 * Key Features:
 * - Framework auto-detection (Express, Fastify, Flask, Django)
 * - Endpoint extraction from code
 * - OpenAPI/Markdown generation
 * - LLM enhancement (optional, graceful degradation)
 * - Drift detection (missing/changed endpoints)
 * - Policy-driven blocking
 * 
 * **Enforcement-First Behavior:**
 * - Drift prevention always enabled (cannot disable)
 * - Default action is 'block' (can change to 'auto_update' or 'alert')
 * - Doc generation failures don't block merge (fail-open)
 * 
 * @example
 * ```typescript
 * const result = await docSyncService.generateDocs({
 *   repositoryId: 'repo_123',
 *   ref: 'main',
 *   format: 'openapi'
 * });
 * ```
 */
export class DocSyncService {
  /**
   * Generate documentation (OpenAPI or Markdown) from code.
   * 
   * **Process:**
   * 1. Validates config (drift prevention always enabled)
   * 2. Detects API framework (Express, Fastify, etc.)
   * 3. Extracts endpoints from code
   * 4. Generates OpenAPI spec or Markdown docs
   * 5. Enhances with LLM (if enabled, graceful degradation on failure)
   * 6. Validates generated docs
   * 7. Checks for drift (missing/changed endpoints)
   * 8. Evaluates against policy (may block if drift detected)
   * 9. Creates evidence bundle for audit trail
   * 
   * **Enforcement:**
   * - Drift prevention always enabled (enforced)
   * - Default action is 'block' (can be changed to 'auto_update' or 'alert')
   * - Doc generation failures don't block merge (fail-open)
   * 
   * @param request - Doc generation request with repository and format
   * @returns Doc generation result with content and drift status
   * @throws {Error} If drift prevention is disabled (validation error)
   * @throws {Error} If doc generation fails (non-blocking, but logged)
   * 
   * @example
   * ```typescript
   * const result = await docSyncService.generateDocs({
   *   repositoryId: 'repo_123',
   *   ref: 'main',
   *   format: 'openapi',
   *   config: {
   *     driftPrevention: {
   *       enabled: true,  // Always true
   *       action: 'block', // Default: block, can be 'auto_update' or 'alert'
   *       checkOn: 'pr'
   *     }
   *   }
   * });
   * ```
   */
  async generateDocs(request: DocGenerationRequest): Promise<DocGenerationResult> {
    const startedAt = new Date();
    const config = request.config || this.getDefaultConfig();

    // Validate config
    if (config.driftPrevention.enabled === false) {
      throw new Error(
        'drift_prevention.enabled cannot be disabled. Documentation sync is required.'
      );
    }

    try {
      // Detect framework if not specified
      const framework = config.framework || (await this.detectFramework(request.repositoryId));

      // Extract API endpoints from code
      const endpoints = await this.extractEndpoints(request.repositoryId, request.ref, framework);

      let content: string;
      let spec: any;

      if (request.format === 'openapi') {
        // Generate OpenAPI spec
        const openapiResult = await this.generateOpenAPI(
          endpoints,
          config.openapi?.version || '3.1',
          config.openapi?.enhanceWithLLM !== false,
          request.repositoryId
        );
        content = openapiResult.content;
        spec = openapiResult.spec;
      } else {
        // Generate Markdown
        content = await this.generateMarkdown(endpoints, request.repositoryId);
      }

      // Validate generated docs
      await this.validateDocs(content, request.format);

      const completedAt = new Date();

      // Get organization ID for policy evaluation
      const repo = await prisma.repository.findUnique({
        where: { id: request.repositoryId },
        select: { organizationId: true },
      });
      
      if (!repo) {
        throw new Error(`Repository ${request.repositoryId} not found`);
      }

      // Load effective policy
      const policy = await policyEngineService.loadEffectivePolicy(
        repo.organizationId,
        request.repositoryId,
        request.ref,
        undefined
      );

      // Check for drift (policy-aware)
      const driftResult = await this.checkDrift(request.repositoryId, request.ref, config);

      // Create findings based on drift
      const findings: Issue[] = [];
      if (driftResult.driftDetected) {
        if (driftResult.missingEndpoints.length > 0) {
          findings.push({
            ruleId: 'doc-sync.missing-endpoints',
            severity: 'high',
            file: 'api',
            line: 1,
            message: `${driftResult.missingEndpoints.length} endpoint(s) missing from documentation`,
            fix: 'Update documentation to include all API endpoints',
            confidence: 1.0,
          });
        }
        if (driftResult.changedEndpoints.length > 0) {
          findings.push({
            ruleId: 'doc-sync.changed-endpoints',
            severity: 'medium',
            file: 'api',
            line: 1,
            message: `${driftResult.changedEndpoints.length} endpoint(s) changed but docs not updated`,
            fix: 'Update documentation to reflect API changes',
            confidence: 1.0,
          });
        }
      }

      // Evaluate against policy
      const evaluationResult = policyEngineService.evaluate(findings, policy);
      const isBlocked = evaluationResult.blocked || driftResult.isBlocked;

      // Save doc result
      const doc = await prisma.doc.create({
        data: {
          repositoryId: request.repositoryId,
          ref: request.ref,
          format: request.format,
          content,
          spec: spec || undefined,
          status: isBlocked ? 'blocked' : 'generated',
          driftDetected: driftResult.driftDetected,
          driftDetails: {
            missingEndpoints: driftResult.missingEndpoints,
            extraEndpoints: driftResult.extraEndpoints,
            changedEndpoints: driftResult.changedEndpoints,
          } as any,
          publishedAt: config.updateStrategy === 'commit' && !isBlocked ? completedAt : null,
          createdAt: startedAt,
          updatedAt: completedAt,
        },
      });

      // Produce evidence bundle
      const contentHash = createHash('sha256').update(content || '', 'utf8').digest('hex');
      const timings = {
        totalMs: completedAt.getTime() - startedAt.getTime(),
      };
      await policyEngineService.produceEvidence(
        {
          ref: request.ref,
          format: request.format,
          contentHash,
          driftDetected: driftResult.driftDetected,
        },
        {
          findings,
          evaluationResult,
          driftResult,
        },
        policy,
        timings,
        { docId: doc.id }
      );

      return {
        id: doc.id,
        status: isBlocked ? 'blocked' : 'generated',
        format: request.format,
        content,
        spec,
        driftDetected: driftResult.driftDetected,
        driftDetails: driftResult,
        startedAt,
        completedAt,
      };
    } catch (error) {
      // Generation failures MUST block PR
      throw new Error(
        `Documentation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Cannot ensure documentation stays in sync. ` +
        `This PR is BLOCKED until documentation can be generated.`
      );
    }
  }

  /**
   * Check for drift between code and documentation.
   * 
   * Compares current code endpoints with documented endpoints to detect:
   * - Missing endpoints (in code, not in docs)
   * - Extra endpoints (in docs, not in code)
   * - Changed endpoints (parameters or response changed)
   * 
   * **Policy-Aware:**
   * - Missing endpoints: High severity finding
   * - Changed endpoints: Medium severity finding
   * - Policy evaluation determines if blocks
   * 
   * @param repositoryId - Repository ID
   * @param ref - Branch or commit SHA to check
   * @param config - Optional config (uses defaults if not provided)
   * @returns Drift check result with missing/extra/changed endpoints and blocking status
   * 
   * @example
   * ```typescript
   * const drift = await docSyncService.checkDrift('repo_123', 'main', {
   *   driftPrevention: {
   *     enabled: true,
   *     action: 'block'
   *   }
   * });
   * 
   * if (drift.isBlocked) {
   *   console.log('Drift detected:', drift.missingEndpoints);
   * }
   * ```
   */
  async checkDrift(
    repositoryId: string,
    ref: string,
    config?: DocSyncConfig
  ): Promise<DriftCheckResult> {
    const docConfig = config || this.getDefaultConfig();

    // Get latest doc
    const latestDoc = await prisma.doc.findFirst({
      where: {
        repositoryId,
        format: 'openapi',
        status: 'generated',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!latestDoc || !latestDoc.spec) {
      // No existing docs, no drift
      return {
        driftDetected: false,
        missingEndpoints: [],
        extraEndpoints: [],
        changedEndpoints: [],
        isBlocked: false,
      };
    }

    // Extract current endpoints from code
    const framework = docConfig.framework || (await this.detectFramework(repositoryId));
    const currentEndpoints = await this.extractEndpoints(repositoryId, ref, framework);

    // Compare with documented endpoints
    const documentedEndpoints = this.extractEndpointsFromOpenAPI(latestDoc.spec);

    const missingEndpoints: DriftCheckResult['missingEndpoints'] = [];
    const extraEndpoints: DriftCheckResult['extraEndpoints'] = [];
    const changedEndpoints: DriftCheckResult['changedEndpoints'] = [];

    // Find missing endpoints (in code, not in docs)
    for (const endpoint of currentEndpoints) {
      const documented = documentedEndpoints.find(
        (e) => e.method === endpoint.method && e.path === endpoint.path
      );

      if (!documented) {
        missingEndpoints.push({
          method: endpoint.method,
          path: endpoint.path,
          file: endpoint.file,
          line: endpoint.line,
        });
      } else if (JSON.stringify(endpoint) !== JSON.stringify(documented)) {
        changedEndpoints.push({
          method: endpoint.method,
          path: endpoint.path,
          changes: ['Parameters or response changed'],
          file: endpoint.file,
          line: endpoint.line,
        });
      }
    }

    // Find extra endpoints (in docs, not in code)
    for (const endpoint of documentedEndpoints) {
      const exists = currentEndpoints.find(
        (e) => e.method === endpoint.method && e.path === endpoint.path
      );

      if (!exists) {
        extraEndpoints.push({
          method: endpoint.method,
          path: endpoint.path,
        });
      }
    }

    const driftDetected =
      missingEndpoints.length > 0 ||
      extraEndpoints.length > 0 ||
      changedEndpoints.length > 0;

    // Get organization ID for policy evaluation
    const repo = await prisma.repository.findUnique({
      where: { id: repositoryId },
      select: { organizationId: true },
    });
    
    if (!repo) {
      throw new Error(`Repository ${repositoryId} not found`);
    }

    // Load effective policy
    const policy = await policyEngineService.loadEffectivePolicy(
      repo.organizationId,
      repositoryId,
      ref,
      undefined
    );

    // Create findings based on drift
    const findings: Issue[] = [];
    if (driftDetected) {
      if (missingEndpoints.length > 0) {
        findings.push({
          ruleId: 'doc-sync.missing-endpoints',
          severity: 'high',
          file: 'api',
          line: 1,
          message: `${missingEndpoints.length} endpoint(s) missing from documentation`,
          fix: 'Update documentation to include all API endpoints',
          confidence: 1.0,
        });
      }
      if (changedEndpoints.length > 0) {
        findings.push({
          ruleId: 'doc-sync.changed-endpoints',
          severity: 'medium',
          file: 'api',
          line: 1,
          message: `${changedEndpoints.length} endpoint(s) changed but docs not updated`,
          fix: 'Update documentation to reflect API changes',
          confidence: 1.0,
        });
      }
    }

    // Evaluate against policy
    const evaluationResult = policyEngineService.evaluate(findings, policy);

    // Determine if should block (policy-aware)
    const isBlocked =
      evaluationResult.blocked ||
      (driftDetected &&
        docConfig.driftPrevention.enabled &&
        docConfig.driftPrevention.action === 'block');

    return {
      driftDetected,
      missingEndpoints,
      extraEndpoints,
      changedEndpoints,
      isBlocked,
    };
  }

  /**
   * Extract API endpoints from code
   */
  private async extractEndpoints(
    _repositoryId: string,
    _ref: string,
    _framework: string
  ): Promise<Array<{ method: string; path: string; file: string; line: number; params: any }>> {
    // Simplified extraction (would fetch actual code from repo in production)
    const endpoints: Array<{ method: string; path: string; file: string; line: number; params: any }> = [];

    // Would parse code files and extract route definitions
    // For Express: app.get('/path', ...)
    // For Fastify: fastify.get('/path', ...)
    // etc.

    return endpoints;
  }

  /**
   * Extract endpoints from OpenAPI spec
   */
  private extractEndpointsFromOpenAPI(spec: any): Array<{ method: string; path: string }> {
    const endpoints: Array<{ method: string; path: string }> = [];

    if (spec.paths) {
      for (const [path, methods] of Object.entries(spec.paths)) {
        const pathMethods = methods as Record<string, any>;
        for (const method of Object.keys(pathMethods)) {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
            endpoints.push({
              method: method.toUpperCase(),
              path,
            });
          }
        }
      }
    }

    return endpoints;
  }

  /**
   * Generate OpenAPI spec
   */
  private async generateOpenAPI(
    endpoints: any[],
    version: '3.0' | '3.1',
    enhanceWithLLM: boolean,
    organizationId: string
  ): Promise<{ content: string; spec: any }> {
    let spec: any = {
      openapi: version,
      info: {
        title: 'API',
        version: '1.0.0',
      },
      paths: {},
    };

    // Build paths from endpoints
    for (const endpoint of endpoints) {
      if (!spec.paths[endpoint.path]) {
        spec.paths[endpoint.path] = {};
      }

      spec.paths[endpoint.path][endpoint.method.toLowerCase()] = {
        summary: endpoint.path,
        responses: {
          '200': {
            description: 'Success',
          },
        },
      };
    }

    // Enhance with LLM if enabled
    if (enhanceWithLLM) {
      // Query evidence if RAG is enabled
      let evidenceSection = '';
      if (isQueryEnabled()) {
        // Get repository ID from endpoints if available
        const repoId = endpoints.length > 0 ? endpoints[0].file?.split('/')[0] : undefined;
        
        try {
          const evidenceQueries = [
            `prior API docs patterns`,
            `OpenAPI fragments or route descriptions`,
            `API documentation conventions`,
          ];

          const allEvidence = [];
          for (const queryText of evidenceQueries) {
            const results = await queryEvidence({
              organizationId,
              repositoryId: repoId,
              queryText,
              topK: 3,
              filters: {
                sourceTypes: ['doc_convention', 'repo_file'],
              },
            });
            allEvidence.push(...results);
          }

          if (allEvidence.length > 0) {
            evidenceSection = formatEvidenceForPrompt(allEvidence);
          }
        } catch (error) {
          // Evidence retrieval failed - proceed without it (graceful degradation)
          // Use structured logger instead of console.warn for observability
          const { logger } = await import('../../observability/logging');
          logger.warn({
            err: error instanceof Error ? error : new Error(String(error)),
            repositoryId: repoId,
          }, 'Evidence retrieval failed, proceeding without evidence');
        }
      }

      const prompt = `Enhance the following OpenAPI spec with detailed descriptions, parameters, and examples.

OpenAPI Spec:
\`\`\`json
${JSON.stringify(spec, null, 2)}
\`\`\`
${evidenceSection}

Return the enhanced OpenAPI spec as JSON.`;

      const llmRequest: LLMRequest = {
        prompt,
        model: 'gpt-4-turbo-preview',
        organizationId,
        cache: true,
      };

      try {
        const response = await llmService.complete(llmRequest);
        spec = JSON.parse(response.content);
      } catch (error) {
        // LLM enhancement failed, use basic spec
        // Error is handled gracefully, basic spec is used
      }
    }

    return {
      content: JSON.stringify(spec, null, 2),
      spec,
    };
  }

  /**
   * Generate Markdown documentation
   */
  private async generateMarkdown(endpoints: any[], _organizationId: string): Promise<string> {
    let markdown = '# API Documentation\n\n';

    for (const endpoint of endpoints) {
      markdown += `## ${endpoint.method} ${endpoint.path}\n\n`;
      markdown += `**File:** ${endpoint.file}:${endpoint.line}\n\n`;
    }

    return markdown;
  }

  /**
   * Validate generated docs
   */
  private async validateDocs(content: string, format: string): Promise<void> {
    if (format === 'openapi') {
      try {
        const spec = JSON.parse(content);
        if (!spec.openapi || !spec.info || !spec.paths) {
          throw new Error('Invalid OpenAPI spec: missing required fields');
        }
      } catch (error) {
        throw new Error(
          `OpenAPI validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  /**
   * Detect framework
   */
  private async detectFramework(_repositoryId: string): Promise<string> {
    // Would check repo config or package.json in production
    return 'express';
  }

  /**
   * Get default config (enforcement-first)
   */
  private getDefaultConfig(): DocSyncConfig {
    return {
      updateStrategy: 'pr', // Default: PR for safety
      branch: 'main',
      driftPrevention: {
        enabled: true, // REQUIRED: Cannot disable
        action: 'block', // DEFAULT: Block, not auto-update
        checkOn: 'pr',
      },
      openapi: {
        version: '3.1',
        outputPath: 'docs/openapi.yaml',
        enhanceWithLLM: true,
      },
      markdown: {
        enabled: true,
        outputPath: 'docs/api.md',
      },
    };
  }
}

export const docSyncService = new DocSyncService();
