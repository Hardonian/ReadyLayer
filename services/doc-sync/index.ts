/**
 * Doc Sync Service
 * 
 * Automatic documentation and API spec generation
 * Enforces drift prevention (blocks by default)
 */

import { prisma } from '../../lib/prisma';
import { llmService, LLMRequest } from '../llm';
import { codeParserService } from '../code-parser';

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

export class DocSyncService {
  /**
   * Generate documentation
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

      // Save doc result
      const doc = await prisma.doc.create({
        data: {
          repositoryId: request.repositoryId,
          ref: request.ref,
          format: request.format,
          content,
          spec: spec || undefined,
          status: 'generated',
          driftDetected: false,
          publishedAt: config.updateStrategy === 'commit' ? completedAt : null,
          createdAt: startedAt,
          updatedAt: completedAt,
        },
      });

      return {
        id: doc.id,
        status: 'generated',
        format: request.format,
        content,
        spec,
        driftDetected: false,
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
   * Check for drift between code and docs
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

    // Determine if should block
    const isBlocked =
      driftDetected &&
      docConfig.driftPrevention.enabled &&
      docConfig.driftPrevention.action === 'block';

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
    repositoryId: string,
    ref: string,
    framework: string
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
      const prompt = `Enhance the following OpenAPI spec with detailed descriptions, parameters, and examples.

OpenAPI Spec:
\`\`\`json
${JSON.stringify(spec, null, 2)}
\`\`\`

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
  private async generateMarkdown(endpoints: any[], organizationId: string): Promise<string> {
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
  private async detectFramework(repositoryId: string): Promise<string> {
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
