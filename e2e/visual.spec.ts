import { test, expect } from '@playwright/test'
import {
  setupVisualTest,
  waitForVisualStability,
  mockConsistentData,
  mockAuthenticatedSession,
} from './utils/visual-helpers'

/**
 * Visual Regression Test Suite
 *
 * Covers critical routes across:
 * - Multiple viewports (desktop, tablet, mobile)
 * - Light and dark themes
 * - Different states (loading, error, empty, populated)
 *
 * Projects run via:
 * - visual-desktop: 1920x1080
 * - visual-tablet: 834x1194 (iPad Pro 11)
 * - visual-mobile: 393x851 (Pixel 5)
 * - visual-dark: 1920x1080 with dark theme
 */

// Test configuration
const VIEWPORT = process.env.PLAYWRIGHT_PROJECT_NAME || 'visual-desktop'
const IS_DARK_MODE = VIEWPORT === 'visual-dark'
const IS_MOBILE = VIEWPORT === 'visual-mobile'
const IS_TABLET = VIEWPORT === 'visual-tablet'

// Helper to generate snapshot name with viewport info
function snapshotName(baseName: string): string {
  const suffix = IS_DARK_MODE ? '-dark' : IS_MOBILE ? '-mobile' : IS_TABLET ? '-tablet' : '-desktop'
  return `${baseName}${suffix}.png`
}

test.describe.configure({ mode: 'serial' })

