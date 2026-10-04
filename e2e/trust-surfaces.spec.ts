import { expect, test } from '@playwright/test'

test.describe('public trust and evaluation surfaces', () => {
  test('exposes evidence-backed capability maturity', async ({ page }) => {
    await page.goto('/security')

    await expect(page.getByRole('heading', { level: 1, name: /ReadyLayer Trust Center/i })).toBeVisible()
    await expect(page.getByText('Verified in repository').first()).toBeVisible()
    await expect(page.getByText('Beta — validate in your environment').first()).toBeVisible()
    await expect(page.getByText('Design-partner pilot').first()).toBeVisible()
    await expect(page.getByText(/does not replace human review/i)).toBeVisible()
  })

  test('routes pricing traffic to a bounded enterprise pilot', async ({ page }) => {
    await page.goto('/pricing')

    await expect(page).toHaveURL(/\/enterprise$/)
    await expect(page.getByRole('heading', { level: 1, name: /Put enforceable boundaries/i })).toBeVisible()
    await expect(page.getByText(/commitments only in an executed order/i)).toBeVisible()
  })

  test('offers a working evidence-led evaluation path', async ({ page }) => {
    await page.goto('/evaluate')

    await expect(page.getByRole('heading', { level: 1, name: /Evaluate ReadyLayer without/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Open audit example/i })).toHaveAttribute('href', '/audit-example')
    await expect(page.getByRole('link', { name: /Verify a policy/i })).toHaveAttribute('href', '/policy-verification')
    await expect(page.getByRole('link', { name: /Run sandbox/i })).toHaveAttribute('href', '/dashboard/runs/sandbox')
  })
})
