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
  // Freeze Math.random for deterministic behavior
  let randomSeed = 12345;
  Math.random = function() {
    randomSeed = (randomSeed * 9301 + 49297) % 233280;
    return randomSeed / 233280;
  };
  
  // Mock Date to freeze time (January 15, 2026 10:00:00 UTC)
  const frozenTime = 1736935200000;
  let timeOffset = 0;
  
  const OriginalDate = Date;
  
  function FrozenDate(...args) {
    if (args.length === 0) {
      return new OriginalDate(frozenTime + timeOffset);
    }
    return new OriginalDate(...args);
  }
  
  FrozenDate.prototype = OriginalDate.prototype;
  FrozenDate.now = function() { return frozenTime + timeOffset; };
  FrozenDate.parse = OriginalDate.parse;
  FrozenDate.UTC = OriginalDate.UTC;
  
  // Allow minimal time progression for setTimeout/setInterval
  const originalSetTimeout = window.setTimeout;
  window.setTimeout = function(callback, delay, ...args) {
    if (delay && delay > 0) {
      timeOffset += Math.min(delay, 16); // Cap at one frame
    }
    return originalSetTimeout(callback, delay, ...args);
  };
  
  Date = FrozenDate;
  
  // Mock performance.now()
  let perfOffset = 0;
  performance.now = function() {
    perfOffset += 0.1;
    return frozenTime + perfOffset;
  };
  
  // Suppress hydration warnings in visual tests
  window.__NEXT_DATA__ = window.__NEXT_DATA__ || {};
  window.__NEXT_DATA__.suppressHydrationWarning = true;
  
  // Override requestAnimationFrame for consistency
  let rafId = 0;
  let rafCallbacks = [];
  
  window.requestAnimationFrame = function(callback) {
    const id = ++rafId;
    rafCallbacks.push({ id, callback });
    
    // Execute immediately for consistent screenshots
    setTimeout(() => {
      callback(frozenTime + perfOffset);
    }, 0);
    
    return id;
  };
  
  window.cancelAnimationFrame = function(id) {
    rafCallbacks = rafCallbacks.filter(cb => cb.id !== id);
  };
  
  // Add class to body for test identification
  document.body.classList.add('visual-test-mode');
  
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
  
  // Wait for all images to load
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll('img'))
    return images.every(img => img.complete && img.naturalHeight !== 0)
  })
  
  // Wait for fonts
  await page.waitForFunction(() => document.fonts.ready)
  
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
  await page.evaluate(() => {
    // Mock Supabase session
    const mockSession = {
      access_token: 'mock-token-for-visual-tests',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
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
    
    localStorage.setItem('sb-auth-token', JSON.stringify(mockSession))
    
    // Also set cookie for SSR
    document.cookie = `sb-auth-token=${encodeURIComponent(JSON.stringify(mockSession))}; path=/`
  })
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