test.describe('Visual Regression: Public Pages', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page)
    await mockConsistentData(page)
  })

  test('homepage - loaded state', async ({ page }) => {
    await page.goto('/')
    await waitForVisualStability(page)

    // Verify key elements are present
    await expect(page.getByRole('heading', { name: /ReadyLayer/i })).toBeVisible()

    await expect(page).toHaveScreenshot(snapshotName('homepage-loaded'), {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('homepage - dark mode', async ({ page }) => {
    // Skip for visual-dark project (already in dark mode)
    if (IS_DARK_MODE) {
      test.skip()
      return
    }

    await page.goto('/')
    await waitForVisualStability(page)

    // Toggle to dark mode via localStorage
    await page.evaluate(() => {
      localStorage.setItem('readylayer-theme', 'dark')
      document.documentElement.classList.add('dark')
    })

    await page.reload()
    await waitForVisualStability(page)

    await expect(page).toHaveScreenshot(snapshotName('homepage-dark'), {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('signin page - loaded state', async ({ page }) => {
    await page.goto('/auth/signin')
    await waitForVisualStability(page)

    await expect(page.getByRole('button', { name: /Continue with/i })).toBeVisible()

    await expect(page).toHaveScreenshot(snapshotName('signin-loaded'), {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('signin page - error state', async ({ page }) => {
    await page.goto('/auth/error?error=AuthError')
    await waitForVisualStability(page)

    await expect(page.getByText(/Authentication Error/i)).toBeVisible()

    await expect(page).toHaveScreenshot(snapshotName('signin-error'), {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('pricing page', async ({ page }) => {
    await page.goto('/pricing')
    await waitForVisualStability(page)

    await expect(page.getByRole('heading', { name: /Pricing/i })).toBeVisible()

    await expect(page).toHaveScreenshot(snapshotName('pricing-page'), {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('features page', async ({ page }) => {
    await page.goto('/features')
    await waitForVisualStability(page)

    await expect(page.getByRole('heading', { name: /Features/i })).toBeVisible()

    await expect(page).toHaveScreenshot(snapshotName('features-page'), {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('docs page', async ({ page }) => {
    await page.goto('/docs')
    await waitForVisualStability(page)

    await expect(page).toHaveScreenshot(snapshotName('docs-page'), {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('about page', async ({ page }) => {
    await page.goto('/about')
    await waitForVisualStability(page)

    await expect(page).toHaveScreenshot(snapshotName('about-page'), {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })
})

test.describe('Visual Regression: Dashboard (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page)
    await mockConsistentData(page)
    await mockAuthenticatedSession(page)
  })

  test('dashboard - loaded state with data', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForVisualStability(page)

    // Wait for dashboard heading
    await expect(page.locator('#dashboard-heading')).toBeVisible()

    await expect(page).toHaveScreenshot(snapshotName('dashboard-loaded'), {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('dashboard - empty state', async ({ page }) => {
    // Mock empty responses
    await page.route('/api/v1/repos?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          repositories: [],
          pagination: { total: 0 },
        }),
      })
    })

    await page.route('/api/v1/reviews?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reviews: [],
          pagination: { total: 0 },
        }),
      })
    })

    await page.goto('/dashboard')
    await waitForVisualStability(page)

    await expect(page.locator('#dashboard-heading')).toBeVisible()

    await expect(page).toHaveScreenshot(snapshotName('dashboard-empty'), {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('dashboard - error state', async ({ page }) => {
    // Mock API error
    await page.route('/api/v1/repos?*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to fetch repositories',
        }),
      })
    })

    await page.goto('/dashboard')
    await waitForVisualStability(page)

    await expect(page).toHaveScreenshot(snapshotName('dashboard-error'), {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('repositories page', async ({ page }) => {
    await page.goto('/dashboard/repos')
    await waitForVisualStability(page)

    await expect(page).toHaveScreenshot(snapshotName('repos-page'), {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('settings page', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await waitForVisualStability(page)

    await expect(page).toHaveScreenshot(snapshotName('settings-page'), {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('billing page', async ({ page }) => {
    await page.goto('/dashboard/billing')
    await waitForVisualStability(page)

    await expect(page).toHaveScreenshot(snapshotName('billing-page'), {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })
})

test.describe('Visual Regression: Responsive Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page)
    await mockConsistentData(page)
  })

  test('navigation - mobile menu', async ({ page }) => {
    if (!IS_MOBILE) {
      test.skip()
      return
    }

    await page.goto('/')
    await waitForVisualStability(page)

    // Try to open mobile menu
    const menuButton = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"]').first()
    if (await menuButton.isVisible().catch(() => false)) {
      await menuButton.click()
      await page.waitForTimeout(200)

      await expect(page).toHaveScreenshot(snapshotName('mobile-menu-open'), {
        fullPage: false,
        animations: 'disabled',
        caret: 'hide',
      })
    }
  })

  test('homepage - responsive elements visible', async ({ page }) => {
    await page.goto('/')
    await waitForVisualStability(page)

    // Verify key responsive elements
    if (IS_MOBILE) {
      // Mobile: check for hamburger or simplified nav
      const hasMobileNav = await page.locator('nav, header').isVisible().catch(() => false)
      expect(hasMobileNav).toBeTruthy()
    } else if (IS_TABLET) {
      // Tablet: check for adjusted layout
      await expect(page).toHaveScreenshot(snapshotName('homepage-tablet'), {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      })
    }
  })
})

test.describe('Visual Regression: Component States', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page)
    await mockConsistentData(page)
    await mockAuthenticatedSession(page)
  })

  test('loading states', async ({ page }) => {
    // Slow down API to show loading state
    await page.route('/api/v1/repos?*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 5000))
      await route.continue()
    })

    await page.goto('/dashboard')

    // Wait a bit for loading UI to appear
    await page.waitForTimeout(300)

    // Take screenshot of loading state
    await expect(page).toHaveScreenshot(snapshotName('dashboard-loading'), {
      fullPage: false,
      animations: 'disabled',
      caret: 'hide',
    })
  })

  test('toast notifications', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForVisualStability(page)

    // Trigger a toast via localStorage action
    await page.evaluate(() => {
      // Dispatch a custom event that Toaster component might listen to
      window.dispatchEvent(new CustomEvent('toast', {
        detail: { message: 'Test notification', type: 'info' }
      }))
    })

    // Look for any toast/notification element
    const toast = page.locator('[role="alert"], .toast, [data-toast]').first()
    if (await toast.isVisible().catch(() => false)) {
      await expect(page).toHaveScreenshot(snapshotName('toast-notification'), {
        fullPage: false,
        animations: 'disabled',
        caret: 'hide',
      })
    }
  })
})
