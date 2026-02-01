#!/usr/bin/env tsx

/**
 * OpenAPI Spec Generator
 * 
 * Generates OpenAPI 3.1.0 specification from Zod schemas
 * Run with: pnpm tsx scripts/generate-openapi.ts
 */

import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { console } from './logger';

// Import all types/schemas
import { FindingSchema } from '../lib/types/review';

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact: {
      name: string;
      url: string;
      email: string;
    };
    license: {
      name: string;
      url: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, Record<string, unknown>>;
  components: {
    schemas: Record<string, Record<string, unknown>>;
    responses: Record<string, Record<string, unknown>>;
    securitySchemes: Record<string, Record<string, unknown>>;
  };
  tags: Array<{
    name: string;
    description: string;
  }>;
}

// Zod to OpenAPI schema converter
function zodToOpenAPI(schema: z.ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodString) {
    return {
      type: 'string',
      description: schema.description,
    };
  }

  if (schema instanceof z.ZodNumber) {
    return {
      type: 'number',
      description: schema.description,
    };
  }

  if (schema instanceof z.ZodBoolean) {
    return {
      type: 'boolean',
      description: schema.description,
    };
  }

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    const properties: Record<string, Record<string, unknown>> = {};
    const required: string[] = [];

    for (const [key, fieldSchema] of Object.entries(shape)) {
      properties[key] = zodToOpenAPI(fieldSchema);

      if (!fieldSchema.isOptional()) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      description: schema.description,
    };
  }

  if (schema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: schema.enum,
      description: schema.description,
    };
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToOpenAPI(schema.element as z.ZodTypeAny),
      description: schema.description,
    };
  }

  if (schema instanceof z.ZodUnion) {
    return {
      oneOf: (schema.options as z.ZodTypeAny[]).map((opt) => zodToOpenAPI(opt)),
      description: schema.description,
    };
  }

  if (schema instanceof z.ZodOptional) {
    return zodToOpenAPI(schema.unwrap() as z.ZodTypeAny);
  }

  // Default fallback
  return {
    type: 'object',
    description: schema.description || 'Unknown type',
  };
}

function generateSpec(): OpenAPISpec {
  return {
    openapi: '3.1.0',
    info: {
      title: 'ReadyLayer API',
      description: 'AI-powered code review and test automation for pull requests',
      version: '1.0.0',
      contact: {
        name: 'ReadyLayer Support',
        url: 'https://ready-layer.com',
        email: 'support@ready-layer.com',
      },
      license: {
        name: 'Apache 2.0',
        url: 'https://opensource.org/licenses/Apache-2.0',
      },
    },
    servers: [
      {
        url: 'https://ready-layer.com/api',
        description: 'Production API',
      },
      {
        url: 'http://localhost:3000/api',
        description: 'Development API',
      },
    ],
    paths: {
      '/v1/reviews': {
        post: {
          summary: 'Create a code review',
          description: 'Submit a PR for AI-powered code review analysis',
          tags: ['Reviews'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['repositoryId', 'prNumber', 'prSha', 'files'],
                  properties: {
                    repositoryId: {
                      type: 'string',
                      description: 'Repository ID (e.g., github_123)',
                    },
                    prNumber: {
                      type: 'integer',
                      description: 'Pull request number',
                    },
                    prSha: {
                      type: 'string',
                      description: 'Commit SHA of the PR',
                    },
                    prTitle: {
                      type: 'string',
                      description: 'Pull request title',
                    },
                    diff: {
                      type: 'string',
                      description: 'Unified diff of changes',
                    },
                    files: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['path', 'content'],
                        properties: {
                          path: { type: 'string' },
                          content: { type: 'string' },
                          beforeContent: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Review completed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      status: {
                        type: 'string',
                        enum: ['completed', 'failed', 'blocked', 'pending-enrichment'],
                      },
                      issues: {
                        type: 'array',
                        items: zodToOpenAPI(FindingSchema),
                      },
                      summary: {
                        type: 'object',
                        properties: {
                          total: { type: 'integer' },
                          critical: { type: 'integer' },
                          high: { type: 'integer' },
                          medium: { type: 'integer' },
                          low: { type: 'integer' },
                        },
                      },
                      isBlocked: { type: 'boolean' },
                      blockedReason: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Invalid request',
            },
            '401': {
              description: 'Unauthorized',
            },
            '429': {
              description: 'Rate limit exceeded',
            },
          },
          security: [{ bearerAuth: [] }],
        },
      },
      '/v1/reviews/{reviewId}': {
        get: {
          summary: 'Get review details',
          description: 'Retrieve details of a completed review',
          tags: ['Reviews'],
          parameters: [
            {
              name: 'reviewId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Review details',
            },
            '404': {
              description: 'Review not found',
            },
          },
          security: [{ bearerAuth: [] }],
        },
      },
      '/v1/health': {
        get: {
          summary: 'Health check',
          description: 'Check API health status',
          tags: ['System'],
          responses: {
            '200': {
              description: 'API is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      timestamp: { type: 'string', format: 'date-time' },
                      uptime: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Finding: zodToOpenAPI(FindingSchema),
        Error: {
          type: 'object',
          required: ['code', 'message'],
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object' },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication information is missing or invalid',
        },
        NotFoundError: {
          description: 'The specified resource was not found',
        },
        RateLimitError: {
          description: 'Rate limit exceeded. Try again later.',
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from /auth/signin',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for programmatic access',
        },
      },
    },
    tags: [
      {
        name: 'Reviews',
        description: 'Code review operations',
      },
      {
        name: 'System',
        description: 'System and health endpoints',
      },
    ],
  };
}

// Write spec to file
function main(): void {
  const spec = generateSpec();
  const outputPath = path.join(process.cwd(), 'public', 'openapi.json');

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2));
  console.log(`✓ OpenAPI spec generated: ${outputPath}`);
  console.log(`  Preview: http://localhost:3000/api/openapi.json`);
}

main();
