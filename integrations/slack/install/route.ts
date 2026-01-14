import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      return NextResponse.json(
        { error: 'No authorization code provided' },
        { status: 400 }
      );
    }

    // Validate state parameter for CSRF protection
    const storedState = request.cookies.get('slack_oauth_state')?.value;
    if (!state || state !== storedState) {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      );
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID || '',
        client_secret: process.env.SLACK_CLIENT_SECRET || '',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://readylayer.io'}/integrations/slack/install/callback`,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      return NextResponse.json(
        { error: tokenData.error || 'Failed to get access token' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Store Slack workspace configuration
    const { error: updateError } = await supabase
      .from('notification_configs')
      .upsert(
        {
          user_id: user.id,
          slack_workspace_id: tokenData.team.id,
          slack_workspace_name: tokenData.team.name,
          slack_bot_user_id: tokenData.bot_user_id,
          slack_access_token: tokenData.access_token,
          slack_token_type: tokenData.token_type,
          slack_scope: tokenData.scope,
          slack_installed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (updateError) throw updateError;

    // Clear state cookie
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://readylayer.io'}/dashboard/settings?slack=installed`
    );
    response.cookies.delete('slack_oauth_state');

    return response;
  } catch (error) {
    console.error('Slack OAuth error:', error);
    return NextResponse.json(
      { error: 'Failed to complete Slack installation' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Start Slack OAuth flow
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate state parameter for CSRF protection
    const state = generateRandomState();

    const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
    slackAuthUrl.searchParams.append('client_id', process.env.SLACK_CLIENT_ID || '');
    slackAuthUrl.searchParams.append(
      'redirect_uri',
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://readylayer.io'}/integrations/slack/install/callback`
    );
    slackAuthUrl.searchParams.append('state', state);
    slackAuthUrl.searchParams.append('scope', 'channels:read,chat:write,commands');
    slackAuthUrl.searchParams.append('user_scope', 'users:read');

    const response = NextResponse.json({ authUrl: slackAuthUrl.toString() });

    // Set state cookie (httpOnly, secure, sameSite)
    response.cookies.set('slack_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300, // 5 minutes
    });

    return response;
  } catch (error) {
    console.error('Error starting Slack OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to start Slack installation' },
      { status: 500 }
    );
  }
}

function generateRandomState(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
