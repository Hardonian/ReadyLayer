/**
 * Human Override API
 * 
 * POST /api/v1/ethical-ai/override - Record human override of AI decision
 */

import { ethicalAIGatesService } from '../../../../../services/ethical-ai-gates';
import {
  createRouteHandler,
  parseJsonBody,
  errorResponse,
  successResponse,
  RouteContext,
} from '../../../../../lib/api-route-helpers';
import { z } from 'zod';

const overrideSchema = z.object({
  reviewId: z.string(),
  findingId: z.string(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  justification: z.string().min(20, 'Justification must be at least 20 characters'),
});

export const POST = createRouteHandler(
  async (context: RouteContext) => {
    const { request, user, log } = context;

    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }

    const validationResult = overrideSchema.safeParse(bodyResult.data);
    if (!validationResult.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid request body',
        400,
        { errors: validationResult.error.errors }
      );
    }

    const { reviewId, findingId, reason, justification } = validationResult.data;

    try {
      await ethicalAIGatesService.recordOverride({
        reviewId,
        findingId,
        reason,
        justification,
        userId: user.id,
      });

      log.info({ reviewId, findingId, userId: user.id }, 'Override recorded');

      return successResponse({ success: true });
    } catch (error) {
      log.error(error, 'Failed to record override');
      return errorResponse(
        'OVERRIDE_FAILED',
        error instanceof Error ? error.message : 'Unknown error',
        500
      );
    }
  },
  { authz: { requiredScopes: ['write'] } }
);
