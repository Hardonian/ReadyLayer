/**
 * GitHub App Installation Callback
 *
 * Handles callback from GitHub after app installation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/observability/logging';
import { createInstallationWithEncryptedToken } from '@/lib/secrets/installation-helpers';
import { toJsonValue } from '@/lib/prisma-json';
import { validateReturnUrl } from '@/lib/redirect-validation';

const GITHUB_APP_ID = process.env.GITHUB_APP_ID;
const GITHUB_APP_PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY;

/**
 * GET /api/integrations/github/callback
 *
 * Receives installation_id and setup_action from GitHub
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = req.nextUrl.searchParams;
    const installationId = searchParams.get('installation_id');
    const setupAction = searchParams.get('setup_action');
    const state = searchParams.get('state');

    // Validate required parameters
    if (!installationId) {
      return NextResponse.json(
        { error: 'Missing installation_id parameter' },
        { status: 400 }
      );
    }

    if (!state) {
      return NextResponse.json(
        { error: 'Missing state parameter - CSRF protection failed' },
        { status: 400 }
      );
    }

    // Verify state token (CSRF protection)
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

    if (oauthState.provider !== 'github') {
      logger.warn({ provider: oauthState.provider }, 'Invalid provider in OAuth state');
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Delete used state token
    await prisma.oAuthState.delete({ where: { stateHash } });

    // Get installation details from GitHub
    if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY) {
      logger.error('GitHub App credentials not configured');
      return NextResponse.json(
        { error: 'GitHub App not configured' },
        { status: 500 }
      );
    }

    // Create GitHub App JWT
const { App } = await import('@octokit/app');
    const app = new App({
      appId: GITHUB_APP_ID,
      privateKey: GITHUB_APP_PRIVATE_KEY,
    });

    type OctokitRest = InstanceType<typeof import('@octokit/rest').Octokit>;

    // Get installation access token
    const installationOctokit = await app.getInstallationOctokit(parseInt(installationId, 10)) as unknown as OctokitRest;

    // Get installation details
    const installationData = await installationOctokit.rest.apps.getInstallation({
      installation_id: parseInt(installationId, 10),
    }) as unknown as { data: Record<string, unknown> };

    // Get installation access token
    const tokenData = await installationOctokit.rest.apps.createInstallationAccessToken({
      installation_id: parseInt(installationId, 10),
    }) as unknown as { data: Record<string, unknown> };

    const installation = installationData.data;
    const tokenResponse = tokenData.data;

    // Store installation with encrypted token
    const savedInstallation = await createInstallationWithEncryptedToken({
      organization: {
        connect: { id: oauthState.organizationId },
      },
      provider: 'github',
      providerId: installationId,
      accessToken: tokenResponse.token as string,
      permissions: toJsonValue((installation.permissions as Record<string, unknown>) || {}),
      selectedRepos: installation.repository_selection === 'all'
        ? []
        : ((installation.repositories as Array<{ id: number }>) || []).map((r) => String(r.id)),
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || null,
      isActive: true,
    });

    logger.info(
      {
        installationId: savedInstallation.id,
        githubInstallationId: installationId,
        organizationId: oauthState.organizationId,
        setupAction,
        repositoryCount: savedInstallation.selectedRepos.length,
      },
      'GitHub App installation completed'
    );

    // Redirect to success page (validate returnUrl for defense in depth)
    const returnUrl = validateReturnUrl(
      oauthState.returnUrl,
      ['/dashboard'],
      '/dashboard/repos'
    );
    const successUrl = new URL(returnUrl, req.url);
    successUrl.searchParams.set('installation', 'success');
    successUrl.searchParams.set('provider', 'github');

    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    logger.error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
      },
      'GitHub App installation callback failed'
    );

    // Redirect to error page
    const errorUrl = new URL('/dashboard/repos', req.url);
    errorUrl.searchParams.set('installation', 'error');
    errorUrl.searchParams.set('provider', 'github');

    return NextResponse.redirect(errorUrl.toString());
  }
}
