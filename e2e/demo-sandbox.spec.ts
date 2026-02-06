import { test, expect } from '@playwright/test';

test.describe('Demo sandbox workflow', () => {
  test('renders the sandbox demo entry point', async ({ page }) => {
    await page.goto('/dashboard/runs/sandbox');

    await expect(page.getByRole('heading', { name: 'Sandbox Demo' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Start Sandbox Demo/i })).toBeVisible();
  });
});
