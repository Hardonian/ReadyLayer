/**
 * POST /api/v1/rag/ingest
 * Ingest document into evidence index
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { ingestDocument, isIngestEnabled } from '../../../../../lib/rag';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../observability/logging';
import { z } from 'zod';

const ingestSchema = z.object({
  repositoryId: z.string().optional(),
  sourceType: z.enum(['pr_diff', 'repo_file', 'review_result', 'policy_doc', 'test_precedent', 'doc_convention']),
  sourceRef: z.string(),
  title: z.string().optional(),
  content: z.string().max(1000000), // Max 1MB content
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Check if RAG ingestion is enabled
    if (!isIngestEnabled()) {
      return NextResponse.json(
        {
          status: 'disabled',
          message: 'RAG ingestion is disabled',
        },
        { status: 200 } // 200, not 4xx - graceful degradation
      );
    }

    // Require authentication
    const user = await requireAuth(request);

    // Check authorization
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validation = ingestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { repositoryId, sourceType, sourceRef, title, content, metadata } = validation.data;

    // Get organization ID from repository or user's default org
    let organizationId: string;
    if (repositoryId) {
      // Verify repository belongs to user's organization
      const repo = await prisma.repository.findUnique({
        where: { id: repositoryId },
        select: { organizationId: true },
      });

      if (!repo) {
        return NextResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Repository not found',
            },
          },
          { status: 404 }
        );
      }

      // Verify user has access to this organization
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: repo.organizationId,
            userId: user.id,
          },
        },
      });

      if (!membership) {
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied to repository',
            },
          },
          { status: 403 }
        );
      }

      organizationId = repo.organizationId;
    } else {
      // Use user's first organization (or require orgId in future)
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: user.id },
        select: { organizationId: true },
      });

      if (!membership) {
        return NextResponse.json(
          {
            error: {
              code: 'BAD_REQUEST',
              message: 'No organization found. Please specify repositoryId or join an organization.',
            },
          },
          { status: 400 }
        );
      }

      organizationId = membership.organizationId;
    }

    // Ingest document
    const result = await ingestDocument(
      {
        organizationId,
        repositoryId,
        sourceType,
        sourceRef,
        title,
        content,
        metadata,
      },
      requestId
    );

    log.info({
      organizationId,
      repositoryId,
      documentId: result.documentId,
      chunksStored: result.chunksStored,
      mode: result.mode,
    }, 'RAG document ingested');

    return NextResponse.json({
      documentId: result.documentId,
      chunksStored: result.chunksStored,
      mode: result.mode,
      embeddingStatus: result.embeddingStatus,
    });
  } catch (error) {
    log.error({
      err: error instanceof Error ? error : new Error(String(error)),
    }, 'RAG ingest failed');

    // Return 500 only for unexpected errors (catch block)
    // Note: ingestDocument() already handles graceful degradation internally
    return NextResponse.json(
      {
        error: {
          code: 'INGEST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to ingest document',
        },
      },
      { status: 500 }
    );
  }
}
