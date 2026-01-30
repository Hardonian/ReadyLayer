/**
 * GitLab OAuth Callback
 *
 * Handles callback from GitLab after OAuth authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/observability/logging';
import { createInstallationWithEncryptedToken } from '@/lib/secrets/installation-helpers';
import { validateReturnUrl } from '@/lib/redirect-validation';

const GITLAB_CLIENT_ID = process.env.GITLAB_CLIENT_ID;
const GITLAB_CLIENT_SECRET = process.env.GITLAB_CLIENT_SECRET;
const GITLAB_URL = process.env.GITLAB_URL || 'https://gitlab.com';

/**
 * GET /api/integrations/gitlab/callback
 *
 * Receives authorization code from GitLab
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      );
    }

    if (!state) {
      return NextResponse.json(
        { error: 'Missing state parameter - CSRF protection failed' },
        { status: 400 }
      );
    }

    // Verify state token
    const stateHash = createHash('sha256').update(state).digest('hex');

    const oauthState = await prisma.oAuthState.findUnique({
      where: { stateHash },
      select: {
        userId: true,
        organizationId: true,
        provider: true,
        returnUrl: true,
        expiresAt: true,
      },
    });

    if (!oauthState) {
      logger.warn({ stateHash }, 'Invalid OAuth state - not found');
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      );
    }

    if (new Date() > oauthState.expiresAt) {
      logger.warn({ stateHash }, 'OAuth state expired');
      await prisma.oAuthState.delete({ where: { stateHash } });
      return NextResponse.json(
        { error: 'State parameter expired - please try again' },
        { status: 400 }
      );
    }

    if (oauthState.provider !== 'gitlab') {
      logger.warn({ provider: oauthState.provider }, 'Invalid provider');
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Delete used state token
    await prisma.oAuthState.delete({ where: { stateHash } });

    // Exchange code for access token
    if (!GITLAB_CLIENT_ID || !GITLAB_CLIENT_SECRET) {
      logger.error('GitLab OAuth credentials not configured');
      return NextResponse.json(
        { error: 'GitLab integration not configured' },
        { status: 500 }
      );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gitlab/callback`;
    const tokenUrl = `${GITLAB_URL}/oauth/token`;

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITLAB_CLIENT_ID,
        client_secret: GITLAB_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error({ status: tokenResponse.status, error: errorText }, 'GitLab token exchange failed');
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    // Get user info to get GitLab user ID
    const userResponse = await fetch(`${GITLAB_URL}/api/v4/user`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get GitLab user info');
    }

    const userData = await userResponse.json() as {
      id: number;
      username: string;
    };

    // Store installation with encrypted token
    const installation = await createInstallationWithEncryptedToken({
      organization: {
        connect: { id: oauthState.organizationId },
      },
      provider: 'gitlab',
      providerId: userData.id.toString(),
      accessToken: tokenData.access_token,
      permissions: { api: true, read_repository: true }, // GitLab permissions
      selectedRepos: [], // Will be populated when repositories are connected
      webhookSecret: process.env.GITLAB_WEBHOOK_SECRET || null,
      isActive: true,
    });

    logger.info(
      {
        installationId: installation.id,
        gitlabUserId: userData.id,
        gitlabUsername: userData.username,
        organizationId: oauthState.organizationId,
      },
      'GitLab integration completed'
    );

    // Redirect to success page (validate returnUrl for defense in depth)
    const returnUrl = validateReturnUrl(
      oauthState.returnUrl,
      ['/dashboard'],
      '/dashboard/repos'
    );
    const successUrl = new URL(returnUrl, req.url);
    successUrl.searchParams.set('installation', 'success');
    successUrl.searchParams.set('provider', 'gitlab');

    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    logger.error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
      },
      'GitLab OAuth callback failed'
    );

    const errorUrl = new URL('/dashboard/repos', req.url);
    errorUrl.searchParams.set('installation', 'error');
    errorUrl.searchParams.set('provider', 'gitlab');

    return NextResponse.redirect(errorUrl.toString());
  }
}
