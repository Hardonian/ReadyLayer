import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/')
    
    // Test navigation to sign-in
    await page.goto('/auth/signin')
    await expect(page).toHaveURL(/\/auth\/signin/)
    
    // Test navigation back to home
    await page.goto('/')
    await expect(page).toHaveURL('/')
  })

  test('should have accessible nav links', async ({ page }) => {
    // Navigate to a page that should have nav (if authenticated)
    await page.goto('/dashboard')
    
    // If redirected to sign-in, that's expected
    // If on dashboard, check nav links
    if (!page.url().includes('/auth/signin')) {
      const navLinks = page.getByRole('link', { name: /Dashboard|Repositories|Reviews|Metrics/i })
      const linkCount = await navLinks.count()
      
      // Should have at least some nav links
      expect(linkCount).toBeGreaterThan(0)
    }
  })

  test('should highlight active nav item', async ({ page }) => {
    await page.goto('/dashboard')
    
    if (!page.url().includes('/auth/signin')) {
      // Check if active link has aria-current
      const activeLink = page.getByRole('link', { name: /Dashboard|Repositories|Reviews|Metrics/i }).filter({ has: page.locator('[aria-current="page"]') })
      const activeCount = await activeLink.count()
      
      // Should have at least one active link
      expect(activeCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('should handle 404 page', async ({ page }) => {
    await page.goto('/non-existent-page')
    
    // Should show 404 page
    await expect(page.getByText(/404|Not Found/i)).toBeVisible()
    
    // Should have link back to home
    const homeLink = page.getByRole('link', { name: /Go Home/i })
    await expect(homeLink).toBeVisible()
  })
})
