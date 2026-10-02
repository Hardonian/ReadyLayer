/**
 * Waiver Cryptographic Verification API
 * 
 * POST /api/v1/waivers/verify
 * Verifies the cryptographic signature, expiration, and payload integrity of a policy waiver.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { logger } from '../../../../observability/logging';
import { parseJsonBody } from '../../../../lib/api-route-helpers';
import { verifyWaiverSignature, verifyWaiverToken, WaiverPayload } from '../../../../lib/waivers';
import { z } from 'zod';

const verifyWaiverSchema = z.object({
  token: z.string().optional(),
  signature: z.string().optional(),
  payload: z.object({
    waiverId: z.string(),
    organizationId: z.string(),
    repositoryId: z.string().optional().nullable(),
    ruleId: z.string(),
    scope: z.enum(['repo', 'branch', 'path']),
    scopeValue: z.string().optional().nullable(),
    reason: z.string(),
    createdBy: z.string(),
    createdAt: z.string(),
    expiresAt: z.string().optional().nullable(),
  }).optional(),
  checkDatabase: z.boolean().default(true),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }

    const validated = verifyWaiverSchema.parse(bodyResult.data);

    if (!validated.token && (!validated.payload || !validated.signature)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Must provide either "token" or both "payload" and "signature"',
          },
        },
        { status: 400 }
      );
    }

    let result;
    if (validated.token) {
      result = verifyWaiverToken(validated.token);
    } else if (validated.payload && validated.signature) {
      result = verifyWaiverSignature(validated.payload as WaiverPayload, validated.signature);
    } else {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid verification request parameters',
          },
        },
        { status: 400 }
      );
    }

    let dbRecordExists = null;
    if (result.valid && result.payload?.waiverId && validated.checkDatabase) {
      try {
        const dbWaiver = await prisma.waiver.findUnique({
          where: { id: result.payload.waiverId },
          select: { id: true, expiresAt: true, organizationId: true },
        });

        dbRecordExists = !!dbWaiver;

        if (dbWaiver?.expiresAt && new Date(dbWaiver.expiresAt).getTime() <= Date.now()) {
          result.isExpired = true;
          result.valid = false;
          result.reason = 'Waiver expired in database records';
        }
      } catch (err) {
        log.warn({ err }, 'Could not check database for waiver verification');
      }
    }

    return NextResponse.json({
      valid: result.valid,
      isExpired: result.isExpired,
      reason: result.reason || (result.valid ? 'Signature authentic and valid' : 'Invalid signature'),
      algorithm: result.algorithm || 'HMAC-SHA256',
      payload: result.payload || null,
      databaseVerified: dbRecordExists,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    log.error(error, 'Failed to verify waiver');
    return NextResponse.json(
      {
        error: {
          code: 'VERIFICATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error during verification',
        },
      },
      { status: 500 }
    );
  }
}
