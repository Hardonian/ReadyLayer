/**
 * GitHub App Installation Redirect
 *
 * Redirects user to GitHub to install the ReadyLayer GitHub App
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/observability/logging';
import { requireAuth } from '@/lib/auth';
import { validateReturnUrl } from '@/lib/redirect-validation';

const GITHUB_APP_SLUG = process.env.GITHUB_APP_SLUG || 'readylayer';

/**
 * GET /api/integrations/github/install
 *
 * Initiates GitHub App installation flow
 */
export async function GET(req: NextRequest) {
  try {
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
        provider: 'github',
        returnUrl,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // Build GitHub App installation URL
    const installUrl = new URL(`https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`);
    installUrl.searchParams.set('state', state);

    // Optional: Pre-select organization if user has GitHub org linked
    const suggestedTargetId = req.nextUrl.searchParams.get('suggested_target_id');
    if (suggestedTargetId) {
      installUrl.searchParams.set('suggested_target_id', suggestedTargetId);
    }

    logger.info(
      {
        userId,
        organizationId,
        state: stateHash, // Log hash, not plaintext
      },
      'Redirecting to GitHub App installation'
    );

    // Redirect to GitHub
    return NextResponse.redirect(installUrl.toString());
  } catch (error) {
    logger.error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
      },
      'GitHub App installation redirect failed'
    );

    return NextResponse.json(
      { error: 'Failed to initiate GitHub App installation' },
      { status: 500 }
    );
  }
}
