/**
 * Self-Learning Feedback API
 * 
 * POST /api/v1/self-learning/feedback - Record feedback on predictions
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../../observability/logging';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { selfLearningService } from '../../../../../services/self-learning';
import { z } from 'zod';
import { parseJsonBody } from '../../../../../lib/api-route-helpers';

const feedbackSchema = z.object({
  predictionId: z.string().min(1),
  wasCorrect: z.boolean(),
  actualOutcome: z.unknown().optional(),
  feedbackType: z.enum(['explicit', 'implicit', 'outcome_based']).optional(),
  confidenceAtPrediction: z.number().min(0).max(1).optional(),
});

/**
 * POST /api/v1/self-learning/feedback
 * Record feedback on predictions
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    
    const validationResult = feedbackSchema.safeParse(bodyResult.data);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid feedback data',
            errors: validationResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { predictionId, wasCorrect, actualOutcome, feedbackType, confidenceAtPrediction } =
      validationResult.data;

    // Record feedback
    await selfLearningService.recordFeedback({
      predictionId,
      wasCorrect,
      actualOutcome,
      feedbackType: feedbackType || 'explicit',
      confidenceAtPrediction: confidenceAtPrediction || 0.7,
      userId: user.id,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded',
    });
  } catch (error) {
    log.error(error, 'Failed to record feedback');
    return NextResponse.json(
      {
        error: {
          code: 'FEEDBACK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
