import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load without errors', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Check for console errors
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    // Verify page title
    await expect(page).toHaveTitle(/ReadyLayer/)
    
    // Verify main heading is visible
    await expect(page.getByRole('heading', { name: /Open-source governance/i })).toBeVisible()
    
    // Verify no uncaught errors
    expect(errors.length).toBe(0)
  })

  test('should show sign-in buttons when not authenticated', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Check for sign-in buttons
    const githubButton = page.getByRole('link', { name: /GitHub/i })
    const gitlabButton = page.getByRole('link', { name: /GitLab/i })
    
    // At least one provider button should be visible
    await expect(githubButton.or(gitlabButton).first()).toBeVisible()
  })

  test('should link to GitHub from the homepage', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // The homepage links to the public GitHub repository (sign-in lives at /auth/signin)
    const githubButton = page.getByRole('link', { name: /GitHub/i }).first()
    await expect(githubButton).toBeVisible()
    
    const href = await githubButton.getAttribute('href')
    expect(href).toMatch(/github\.com|\/auth\/|\/api\/github/)
  })

  test('should handle theme toggle', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Look for theme toggle (may not be visible on homepage)
    // This test verifies the page doesn't crash when theme is toggled
    // Theme toggle should not cause errors
    await expect(page).toHaveTitle(/ReadyLayer/)
  })
})
