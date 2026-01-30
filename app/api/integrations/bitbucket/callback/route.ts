/**
 * Bitbucket OAuth Callback
 *
 * Handles callback from Bitbucket after OAuth authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/observability/logging';
import { createInstallationWithEncryptedToken } from '@/lib/secrets/installation-helpers';
import { validateReturnUrl } from '@/lib/redirect-validation';

const BITBUCKET_CLIENT_ID = process.env.BITBUCKET_CLIENT_ID;
const BITBUCKET_CLIENT_SECRET = process.env.BITBUCKET_CLIENT_SECRET;

/**
 * GET /api/integrations/bitbucket/callback
 *
 * Receives authorization code from Bitbucket
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

    if (oauthState.provider !== 'bitbucket') {
      logger.warn({ provider: oauthState.provider }, 'Invalid provider');
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Delete used state token
    await prisma.oAuthState.delete({ where: { stateHash } });

    // Exchange code for access token
    if (!BITBUCKET_CLIENT_ID || !BITBUCKET_CLIENT_SECRET) {
      logger.error('Bitbucket OAuth credentials not configured');
      return NextResponse.json(
        { error: 'Bitbucket integration not configured' },
        { status: 500 }
      );
    }

    const tokenUrl = 'https://bitbucket.org/site/oauth2/access_token';
    const credentials = Buffer.from(`${BITBUCKET_CLIENT_ID}:${BITBUCKET_CLIENT_SECRET}`).toString('base64');

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error({ status: tokenResponse.status, error: errorText }, 'Bitbucket token exchange failed');
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    // Get user info to get Bitbucket UUID
    const userResponse = await fetch('https://api.bitbucket.org/2.0/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get Bitbucket user info');
    }

    const userData = await userResponse.json() as {
      uuid: string;
      username: string;
    };

    // Store installation with encrypted token
    const installation = await createInstallationWithEncryptedToken({
      organization: {
        connect: { id: oauthState.organizationId },
      },
      provider: 'bitbucket',
      providerId: userData.uuid,
      accessToken: tokenData.access_token,
      permissions: { repository: 'read', pullrequest: 'write' },
      selectedRepos: [],
      webhookSecret: process.env.BITBUCKET_WEBHOOK_SECRET || null,
      isActive: true,
    });

    logger.info(
      {
        installationId: installation.id,
        bitbucketUuid: userData.uuid,
        bitbucketUsername: userData.username,
        organizationId: oauthState.organizationId,
      },
      'Bitbucket integration completed'
    );

    // Redirect to success page (validate returnUrl for defense in depth)
    const returnUrl = validateReturnUrl(
      oauthState.returnUrl,
      ['/dashboard'],
      '/dashboard/repos'
    );
    const successUrl = new URL(returnUrl, req.url);
    successUrl.searchParams.set('installation', 'success');
    successUrl.searchParams.set('provider', 'bitbucket');

    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    logger.error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
      },
      'Bitbucket OAuth callback failed'
    );

    const errorUrl = new URL('/dashboard/repos', req.url);
    errorUrl.searchParams.set('installation', 'error');
    errorUrl.searchParams.set('provider', 'bitbucket');

    return NextResponse.redirect(errorUrl.toString());
  }
}
