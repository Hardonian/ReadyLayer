/**
 * Visual Test Utilities
 * 
 * Helpers for deterministic, stable visual regression tests.
 * Eliminates flaky pixels from animations, timestamps, randomness.
 */

import type { Page, TestInfo } from '@playwright/test'

/**
 * CSS to inject that disables all animations and transitions
 */
export const DISABLE_ANIMATIONS_CSS = `
  /* Disable all animations */
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    animation-delay: 0ms !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0ms !important;
    scroll-behavior: auto !important;
  }
  
  /* Stop Framer Motion animations */
  [style*="animation"] {
    animation: none !important;
  }
  
  /* Stop CSS animations */
  .animate-blob,
  .animate-float,
  .animate-pulse,
  .animate-pulse-slow,
  .animate-spin,
  .animate-bounce,
  .animate-ping {
    animation: none !important;
  }
  
  /* Stop code glow */
  .code-preview-glow {
    animation: none !important;
    opacity: 0.5 !important;
    transform: scale(1) !important;
  }
  
  /* Stop blob animation */
  .animate-blob {
    animation: none !important;
    transform: none !important;
  }
  
  /* Stop float animation */
  .float-animation,
  .float-animation-delay-1,
  .float-animation-delay-2 {
    animation: none !important;
    transform: none !important;
  }
  
  /* Stop loading spinners */
  .animate-spin {
    animation: none !important;
    transform: none !important;
  }
  
  /* Hide cursor in screenshots */
  * {
    caret-color: transparent !important;
  }
  
  /* Stop gradient animations */
  @keyframes none {
    to { }
  }
`

/**
 * JavaScript to inject that mocks unstable browser APIs
 */
export const STABILIZE_JS = `
  // Freeze Math.random for deterministic behavior.
  // Note: Date and requestAnimationFrame are deliberately NOT mocked.
  // Mocking them on the client while the server renders with the real ones
  // causes React hydration mismatches (framer-motion styles, date text) that
  // are artifacts of the test harness, not application bugs. Dynamic values
  // are hidden via screenshot masking (see DYNAMIC_SELECTORS) instead.
  let randomSeed = 12345;
  Math.random = function() {
    randomSeed = (randomSeed * 9301 + 49297) % 233280;
    return randomSeed / 233280;
  };

  // Add class to the root element for test identification.
  // Init scripts run before <body> exists, so wait for the DOM if needed.
  // Use <html> (which carries suppressHydrationWarning) so React does not
  // report an attribute hydration mismatch for the injected class.
  const markVisualTestMode = () => {
    document.documentElement.classList.add('visual-test-mode');
  };
  if (document.documentElement) {
    markVisualTestMode();
  } else {
    document.addEventListener('DOMContentLoaded', markVisualTestMode, { once: true });
  }

  // Dispatch custom event for components to detect visual test mode
  window.dispatchEvent(new CustomEvent('visualTestMode'));
`

/**
 * Setup page for visual testing - call this at the start of each visual test
 */
export async function setupVisualTest(page: Page, _testInfo?: TestInfo): Promise<void> {
  // Inject CSS to disable animations
  await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS })
  
  // Inject JS to stabilize time and randomness
  await page.addInitScript(STABILIZE_JS)
  
  // Set viewport to ensure consistent sizing
  await page.setViewportSize({ width: 1920, height: 1080 })
  
  // Wait for fonts to be ready
  await page.waitForFunction(() => document.fonts.ready)
  
  // Wait for any lazy-loaded content
  await page.waitForLoadState('networkidle')
}

/**
 * Mask dynamic content like timestamps, user names, random IDs
 */
export const DYNAMIC_SELECTORS = [
  // Timestamps and dates
  'time',
  '[data-testid="timestamp"]',
  '[data-testid="date"]',
  
  // Dynamic user content
  '[data-testid="user-avatar"]',
  '[data-testid="username"]',
  
  // Random IDs
  '[data-testid="id"]',
  
  // Loading states that may vary
  '.animate-spin',
  
  // Charts with dynamic data
  'canvas[data-chart]',
]

/**
 * Take a stable screenshot with masking applied
 */
export async function takeStableScreenshot(
  page: Page,
  options: {
    name: string
    fullPage?: boolean
    mask?: string[]
    maskColor?: string
    clip?: { x: number; y: number; width: number; height: number }
  }
): Promise<Buffer> {
  const maskSelectors = [...DYNAMIC_SELECTORS, ...(options.mask || [])]
  
  // Get mask elements
  const maskElements = await page.locator(maskSelectors.join(', ')).all()
  
  return await page.screenshot({
    fullPage: options.fullPage ?? false,
    mask: maskElements,
    maskColor: options.maskColor ?? '#FF00FF',
    clip: options.clip,
    animations: 'disabled',
    caret: 'hide',
  })
}

/**
 * Wait for page to be visually stable
 */
export async function waitForVisualStability(page: Page): Promise<void> {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle')
  
  // Wait for images to load, but do not fail the test if one never does
  // (webkit/tablet renders can leave an image pending; this helper reduces
  // screenshot flakiness, it is not an image-loading assertion)
  await page
    .waitForFunction(
      () => {
        const images = Array.from(document.querySelectorAll('img'))
        return images.every(img => img.complete && img.naturalHeight !== 0)
      },
      { timeout: 5000 }
    )
    .catch(() => {})
  
  // Wait for fonts
  await page.waitForFunction(() => document.fonts.ready, { timeout: 5000 }).catch(() => {})
  
  // Small delay for any final layout shifts
  await page.waitForTimeout(100)
}

