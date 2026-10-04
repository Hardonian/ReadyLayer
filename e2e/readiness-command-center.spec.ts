import { expect, test, type Page } from '@playwright/test';
import {
  mockAuthenticatedSession,
  setupVisualTest,
  waitForVisualStability,
} from './utils/visual-helpers';

const readinessMetrics = {
  windowDays: 30,
  totalRuns: 42,
  completedRuns: 40,
  aiTouchedCount: 19,
  aiTouchedPercentage: 0.452,
  gatePassRate: 0.875,
  blockedRuns: 5,
  riskScoreTrend: -0.08,
  averageLineCoverage: 84.2,
  coverageDelta: 3.4,
  docDriftIncidents: 2,
  meanRunDurationMinutes: 6.8,
  supplyChainViolations: 2,
  provenancePacks: 36,
};

async function mockReadinessData(page: Page): Promise<void> {
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
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockAuthenticatedSession(page);
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
    await waitForVisualStability(page);

    await expect(
      page.getByRole('heading', { name: 'Readiness & trust command center' })
    ).toBeVisible();
    await expect(page.getByText('Supply-chain review')).toBeVisible();
    await expect(page.getByText('42', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Observe', { exact: true })).toBeVisible();
    await expect(page.getByText('Decide', { exact: true })).toBeVisible();
    await expect(page.getByText('Enforce', { exact: true })).toBeVisible();
    await expect(page.getByText('Prove', { exact: true })).toBeVisible();

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
    await waitForVisualStability(page);

    await expect(
      page.getByRole('heading', { name: 'Readiness & trust command center' })
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Operator brief' })).toBeVisible();

    const hasBodyOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(hasBodyOverflow).toBe(false);
  });
});
