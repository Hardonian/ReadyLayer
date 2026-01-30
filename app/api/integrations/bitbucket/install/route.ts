/**
 * Bitbucket App Installation Redirect
 *
 * Redirects user to Bitbucket to install the ReadyLayer Bitbucket integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/observability/logging';
import { requireAuth } from '@/lib/auth';
import { validateReturnUrl } from '@/lib/redirect-validation';

const BITBUCKET_CLIENT_ID = process.env.BITBUCKET_CLIENT_ID;

/**
 * GET /api/integrations/bitbucket/install
 *
 * Initiates Bitbucket OAuth flow
 */
export async function GET(req: NextRequest) {
  try {
    if (!BITBUCKET_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Bitbucket integration not configured' },
        { status: 500 }
      );
    }

    // Get authenticated user
    const authUser = await requireAuth(req);
    const userId = authUser.id;

    // Get user's organization (first one if multiple)
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'User must belong to an organization' },
        { status: 400 }
      );
    }

    const organizationId = membership.organizationId;

    // Generate secure state token for CSRF protection
    const state = randomBytes(32).toString('hex');
    const stateHash = createHash('sha256').update(state).digest('hex');

    // Validate and sanitize return URL to prevent open redirect vulnerabilities
    const returnUrl = validateReturnUrl(
      req.nextUrl.searchParams.get('returnUrl'),
      ['/dashboard'],
      '/dashboard/repos'
    );

    // Store state with user/org context (expires in 10 minutes)
    await prisma.oAuthState.create({
      data: {
        stateHash,
        userId,
        organizationId,
        provider: 'bitbucket',
        returnUrl,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Build Bitbucket OAuth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/bitbucket/callback`;
    const authUrl = new URL('https://bitbucket.org/site/oauth2/authorize');
    authUrl.searchParams.set('client_id', BITBUCKET_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('redirect_uri', redirectUri);

    logger.info(
      {
        userId,
        organizationId,
        state: stateHash,
      },
      'Redirecting to Bitbucket OAuth'
    );

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    logger.error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
      },
      'Bitbucket OAuth redirect failed'
    );

    return NextResponse.json(
      { error: 'Failed to initiate Bitbucket OAuth' },
      { status: 500 }
    );
  }
}
