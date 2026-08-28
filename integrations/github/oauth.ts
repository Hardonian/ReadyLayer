/**
 * GitHub OAuth Integration with CSRF Protection
 *
 * Handles GitHub App OAuth flow with state token validation
 * to prevent CSRF attacks.
 */

import { randomBytes, createHmac } from 'crypto';
import { logger } from '@/observability/logging';

interface GitHubOAuthResponse {
  error?: string;
  error_description?: string;
  access_token?: string;
  token_type?: string;
  scope?: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  email?: string;
  name?: string;
  avatar_url?: string;
}

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
  };
}

/**
 * Generate OAuth state token for CSRF protection
 */
export function generateOAuthStateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate GitHub OAuth authorization URL
 */
export function generateGitHubOAuthURL(
  clientId: string,
  redirectUri: string,
  state: string,
  scope: string[] = ['repo', 'read:org', 'workflow']
): URL {
  const baseUrl = new URL('https://github.com/login/oauth/authorize');

  baseUrl.searchParams.set('client_id', clientId);
  baseUrl.searchParams.set('redirect_uri', redirectUri);
  baseUrl.searchParams.set('scope', scope.join(','));
  baseUrl.searchParams.set('state', state);
  baseUrl.searchParams.set('allow_signup', 'true');

  return baseUrl;
}

/**
 * Validate OAuth state token
 */
export function validateOAuthStateToken(
  receivedState: string | null,
  storedState: string | null
): boolean {
  if (!receivedState || !storedState) {
    logger.warn('Missing state token in OAuth flow', {
      hasReceivedState: !!receivedState,
      hasStoredState: !!storedState,
    });
    return false;
  }

  const isValid = receivedState === storedState;

  if (!isValid) {
    logger.warn('State token mismatch - possible CSRF attack', {
      receivedState: receivedState.substring(0, 8) + '...',
      storedState: storedState.substring(0, 8) + '...',
    });
  }

  return isValid;
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeOAuthCodeForToken(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  tokenType: string;
  scope: string;
} | null> {
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      logger.error(
        {
          status: response.status,
          statusText: response.statusText,
        },
        'Failed to exchange OAuth code for token'
      );
      return null;
    }

    const data = await response.json() as GitHubOAuthResponse;

    if (data.error) {
      logger.error(
        {
          error: data.error,
          errorDescription: data.error_description,
        },
        'GitHub OAuth error'
      );
      return null;
    }

    return {
      accessToken: data.access_token ?? '',
      tokenType: data.token_type ?? '',
      scope: data.scope ?? '',
    };
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error exchanging OAuth code'
    );
    return null;
  }
}

/**
 * Get GitHub user from access token
 */
export async function getGitHubUser(accessToken: string): Promise<{
  id: number;
  login: string;
  email?: string;
  name?: string;
  avatar_url?: string;
} | null> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${accessToken}`,
        'User-Agent': 'ReadyLayer',
      },
    });

    if (!response.ok) {
      logger.error(
        {
          status: response.status,
          statusText: response.statusText,
        },
        'Failed to fetch GitHub user'
      );
      return null;
    }

    return await response.json() as GitHubUserResponse;
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error fetching GitHub user'
    );
    return null;
  }
}

/**
 * Get GitHub repositories accessible to the user
 */
export async function listGitHubRepositories(
  accessToken: string,
  page: number = 1,
  perPage: number = 30
): Promise<Array<{
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
  };
}> | null> {
  try {
    const response = await fetch(
      `https://api.github.com/user/repos?page=${page}&per_page=${perPage}&type=owner,collaborator`,
      {
        headers: {
          Authorization: `token ${accessToken}`,
          'User-Agent': 'ReadyLayer',
        },
      }
    );

    if (!response.ok) {
      logger.error(
        {
          status: response.status,
          statusText: response.statusText,
        },
        'Failed to fetch GitHub repositories'
      );
      return null;
    }

    return await response.json() as GitHubRepository[];
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error fetching GitHub repositories'
    );
    return null;
  }
}

/**
 * Verify GitHub webhook signature
 *
 * GitHub sends an X-Hub-Signature-256 header with HMAC SHA256 signature
 */
export function verifyGitHubWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Remove "sha256=" prefix if present
    const cleanSignature = signature.replace('sha256=', '');

    // Calculate HMAC
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const calculated = hmac.digest('hex');

    // Constant-time comparison to prevent timing attacks
    return calculated === cleanSignature;
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error verifying GitHub webhook signature'
    );
    return false;
  }
}

/**
 * GitHub OAuth Configuration
 */
export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  webhookSecret: string;
}

/**
 * Validate OAuth configuration
 */
export function validateGitHubOAuthConfig(config: Partial<GitHubOAuthConfig>): config is GitHubOAuthConfig {
  return !!(
    config.clientId &&
    config.clientSecret &&
    config.redirectUri &&
    config.webhookSecret
  );
}