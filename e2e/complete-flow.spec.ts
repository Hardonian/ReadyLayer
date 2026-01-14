/**
 * Complete Flow E2E Test
 * 
 * Tests the entire user journey from signup through the first enforced PR review.
 * This is the gold standard test that verifies all major features work together.
 */

import { test, expect } from '@playwright/test';

test.describe('Complete ReadyLayer Flow', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const testEmail = `test-${Date.now()}@readylayer.test`;
  const testPassword = 'TestPassword123!@#';

  test('User can sign up, connect GitHub, and receive PR enforcement', async ({
    page,
    context,
  }) => {
    // Step 1: Navigate to landing page
    await page.goto(`${baseUrl}/`);
    await expect(page).toHaveTitle(/ReadyLayer/);

    // Step 2: Sign up
    await page.click('text=Get Started');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Sign Up")');

    // Wait for redirect to dashboard
    await page.waitForURL(`${baseUrl}/dashboard`);
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Step 3: See onboarding checklist
    const checklist = page.locator('[data-testid="onboarding-checklist"]');
    await expect(checklist).toBeVisible();

    // Step 4: Connect GitHub repository
    await page.click('button:has-text("Connect Repository")');
    await page.waitForURL(/.*github.com.*authorize/);

    // Create a new page for GitHub OAuth
    const githubPage = await context.newPage();
    await githubPage.goto(page.url());

    // The test would continue with actual GitHub OAuth flow
    // For testing purposes, we'll mock the redirect back
    await page.goto(`${baseUrl}/api/github/callback?code=test-code&state=test-state`);

    // Wait for dashboard with connected repo
    await page.waitForURL(`${baseUrl}/dashboard`);
    await expect(page.locator('text=Repositories')).toBeVisible();

    // Step 5: View connected repositories
    await page.click('a[href="/dashboard/repos"]');
    const repoList = page.locator('[data-testid="repository-list"]');
    await expect(repoList).toBeVisible();

    // Step 6: Enable policies on repository
    const firstRepo = page.locator('[data-testid="repo-item"]').first();
    await firstRepo.click();
    await page.click('button:has-text("Configure Policy")');

    // Select a policy template
    await page.click('text=OWASP Top 10');
    await page.click('button:has-text("Use This Template")');

    // Step 7: Create a test PR with policy violation
    await page.click('button:has-text("Create Test PR")');
    const prTitle = `Test PR ${Date.now()}`;
    await page.fill('input[placeholder="PR Title"]', prTitle);

    const violatingCode = `
const apiKey = 'sk-proj-1234567890abcdefghij';
const response = await fetch('http://insecure-api.example.com');
    `;
    await page.fill('textarea[placeholder="Code"]', violatingCode);
    await page.click('button:has-text("Submit PR")');

    // Step 8: Verify PR is blocked with violations
    await page.waitForURL(/.*\/runs\/*/);
    const reviewStatus = page.locator('[data-testid="review-status"]');
    await expect(reviewStatus).toContainText('Blocked');

    // Verify violations are displayed
    const violations = page.locator('[data-testid="violation-item"]');
    await expect(violations).toHaveCount(2); // API key and HTTP violation

    // Step 9: View detailed findings
    await page.click('button:has-text("View Details")');
    const details = page.locator('[data-testid="violation-details"]');
    await expect(details).toBeVisible();

    // Verify remediation guidance
    await expect(page.locator('text=Use parameterized queries')).toBeVisible();

    // Step 10: Receive notification
    // Check dashboard for notification badge
    const notificationBadge = page.locator('[data-testid="notification-badge"]');
    const badgeText = await notificationBadge.textContent();
    expect(parseInt(badgeText || '0')).toBeGreaterThan(0);

    // Step 11: Mark as reviewed
    await page.click('button:has-text("Mark as Reviewed")');
    await expect(page.locator('text=Acknowledged')).toBeVisible();

    // Step 12: Check onboarding progress
    await page.goto(`${baseUrl}/dashboard`);
    const completedItems = page.locator('[data-testid="checklist-item-completed"]');
    const itemCount = await completedItems.count();
    expect(itemCount).toBeGreaterThan(0);

    // Step 13: View analytics
    await page.click('a[href="/dashboard/analytics/health"]');
    const metrics = page.locator('[data-testid="metric-card"]');
    await expect(metrics).toHaveCount(4); // At least 4 metrics

    // Verify metrics are populated
    const firstMetric = metrics.first();
    const value = await firstMetric.locator('[data-testid="metric-value"]').textContent();
    expect(value).not.toBeNull();

    // Step 14: Check billing/usage
    await page.click('a[href="/dashboard/billing/usage"]');
    const usageChart = page.locator('[data-testid="usage-chart"]');
    await expect(usageChart).toBeVisible();

    // Step 15: Verify PR is properly recorded
    await page.click('a[href="/dashboard/prs"]');
    const prRow = page.locator(`text=${prTitle}`);
    await expect(prRow).toBeVisible();

    // Verify enforcement happened
    const statusBadge = prRow.locator('[data-testid="status-badge"]');
    await expect(statusBadge).toContainText('Blocked');
  });

  test('Invited user can accept invitation and access dashboard', async ({
    page,
  }) => {
    // Step 1: Simulate invitation email link
    const inviteToken = 'test-invite-token-12345';
    await page.goto(`${baseUrl}/auth/signin?invite=${inviteToken}`);

    // Step 2: User should see accept invitation page
    const acceptButton = page.locator('button:has-text("Accept Invitation")');
    await expect(acceptButton).toBeVisible();

    // Step 3: Accept invitation
    await acceptButton.click();

    // Step 4: Set password
    await page.fill('input[type="password"]', 'NewPassword123!@#');
    await page.fill('input[placeholder="Confirm Password"]', 'NewPassword123!@#');
    await page.click('button:has-text("Complete Sign Up")');

    // Step 5: Verify access to shared org dashboard
    await page.waitForURL(`${baseUrl}/dashboard`);
    await expect(page.locator('text=Organization Dashboard')).toBeVisible();

    // Step 6: Verify user role is respected
    const adminButton = page.locator('a[href="/dashboard/admin"]');
    // Depending on role, admin button may or may not be visible
    if (await adminButton.isVisible()) {
      await adminButton.click();
      await expect(page.locator('text=Organization Settings')).toBeVisible();
    }
  });

  test('Free tier user sees upgrade prompt when hitting limits', async ({
    page,
  }) => {
    // This test would require setting up a free tier account
    // and simulating hitting the usage limits
    
    // Step 1: Login as free tier user
    await page.goto(`${baseUrl}/auth/signin`);
    // ... login flow ...

    // Step 2: Navigate to policy enforcement page
    await page.goto(`${baseUrl}/dashboard/policies`);

    // Step 3: Try to create multiple custom policies
    for (let i = 0; i < 4; i++) {
      await page.click('button:has-text("Create Policy")');
      // ... fill policy form ...
      await page.click('button:has-text("Save")');
    }

    // Step 4: On next policy creation, should see upgrade prompt
    await page.click('button:has-text("Create Policy")');
    const upgradePrompt = page.locator('[data-testid="upgrade-prompt"]');
    await expect(upgradePrompt).toBeVisible();

    // Step 5: Click upgrade
    await page.click('button:has-text("Upgrade to Pro")');
    await page.waitForURL(/.*stripe.com|pricing/);
  });

  test('Admin can manage team and policies from admin panel', async ({
    page,
  }) => {
    // Step 1: Navigate to admin panel
    await page.goto(`${baseUrl}/dashboard/admin`);

    // Step 2: View organization stats
    const stats = page.locator('[data-testid="stat-card"]');
    await expect(stats).toHaveCount(4);

    // Step 3: Go to user management
    await page.click('a[href="/dashboard/admin/users"]');

    // Step 4: Invite a user
    await page.click('button:has-text("Invite User")');
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('team@example.com');
    await page.click('button:has-text("Send Invites")');

    // Verify success message
    await expect(page.locator('text=Invitations sent')).toBeVisible();

    // Step 5: Go to policies
    await page.click('a[href="/dashboard/admin/policies"]');

    // Step 6: View default policy
    const defaultPolicy = page.locator('[data-testid="default-policy"]');
    await expect(defaultPolicy).toBeVisible();

    // Step 7: Create custom policy
    await page.click('button:has-text("Create Policy")');
    await page.click('text=SOC 2');
    await page.click('button:has-text("Use This Template")');

    // Step 8: Review policy rules
    const rules = page.locator('[data-testid="policy-rule"]');
    await expect(rules).toHaveCount(4); // SOC 2 has 4 rules

    // Step 9: Apply policy to repositories
    await page.click('button:has-text("Apply to Repositories")');
    const repoCheckboxes = page.locator('input[type="checkbox"]');
    await repoCheckboxes.first().check();
    await page.click('button:has-text("Confirm")');

    // Verify application
    await expect(page.locator('text=Policy applied')).toBeVisible();
  });
});
