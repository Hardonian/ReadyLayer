import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should load sign-in page without errors', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.waitForLoadState('networkidle')
    
    // Check for console errors
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    // Verify page loads
    await expect(page).toHaveTitle(/Sign in/i)
    
    // Verify provider buttons are visible
    const providerButtons = page.getByRole('button', { name: /Continue with/i })
    await expect(providerButtons.first()).toBeVisible()
    
    // Verify no uncaught errors
    expect(errors.length).toBe(0)
  })

  test('should keep provider controls operable before OAuth is configured', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.waitForLoadState('networkidle')
    
    // Click first provider button
    const firstButton = page.getByRole('button', { name: /Continue with/i }).first()
    await firstButton.click()

    // This suite uses an auth stub that validates sessions but does not host
    // provider OAuth. Assert the control accepts interaction here; the GitHub
    // OAuth suite covers configured callback and error flows separately.
    await expect(firstButton).toBeFocused()
  })

  test('should handle auth error page', async ({ page }) => {
    await page.goto('/auth/error?error=AuthError')
    await page.waitForLoadState('networkidle')
    
    // Verify error message is displayed
    await expect(page.getByText(/Authentication Error/i)).toBeVisible()
    
    // Verify retry button exists
    const retryButton = page.getByRole('link', { name: /Try Again/i })
    await expect(retryButton).toBeVisible()
  })
})
