/**
 * GitHub OAuth Initiation Route
 * 
 * Generates CSRF state token and redirects to GitHub authorization URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateOAuthStateToken, generateGitHubOAuthURL } from '@/integrations/github/oauth';
import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    // Generate CSRF state token
    const stateToken = generateOAuthStateToken();

    // Get OAuth configuration
    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/github/callback`;

    if (!clientId) {
      logger.error('GitHub OAuth client ID not configured');
      metrics.increment('github_oauth_config_error');

      return NextResponse.json(
        { error: 'GitHub OAuth is not configured' },
        { status: 500 }
      );
    }

    // Generate GitHub authorization URL
    const authUrl = generateGitHubOAuthURL(
      clientId,
      redirectUri,
      stateToken,
      ['repo', 'read:org', 'workflow']
    );

    logger.info(
      {
        redirectUri,
        scopes: ['repo', 'read:org', 'workflow'],
      },
      'Initiating GitHub OAuth flow'
    );

    metrics.increment('github_oauth_initiated');

    // Create response with redirect
    const response = NextResponse.redirect(authUrl);

    // Store state token in httpOnly cookie for CSRF validation
    // Max age: 10 minutes (600 seconds)
    response.cookies.set('github_oauth_state', stateToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'GitHub OAuth initiation route error'
    );

    metrics.increment('github_oauth_init_error');

    return NextResponse.json(
      { error: 'Failed to initiate GitHub OAuth' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for OAuth initiation (alternative to GET)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { redirect_uri?: string | null };
    const { redirect_uri = null } = body;

    // Generate CSRF state token
    const stateToken = generateOAuthStateToken();

    // Get OAuth configuration
    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    const configuredRedirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/github/callback`;

    if (!clientId) {
      logger.error('GitHub OAuth client ID not configured');
      metrics.increment('github_oauth_config_error');

      return NextResponse.json(
        { error: 'GitHub OAuth is not configured' },
        { status: 500 }
      );
    }

    if (redirect_uri) {
      let providedRedirectUrl: URL;
      let allowedRedirectUrl: URL;

      try {
        providedRedirectUrl = new URL(redirect_uri);
        allowedRedirectUrl = new URL(configuredRedirectUri);
      } catch {
        logger.warn(
          {
            redirectUri: redirect_uri,
          },
          'Invalid redirect URI provided for GitHub OAuth'
        );

        return NextResponse.json(
          {
            error: {
              code: 'INVALID_REDIRECT_URI',
              message: 'Invalid redirect URI',
            },
          },
          { status: 400 }
        );
      }

      if (
        providedRedirectUrl.origin !== allowedRedirectUrl.origin ||
        providedRedirectUrl.pathname !== allowedRedirectUrl.pathname
      ) {
        logger.warn(
          {
            redirectUri: redirect_uri,
          },
          'Disallowed redirect URI provided for GitHub OAuth'
        );

        return NextResponse.json(
          {
            error: {
              code: 'DISALLOWED_REDIRECT_URI',
              message: 'Redirect URI is not allowed',
            },
          },
          { status: 400 }
        );
      }
    }

    // Generate GitHub authorization URL
    const authUrl = generateGitHubOAuthURL(
      clientId,
      redirect_uri || configuredRedirectUri,
      stateToken,
      ['repo', 'read:org', 'workflow']
    );

    logger.info(
      {
        redirectUri: redirect_uri || configuredRedirectUri,
        scopes: ['repo', 'read:org', 'workflow'],
      },
      'Initiating GitHub OAuth flow via POST'
    );

    metrics.increment('github_oauth_initiated');

    // Return authorization URL and state (for frontend-initiated flow)
    const response = NextResponse.json({
      authUrl: authUrl.toString(),
      state: stateToken,
    });

    // Store state token in httpOnly cookie for CSRF validation
    response.cookies.set('github_oauth_state', stateToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'GitHub OAuth initiation POST route error'
    );

    metrics.increment('github_oauth_init_error');

    return NextResponse.json(
      { error: 'Failed to initiate GitHub OAuth' },
      { status: 500 }
    );
  }
}
