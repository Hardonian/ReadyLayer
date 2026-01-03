/**
 * Test Repository Connection API Route
 * 
 * POST /api/v1/repos/:repoId/test-connection - Test repository connection
 */

import { NextRequest, NextResponse } from 'next/server';

// Use Node.js runtime for Prisma and API client access
export const runtime = 'nodejs';
import { prisma } from '../../../../../../lib/prisma';
import { logger } from '../../../../../../observability/logging';
import { requireAuth } from '../../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../../lib/authz';
import { getGitProviderPRAdapter } from '../../../../../../integrations/git-provider-pr-adapter';

/**
 * POST /api/v1/repos/:repoId/test-connection
 * Test repository connection (tenant-isolated)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, repoId: params.repoId });

  try {
    // Require authentication
    const user = await requireAuth(request);

    // Check authorization
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    // Get repository
    const repo = await prisma.repository.findUnique({
      where: { id: params.repoId },
      select: {
        id: true,
        fullName: true,
        provider: true,
        organizationId: true,
        enabled: true,
      },
    });

    if (!repo) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Repository ${params.repoId} not found`,
          },
        },
        { status: 404 }
      );
    }

    // Verify user belongs to repository's organization (tenant isolation)
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

    // Get installation for this organization and provider
    // First, find installation by organization
    const installation = await prisma.installation.findFirst({
      where: {
        organizationId: repo.organizationId,
        provider: repo.provider,
        isActive: true,
      },
    });

    if (!installation) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_INSTALLATION',
          message: 'No active installation found for this provider',
          details: {
            provider: repo.provider,
            organizationId: repo.organizationId,
          },
        },
      });
    }

    // Decrypt token
    const { getInstallationWithDecryptedToken } = await import('../../../../../../lib/secrets/installation-helpers');
    const installationWithToken = await getInstallationWithDecryptedToken(installation.id);

    if (!installationWithToken || !installationWithToken.accessToken) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TOKEN_DECRYPTION_FAILED',
          message: 'Failed to decrypt installation token',
          details: {
            provider: repo.provider,
            installationId: installation.id,
          },
        },
      });
    }

    // Test connection by fetching repository info
    const prAdapter = getGitProviderPRAdapter(repo.provider as 'github' | 'gitlab' | 'bitbucket');
    
    try {
      // Try to get a file from the default branch to test connection
      const testFile = 'README.md';
      const defaultBranch = 'main';
      
      try {
        await prAdapter.getFileContent(
          repo.fullName,
          testFile,
          defaultBranch,
          installationWithToken.accessToken
        );
      } catch (fileError) {
        // If README.md doesn't exist, try to get repo info via PR list (empty is OK)
        // For now, if file fetch fails, we'll check if it's a permissions issue
        const errorMessage = fileError instanceof Error ? fileError.message : String(fileError);
        if (errorMessage.includes('404') || errorMessage.includes('not found')) {
          // File doesn't exist, but connection works
          return NextResponse.json({
            success: true,
            message: 'Connection successful',
            details: {
              provider: repo.provider,
              repository: repo.fullName,
              installationActive: installation.isActive,
              permissions: installation.permissions,
            },
          });
        }
        throw fileError;
      }

      return NextResponse.json({
        success: true,
        message: 'Connection successful',
        details: {
          provider: repo.provider,
          repository: repo.fullName,
          installationActive: installation.isActive,
          permissions: installation.permissions,
        },
      });
    } catch (apiError) {
      const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
      const isAuthError = errorMessage.includes('401') || 
                         errorMessage.includes('403') || 
                         errorMessage.includes('Unauthorized') ||
                         errorMessage.includes('Forbidden');
      const isNotFoundError = errorMessage.includes('404') || errorMessage.includes('not found');

      if (isAuthError) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Authentication failed - token may be expired or invalid',
            details: {
              provider: repo.provider,
              error: errorMessage,
            },
          },
        }, { status: 401 });
      }

      if (isNotFoundError) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'REPOSITORY_NOT_FOUND',
            message: 'Repository not found or access denied',
            details: {
              provider: repo.provider,
              repository: repo.fullName,
              error: errorMessage,
            },
          },
        }, { status: 404 });
      }

      return NextResponse.json({
        success: false,
        error: {
          code: 'CONNECTION_FAILED',
          message: 'Connection test failed',
          details: {
            provider: repo.provider,
            error: errorMessage,
          },
        },
      }, { status: 500 });
    }
  } catch (error) {
    log.error(error, 'Failed to test repository connection');
    return NextResponse.json(
      {
        error: {
          code: 'TEST_CONNECTION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
