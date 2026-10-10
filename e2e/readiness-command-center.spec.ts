import { expect, test, type Page } from '@playwright/test';
import {
  mockAuthenticatedSession,
  mockConsistentData,
  setupVisualTest,
} from './utils/visual-helpers';

const readinessMetrics = {
  windowDays: 30,
  totalRuns: 42,
  evaluatedRuns: 40,
  aiTouchedCount: 19,
  aiTouchedPercentage: 0.452,
  gatePassRate: 0.875,
  blockedRuns: 5,
  policyBlockRateDelta: -0.08,
  averageLineCoverage: 84.2,
  coverageDelta: 3.4,
  docDriftIncidents: 2,
  meanRunDurationMinutes: 6.8,
  supplyChainViolations: 2,
  provenancePacks: 36,
};

async function mockReadinessData(page: Page): Promise<void> {
  // Global notification bell fetch on every authenticated page; the real
  // route 500s without a DB and becomes a console error the spec forbids.
  await page.route('**/api/v1/notifications*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { notifications: [], unreadCount: 0 } }),
    });
  });

  // The app shell fetches the current organization; without a session-backed
  // org (no DB in CI) it 401s and the shell replaces the page with a
  // "Session not found" error state, so the operator brief never renders.
  await page.route('**/api/v1/organizations/current*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          organization: {
            id: 'org-visual',
            name: 'Acme Corp',
            slug: 'acme-corp',
            plan: 'pro',
            role: 'owner',
            repositoryCount: 1,
          },
        },
      }),
    });
  });

  await page.route('**/api/v1/repos?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        repositories: [{ id: 'repo-visual', name: 'operator-console' }],
        pagination: { total: 1, limit: 1, offset: 0, hasMore: false },
      }),
    });
  });

  await page.route('**/api/v1/repos/repo-visual', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { id: 'repo-visual', organizationId: 'org-visual' } }),
    });
  });

  await page.route('**/api/v1/metrics?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { metrics: readinessMetrics } }),
    });
  });
}

test.describe('Readiness command center', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockAuthenticatedSession(page);
    // General /api/v1 catch-all + ui-config mock first: Playwright resolves
    // page.route in reverse registration order, so the spec-specific mocks
    // below win for the routes they cover.
    await mockConsistentData(page);
    await mockReadinessData(page);
  });

  test('turns live telemetry into an interactive operator brief', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/dashboard/readiness');

    await expect(
      page.getByRole('heading', { name: 'Readiness & trust command center' })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Supply-chain review')).toBeVisible();
    await expect(page.getByText('42', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Observe', { exact: true })).toBeVisible();
    await expect(page.getByText('Decide', { exact: true })).toBeVisible();
    await expect(page.getByText('Enforce', { exact: true })).toBeVisible();
    await expect(page.getByText('Prove', { exact: true })).toBeVisible();
    await page.waitForFunction(() => document.fonts.ready);
    await page.waitForTimeout(200);

    await test.info().attach('readiness-operator-brief', {
      body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
      contentType: 'image/png',
    });

    await page.getByRole('tab', { name: 'First 90 days' }).click();
    await expect(
      page.getByRole('heading', { name: /The First 90 Days/i })
    ).toBeVisible();

    const firstMilestone = page.getByRole('button', {
      name: /Connect Primary Enterprise Repositories/i,
    });
    await firstMilestone.click();
    await expect(firstMilestone).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: /Export Executive Briefing/i }).click();
    const dialog = page.getByRole('dialog', { name: /Executive 90-Day Governance Briefing/i });
    await expect(dialog).toContainText('not a compliance certification');
    await page.getByRole('button', { name: 'Close executive briefing' }).click();

    await expect(page.locator('[data-nextjs-dialog]')).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('keeps the cockpit usable on a phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/readiness');

    await expect(
      page.getByRole('heading', { name: 'Readiness & trust command center' })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('tab', { name: 'Operator brief' })).toBeVisible();

    const hasBodyOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(hasBodyOverflow).toBe(false);
  });
});