/**
 * Set theme (light/dark/system) for visual tests
 */
export async function setTheme(page: Page, theme: 'light' | 'dark' | 'system'): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem('readylayer-theme', t)
    
    if (t === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (t === 'light') {
      document.documentElement.classList.remove('dark')
    }
    
    // Dispatch storage event for theme provider
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'readylayer-theme',
      newValue: t,
    }))
  }, theme)
  
  // Wait for theme transition
  await page.waitForTimeout(150)
}

/**
 * Mock API responses for consistent data
 */
export async function mockConsistentData(page: Page): Promise<void> {
  // Mock usage stats endpoint
  await page.route('/api/v1/usage', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          llmTokens: { used: 50000, limit: 100000 },
          runs: { used: 25, limit: 100 },
          concurrentJobs: { used: 2, limit: 5 },
          budget: { used: 50, limit: 100 },
          percentageUsed: 50,
        },
      }),
    })
  })
  
  // Mock single-repo endpoint (dashboard detail panels)
  await page.route('/api/v1/repos/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'repo-1',
        name: 'example-repo',
        fullName: 'acme-corp/example-repo',
        provider: 'github',
        url: 'https://github.com/acme-corp/example-repo',
        enabled: true,
        config: {},
        createdAt: '2026-01-10T10:00:00Z',
        updatedAt: '2026-01-10T10:00:00Z',
      }),
    })
  })

  // Mock repos endpoint with consistent data
  await page.route('/api/v1/repos?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        repositories: [
          {
            id: 'repo-1',
            name: 'example-repo',
            fullName: 'acme-corp/example-repo',
            provider: 'github',
            enabled: true,
            createdAt: '2026-01-10T10:00:00Z',
          },
          {
            id: 'repo-2',
            name: 'api-service',
            fullName: 'acme-corp/api-service',
            provider: 'github',
            enabled: true,
            createdAt: '2026-01-08T14:30:00Z',
          },
        ],
        pagination: { total: 2 },
      }),
    })
  })
  
  // Mock reviews endpoint
  await page.route('/api/v1/reviews?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reviews: [
          {
            id: 'review-1',
            repositoryId: 'repo-1',
            prNumber: 42,
            status: 'completed',
            isBlocked: false,
            createdAt: '2026-01-14T09:30:00Z',
          },
          {
            id: 'review-2',
            repositoryId: 'repo-2',
            prNumber: 23,
            status: 'blocked',
            isBlocked: true,
            createdAt: '2026-01-13T16:45:00Z',
          },
        ],
        pagination: { total: 2 },
      }),
    })
  })
}

/**
 * Create mock authenticated session
 */
export async function mockAuthenticatedSession(page: Page): Promise<void> {
  const mockSession = {
    access_token: 'mock-token-for-visual-tests',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    // supabase-js rejects sessions without expires_at ("Auth session missing!")
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: 'user-visual-test',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: null,
      },
    },
  }
  // The Supabase SSR cookie stores the session as raw JSON (URI-encoding
  // makes the auth library report "Auth session missing!")
  const cookieValue = JSON.stringify(mockSession)

  // Seed storage via init script: page.evaluate cannot touch localStorage on
  // about:blank (opaque origin) before the first real document is loaded.
  await page.addInitScript((sessionJson: string) => {
    try {
      localStorage.setItem('sb-auth-token', sessionJson)
    } catch {
      // Storage unavailable - cookie set below still applies
    }
  }, JSON.stringify(mockSession))

  // Cookie equivalents for SSR-side session reads. The Supabase storage key
  // is derived from the auth URL hostname ('sb-<host-first-label>-auth-token'),
  // so cover the stub host plus the legacy/simple names.
  const cookieNames = ['sb-localhost-auth-token', 'sb-127-auth-token', 'sb-auth-token']
  await page.context().addCookies(
    cookieNames.map((name) => ({
      name,
      value: cookieValue,
      url: 'http://localhost:3000',
      httpOnly: false,
      sameSite: 'Lax' as const,
      secure: false,
    }))
  )
}

/**
 * Assert screenshot matches baseline
 */
export async function expectScreenshot(
  page: Page,
  name: string,
  options: {
    fullPage?: boolean
    mask?: string[]
    theme?: 'light' | 'dark'
  } = {}
): Promise<void> {
  const { expect } = await import('@playwright/test')
  
  // Wait for stability
  await waitForVisualStability(page)
  
  // Set theme if specified
  if (options.theme) {
    await setTheme(page, options.theme)
  }
  
  // Take screenshot with masking
  const maskSelectors = [...DYNAMIC_SELECTORS, ...(options.mask || [])]
  const maskElements = await page.locator(maskSelectors.join(', ')).all()
  
  await expect(page).toHaveScreenshot(name, {
    fullPage: options.fullPage ?? false,
    mask: maskElements,
    maskColor: '#FF00FF',
    animations: 'disabled',
    caret: 'hide',
  })
}
