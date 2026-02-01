/**
 * Slack OAuth Installation Endpoint
 * 
 * Handles Slack OAuth flow for workspace installation
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
// SLACK_CLIENT_SECRET reserved for OAuth callback handling
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI ||
  `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/integrations/slack/callback`;

/**
 * GET /integrations/slack/install
 * Initiate Slack OAuth flow
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    if (!SLACK_CLIENT_ID) {
      logger.error('Slack client ID not configured');
      metrics.increment('slack_install_error', { type: 'missing_config' });
      return NextResponse.json(
        { error: 'Slack integration not configured' },
        { status: 500 }
      );
    }

    const scope = [
      'chat:write',
      'chat:write.public',
      'commands',
      'incoming-webhook',
      'users:read',
      'team:read',
    ].join(',');

    const authUrl = new URL('https://slack.com/oauth/v2/authorize');
    authUrl.searchParams.append('client_id', SLACK_CLIENT_ID);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('redirect_uri', SLACK_REDIRECT_URI);
    authUrl.searchParams.append('state', generateStateToken());

    logger.info(
      {
        redirectUri: SLACK_REDIRECT_URI,
      },
      'Initiating Slack OAuth flow'
    );

    metrics.increment('slack_oauth_initiated');

    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Slack installation route error'
    );

    metrics.increment('slack_install_error', { type: 'exception' });

    return NextResponse.json(
      { error: 'Failed to initiate Slack installation' },
      { status: 500 }
    );
  }
}

/**
 * POST /integrations/slack/install
 * Alternative POST endpoint for installation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { workspace_id } = await request.json() as { workspace_id?: string };

    if (!SLACK_CLIENT_ID) {
      logger.error('Slack client ID not configured');
      return NextResponse.json(
        { error: 'Slack integration not configured' },
        { status: 500 }
      );
    }

    const scope = [
      'chat:write',
      'chat:write.public',
      'commands',
      'incoming-webhook',
      'users:read',
      'team:read',
    ].join(',');

    const authUrl = new URL('https://slack.com/oauth/v2/authorize');
    authUrl.searchParams.append('client_id', SLACK_CLIENT_ID);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('redirect_uri', SLACK_REDIRECT_URI);
    authUrl.searchParams.append('state', generateStateToken());

    logger.info(
      {
        redirectUri: SLACK_REDIRECT_URI,
        workspaceId: workspace_id,
      },
      'Initiating Slack OAuth flow via POST'
    );

    metrics.increment('slack_oauth_initiated');

    return NextResponse.json({
      authUrl: authUrl.toString(),
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Slack installation POST error'
    );

    return NextResponse.json(
      { error: 'Failed to generate Slack installation URL' },
      { status: 500 }
    );
  }
}

/**
 * Generate state token for CSRF protection
 */
function generateStateToken(): string {
  return randomBytes(32).toString('hex');
}