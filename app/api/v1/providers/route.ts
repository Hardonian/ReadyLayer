/**
 * Provider Configuration API Routes
 * 
 * POST /api/v1/providers - Create/update provider config
 * GET /api/v1/providers - List provider configs for org
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteHandler } from '@/lib/api-route-helpers';
import { providerConfigService } from '@/lib/services/provider-config';

const ProviderConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'opencode', 'openrouter']),
  apiKey: z.string().min(10, 'API key too short'),
  routingStrategy: z.enum(['single', 'fallback', 'variance']).optional(),
  testConnectivity: z.boolean().optional(),
});

export const POST = createRouteHandler(
  async (context) => {
    const { request, user, log, requestId } = context;

// Parse and validate body
    const bodyResult = await request.json() as unknown;
    const validation = ProviderConfigSchema.safeParse(bodyResult);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            context: { errors: validation.error.issues },
          },
        },
        { status: 400 }
      );
    }

    const { provider, apiKey, routingStrategy, testConnectivity } = validation.data;

    try {
      // Optional: test connectivity before saving
      if (testConnectivity) {
        const testResult = await providerConfigService.testProviderConnectivity(
          provider,
          apiKey
        );

        if (!testResult.success) {
          return NextResponse.json(
            {
              error: {
                code: 'PROVIDER_TEST_FAILED',
                message: `Failed to connect to ${provider}: ${testResult.error || 'Unknown error'}`,
              },
            },
            { status: 400 }
          );
        }
      }

      // Get user's organization
      const organizationIds = user.organizationIds;
      if (!organizationIds || organizationIds.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'NO_ORGANIZATION',
              message: 'User does not belong to any organization',
            },
          },
          { status: 403 }
        );
      }

      const organizationId = organizationIds[0]; // Use first org (or could be param)

      // Save provider config
      const config = await providerConfigService.setProviderConfig(organizationId, {
        provider,
        apiKey,
        routingStrategy,
      });

      log.info(
        { requestId, provider, organizationId },
        'Provider configuration created/updated'
      );

      return NextResponse.json(
        {
          data: config,
        },
        { status: 200 }
      );
    } catch (error) {
      log.error(
        {
          requestId,
          err: error instanceof Error ? error : new Error(String(error)),
        },
        'Failed to create provider config'
      );

      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to save provider configuration',
          },
        },
        { status: 500 }
      );
    }
  },
  {
    authz: {
      requireOrganization: true,
    },
  }
);

export const GET = createRouteHandler(
  async (context) => {
    const { user, log, requestId } = context;

    try {
      const organizationIds = user.organizationIds;
      if (!organizationIds || organizationIds.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'NO_ORGANIZATION',
              message: 'User does not belong to any organization',
            },
          },
          { status: 403 }
        );
      }

      const organizationId = organizationIds[0];

      const configs = await providerConfigService.listProviderConfigs(organizationId);

      log.info(
        { requestId, organizationId, count: configs.length },
        'Listed provider configurations'
      );

      return NextResponse.json(
        {
          data: configs,
        },
        { status: 200 }
      );
    } catch (error) {
      log.error(
        {
          requestId,
          err: error instanceof Error ? error : new Error(String(error)),
        },
        'Failed to list provider configs'
      );

      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to list provider configurations',
          },
        },
        { status: 500 }
      );
    }
  },
  {
    authz: {
      requireOrganization: true,
    },
  }
);
