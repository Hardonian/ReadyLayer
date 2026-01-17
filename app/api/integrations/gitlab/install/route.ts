/**
 * GitLab App Installation Redirect
 *
 * Redirects user to GitLab to install the ReadyLayer GitLab integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/observability/logging';
import { getServerSession } from '@/lib/auth';

const GITLAB_CLIENT_ID = process.env.GITLAB_CLIENT_ID;
const GITLAB_URL = process.env.GITLAB_URL || 'https://gitlab.com';

/**
 * GET /api/integrations/gitlab/install
 *
 * Initiates GitLab OAuth flow
 */
export async function GET(req: NextRequest) {
  try {
    if (!GITLAB_CLIENT_ID) {
      return NextResponse.json(
        { error: 'GitLab integration not configured' },
        { status: 500 }
      );
    }

    // Get authenticated user
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'User must belong to an organization' },
        { status: 400 }
      );
    }

    // Generate secure state token for CSRF protection
    const state = randomBytes(32).toString('hex');
    const stateHash = createHash('sha256').update(state).digest('hex');

    // Store state with user/org context (expires in 10 minutes)
    await prisma.oAuthState.create({
      data: {
        stateHash,
        userId,
        organizationId: user.organizationId,
        provider: 'gitlab',
        returnUrl: req.nextUrl.searchParams.get('returnUrl') || '/dashboard/repos',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Build GitLab OAuth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gitlab/callback`;
    const authUrl = new URL(`${GITLAB_URL}/oauth/authorize`);
    authUrl.searchParams.set('client_id', GITLAB_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'api read_user read_repository');

    logger.info(
      {
        userId,
        organizationId: user.organizationId,
        state: stateHash,
      },
      'Redirecting to GitLab OAuth'
    );

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    logger.error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
      },
      'GitLab OAuth redirect failed'
    );

    return NextResponse.json(
      { error: 'Failed to initiate GitLab OAuth' },
      { status: 500 }
    );
  }
}
