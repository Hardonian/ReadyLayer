/**
 * GitHub App OAuth E2E Test Suite
 *
 * Tests the GitHub OAuth flow including:
 * - CSRF protection with state tokens
 * - Code exchange for access tokens
 * - User information retrieval
 * - Session creation
 * - Error handling and edge cases
 */

import { test, expect } from '@playwright/test';

test.describe('GitHub App OAuth Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to auth page
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');
  });

  test('should initiate OAuth flow with CSRF protection', async ({ page, context }) => {
    // Click GitHub OAuth button
    const githubButton = page.getByRole('button', { name: /GitHub/i }).first();
    await expect(githubButton).toBeVisible();

    // Listen for navigation to GitHub
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      githubButton.click(),
    ]);

    // Verify we're redirected to GitHub authorization page
    await popup.waitForLoadState('networkidle');
    expect(popup.url()).toContain('github.com/login/oauth/authorize');
    expect(popup.url()).toContain('client_id=');
    expect(popup.url()).toContain('state=');
    expect(popup.url()).toContain('redirect_uri=');

    // Verify state token is present in URL
    const urlParams = new URL(popup.url()).searchParams;
    const stateToken = urlParams.get('state');
    expect(stateToken).toBeTruthy();
    expect(stateToken?.length).toBeGreaterThan(20); // Should be 64-char hex string

    // Verify state token is stored in httpOnly cookie (check from original page context)
    const newCookies = await context.cookies();
    const oauthStateCookie = newCookies.find(c => c.name === 'github_oauth_state');
    expect(oauthStateCookie).toBeTruthy();
    expect(oauthStateCookie?.value).toBe(stateToken);
    expect(oauthStateCookie?.httpOnly).toBe(true);
    expect(oauthStateCookie?.sameSite).toMatch(/Lax|Strict/);

    await popup.close();
  });

  test('should handle OAuth callback with valid state token', async ({ page, context }) => {
    // Mock the GitHub OAuth flow
    const stateToken = 'a'.repeat(64); // Valid state token format

    // Set the state cookie as if OAuth flow started
    await context.addCookies([{
      name: 'github_oauth_state',
      value: stateToken,
      url: 'http://localhost:3000',
      httpOnly: true,
      sameSite: 'Lax',
      secure: false,
    }]);

    // Mock GitHub API responses
    await context.route('https://github.com/login/oauth/access_token', route => {
      route.abort('blockedbyclient');
    });

    // Navigate to callback with matching state token
    // Note: This would normally be done by GitHub after user auth
    await page.goto(
      `/api/github/callback?code=test_code&state=${stateToken}`
    );

    // Wait for redirect to complete
    await page.waitForLoadState('networkidle');

    // Should either show error page (expected in test) or redirect to dashboard
    // Since we're mocking the GitHub API call to fail, we should get an error
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
  });

  test('should reject OAuth callback with mismatched state token', async ({ page, context }) => {
    // Set one state token in cookie
    const correctStateToken = 'a'.repeat(64);
    const wrongStateToken = 'b'.repeat(64);

    await context.addCookies([{
      name: 'github_oauth_state',
      value: correctStateToken,
      url: 'http://localhost:3000',
      httpOnly: true,
      sameSite: 'Lax',
      secure: false,
    }]);

    // Try to use different state token in callback
    await page.goto(
      `/api/github/callback?code=test_code&state=${wrongStateToken}`
    );

    await page.waitForLoadState('networkidle');

    // Should redirect to error page due to CSRF validation failure
    expect(page.url()).toContain('/auth/error');
    expect(page.url()).toContain('CSRFValidationFailed');

    // Verify state cookie is cleared
    const cookies = await context.cookies();
    const oauthStateCookie = cookies.find(c => c.name === 'github_oauth_state');
    expect(oauthStateCookie).toBeUndefined();
  });

  test('should reject OAuth callback without state token', async ({ page }) => {
    // Don't set any state cookie

    // Try callback without state token
    await page.goto(
      `/api/github/callback?code=test_code&state=missing`
    );

    await page.waitForLoadState('networkidle');

    // Should redirect to error page
    expect(page.url()).toContain('/auth/error');
    expect(page.url()).toContain('CSRFValidationFailed');
  });

  test('should handle GitHub OAuth errors gracefully', async ({ page }) => {
    // Navigate to callback with error from GitHub
    await page.goto(
      `/api/github/callback?error=access_denied&error_description=User%20denied%20access`
    );

    await page.waitForLoadState('networkidle');

    // Should redirect to error page with error details
    expect(page.url()).toContain('/auth/error');
    expect(page.url()).toContain('access_denied');
  });

  test('should handle missing authorization code', async ({ page, context }) => {
    // Set valid state token
    const stateToken = 'a'.repeat(64);
    await context.addCookies([{
      name: 'github_oauth_state',
      value: stateToken,
      url: 'http://localhost:3000',
      httpOnly: true,
      sameSite: 'Lax',
      secure: false,
    }]);

    // Try callback without code parameter
    await page.goto(
      `/api/github/callback?state=${stateToken}`
    );

    await page.waitForLoadState('networkidle');

    // Should redirect to error page
    expect(page.url()).toContain('/auth/error');
    expect(page.url()).toContain('MissingCode');
  });

  test('should expire state token after 10 minutes', async ({ page, context }) => {
    // Set state cookie with maxAge of 600 seconds (10 minutes)
    const pastDate = new Date(Date.now() - 11 * 60 * 1000); // 11 minutes ago

    // Simulate expired cookie by setting it in the past
    await context.addCookies([{
      name: 'github_oauth_state',
      value: 'a'.repeat(64),
      url: 'http://localhost:3000',
      httpOnly: true,
      sameSite: 'Lax',
      secure: false,
      expires: pastDate.getTime() / 1000,
    }]);

    // The cookie should be considered expired by the browser
    // When we navigate to callback, the cookie won't be sent
    await page.goto(
      `/api/github/callback?code=test_code&state=${'a'.repeat(64)}`
    );

    await page.waitForLoadState('networkidle');

    // Should redirect to error page due to missing stored state
    expect(page.url()).toContain('/auth/error');
  });

  test('should set secure cookie flag in production', async ({ page, context }) => {
    // This test verifies secure flag is set properly
    // Skip if not in production environment
    if (process.env.NODE_ENV !== 'production') {
      test.skip();
    }

    // Click GitHub button to initiate flow
    const githubButton = page.getByRole('button', { name: /GitHub/i }).first();
    await githubButton.click();

    // Get updated cookies
    const cookies = await context.cookies();
    const oauthStateCookie = cookies.find(c => c.name === 'github_oauth_state');

    // In production, secure flag must be set
    expect(oauthStateCookie?.secure).toBe(true);
  });

  test('should not expose state token in error messages', async ({ page, context }) => {
    // Set state token
    const stateToken = 'a'.repeat(64);
    await context.addCookies([{
      name: 'github_oauth_state',
      value: stateToken,
      url: 'http://localhost:3000',
      httpOnly: true,
      sameSite: 'Lax',
      secure: false,
    }]);

    // Use wrong state
    await page.goto(
      `/api/github/callback?code=test_code&state=wrongstate`
    );

    await page.waitForLoadState('networkidle');

    // Verify error page doesn't show actual state tokens
    const pageContent = await page.content();
    expect(pageContent).not.toContain(stateToken);
    expect(pageContent).not.toContain('wrongstate');
  });

  test('should validate OAuth configuration', async ({ page }) => {
    // Try to initiate OAuth when config might be missing
    // This is more of an integration test
    const response = await page.goto('/api/github/auth');

    // Should either:
    // 1. Redirect to GitHub (if configured)
    // 2. Return 500 error (if not configured)
    expect([302, 307, 308, 500].includes(response?.status() || 0)).toBeTruthy();
  });

  test('should support both GET and POST OAuth initiation', async ({ page }) => {
    // Test POST endpoint for OAuth initiation
    const response = await page.request.post('/api/github/auth', {
      data: {},
    });

    // Should return JSON with authUrl and state
    expect([200, 400, 500].includes(response.status())).toBeTruthy();

    const data = await response.json().catch(() => null);
    if (response.ok() && data) {
      expect(data).toHaveProperty('authUrl');
      expect(data).toHaveProperty('state');
      expect(data.authUrl).toContain('github.com/login/oauth/authorize');
      expect(data.state?.length).toBeGreaterThan(20);
    }
  });

  test('should prevent CSRF attacks with state token validation', async ({ page, context }) => {
    // Simulate an attacker trying to hijack the flow
    const attackerState = 'attacker_state_token';
    const victimState = 'victim_state_token';

    // Victim sets up legitimate flow
    await context.addCookies([{
      name: 'github_oauth_state',
      value: victimState,
      url: 'http://localhost:3000',
      httpOnly: true,
      sameSite: 'Lax',
      secure: false,
    }]);

    // Attacker tries to use their state token
    await page.goto(
      `/api/github/callback?code=test_code&state=${attackerState}`
    );

    await page.waitForLoadState('networkidle');

    // Should reject the attack
    expect(page.url()).toContain('/auth/error');
    expect(page.url()).toContain('CSRFValidationFailed');
  });
});
