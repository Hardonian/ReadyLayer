# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication Flow >> should keep provider controls operable before OAuth is configured
- Location: e2e\auth.spec.ts:27:7

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator: getByRole('button', { name: /Continue with/i }).first()
Expected: focused
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeFocused" getByRole('button', { name: /Continue with/i }).first() with timeout 5000ms
  - waiting for getByRole('button', { name: /Continue with/i }).first()

```

```yaml
- text: "{}"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('Authentication Flow', () => {
  4  |   test('should load sign-in page without errors', async ({ page }) => {
  5  |     await page.goto('/auth/signin')
  6  |     await page.waitForLoadState('networkidle')
  7  |     
  8  |     // Check for console errors
  9  |     const errors: string[] = []
  10 |     page.on('console', (msg) => {
  11 |       if (msg.type() === 'error') {
  12 |         errors.push(msg.text())
  13 |       }
  14 |     })
  15 |     
  16 |     // Verify page loads
  17 |     await expect(page).toHaveTitle(/Sign in/i)
  18 |     
  19 |     // Verify provider buttons are visible
  20 |     const providerButtons = page.getByRole('button', { name: /Continue with/i })
  21 |     await expect(providerButtons.first()).toBeVisible()
  22 |     
  23 |     // Verify no uncaught errors
  24 |     expect(errors.length).toBe(0)
  25 |   })
  26 | 
  27 |   test('should keep provider controls operable before OAuth is configured', async ({ page }) => {
  28 |     await page.goto('/auth/signin')
  29 |     await page.waitForLoadState('networkidle')
  30 |     
  31 |     // Click first provider button
  32 |     const firstButton = page.getByRole('button', { name: /Continue with/i }).first()
  33 |     await firstButton.click()
  34 | 
  35 |     // This suite uses an auth stub that validates sessions but does not host
  36 |     // provider OAuth. Assert the control accepts interaction here; the GitHub
  37 |     // OAuth suite covers configured callback and error flows separately.
> 38 |     await expect(firstButton).toBeFocused()
     |                               ^ Error: expect(locator).toBeFocused() failed
  39 |   })
  40 | 
  41 |   test('should handle auth error page', async ({ page }) => {
  42 |     await page.goto('/auth/error?error=AuthError')
  43 |     await page.waitForLoadState('networkidle')
  44 |     
  45 |     // Verify error message is displayed
  46 |     await expect(page.getByText(/Authentication Error/i)).toBeVisible()
  47 |     
  48 |     // Verify retry button exists
  49 |     const retryButton = page.getByRole('link', { name: /Try Again/i })
  50 |     await expect(retryButton).toBeVisible()
  51 |   })
  52 | })
  53 | 
```