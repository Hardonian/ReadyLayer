/**
 * GitHub OAuth Callback Route
 *
 * Handles GitHub OAuth callback with:
 * - CSRF state token validation
 * - Code-to-token exchange
 * - User session creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateOAuthStateToken, exchangeOAuthCodeForToken, getGitHubUser } from '@/integrations/github/oauth';
import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';
import { cookies } from 'next/headers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Check for OAuth errors
    if (error) {
      logger.warn(
        {
          error,
          errorDescription,
        },
        'GitHub OAuth error'
      );

      metrics.increment('github_oauth_error', { errorType: error });

      return NextResponse.redirect(
        new URL(
          `/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || 'Unknown error')}`,
          request.url
        )
      );
    }

    // Validate required parameters
    if (!code) {
      logger.warn('Missing authorization code in GitHub OAuth callback');
      metrics.increment('github_oauth_error', { errorType: 'missing_code' });

      return NextResponse.redirect(
        new URL('/auth/error?error=MissingCode', request.url)
      );
    }

    // Get stored state from session/cookies
    const cookieStore = await cookies();
    const storedState = cookieStore.get('github_oauth_state')?.value ?? null;

    // Validate CSRF token (state parameter)
    if (!validateOAuthStateToken(state, storedState)) {
      logger.error(
        'CSRF token validation failed in GitHub OAuth callback',
        {
          hasState: !!state,
          hasStoredState: !!storedState,
        }
      );

      metrics.increment('github_oauth_csrf_validation_failed');

      // Clear the stored state
      const response = NextResponse.redirect(
        new URL('/auth/error?error=CSRFValidationFailed', request.url)
      );
      response.cookies.delete('github_oauth_state');

      return response;
    }

    // Get OAuth configuration from environment
    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/github/callback`;

    if (!clientId || !clientSecret) {
      logger.error('GitHub OAuth configuration missing');
      metrics.increment('github_oauth_config_error');

      return NextResponse.redirect(
        new URL('/auth/error?error=ConfigurationError', request.url)
      );
    }

    // Exchange code for access token
    const tokenResult = await exchangeOAuthCodeForToken(
      clientId,
      clientSecret,
      code,
      redirectUri
    );

    if (!tokenResult) {
      logger.error('Failed to exchange GitHub OAuth code for token');
      metrics.increment('github_oauth_token_exchange_failed');

      return NextResponse.redirect(
        new URL('/auth/error?error=TokenExchangeFailed', request.url)
      );
    }

    // Get GitHub user info
    const githubUser = await getGitHubUser(tokenResult.accessToken);

    if (!githubUser) {
      logger.error('Failed to fetch GitHub user info');
      metrics.increment('github_oauth_user_fetch_failed');

      return NextResponse.redirect(
        new URL('/auth/error?error=UserFetchFailed', request.url)
      );
    }

    logger.info(
      {
        githubId: githubUser.id,
        githubLogin: githubUser.login,
      },
      'GitHub OAuth authentication successful'
    );

    metrics.increment('github_oauth_success');

    // TODO: Create or update user in database with GitHub credentials
    // This would typically involve:
    // 1. Checking if user exists by GitHub ID
    // 2. Creating new user if doesn't exist
    // 3. Storing GitHub access token (encrypted)
    // 4. Creating authenticated session

    // For now, redirect to dashboard
    const response = NextResponse.redirect(
      new URL('/dashboard?oauth=github&user=' + githubUser.login, request.url)
    );

    // Clear the stored state
    response.cookies.delete('github_oauth_state');

    return response;
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'GitHub OAuth callback route error'
    );

    metrics.increment('github_oauth_callback_error');

    return NextResponse.redirect(
      new URL('/auth/error?error=CallbackError', request.url)
    );
  }
}
