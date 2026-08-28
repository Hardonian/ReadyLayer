import { test, expect } from '@playwright/test'
import {
  setupVisualTest,
  waitForVisualStability,
  mockConsistentData,
  mockAuthenticatedSession,
} from './utils/visual-helpers'
import * as fs from 'fs'
import * as path from 'path'

/**
 * UI Consistency & Functional Integrity Audit
 *
 * This test performs an automated audit of the application to identify:
 * - Console errors/warnings
 * - Network failures
 * - Hydration mismatches
 * - Layout shifts
 * - Responsive issues
 * - Keyboard/focus traps
 * - Reduced motion compliance
 *
 * Generates a markdown report with findings.
 */

// Audit state collection
interface AuditFinding {
  severity: 'BLOCKER' | 'HIGH' | 'MED' | 'LOW'
  category: 'console' | 'network' | 'hydration' | 'layout' | 'responsive' | 'accessibility' | 'motion'
  route: string
  viewport: string
  message: string
  details?: string
  screenshot?: string
}

interface RouteAudit {
  route: string
  viewport: { width: number; height: number; name: string }
  findings: AuditFinding[]
  consoleErrors: string[]
  consoleWarnings: string[]
  networkFailures: string[]
  hydrationIssues: string[]
}

const findings: AuditFinding[] = []
const routeAudits: RouteAudit[] = []

// Routes to audit
const ROUTES = [
  { path: '/', name: 'Homepage', requiresAuth: false },
  { path: '/auth/signin', name: 'Sign In', requiresAuth: false },
  { path: '/auth/error?error=AuthError', name: 'Auth Error', requiresAuth: false },
  { path: '/pricing', name: 'Pricing', requiresAuth: false },
  { path: '/features', name: 'Features', requiresAuth: false },
  { path: '/docs', name: 'Docs', requiresAuth: false },
  { path: '/about', name: 'About', requiresAuth: false },
  { path: '/dashboard', name: 'Dashboard', requiresAuth: true },
  { path: '/dashboard/repos', name: 'Repositories', requiresAuth: true },
  { path: '/dashboard/settings', name: 'Settings', requiresAuth: true },
  { path: '/dashboard/billing', name: 'Billing', requiresAuth: true },
]

// Viewports to test
const VIEWPORTS = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 834, height: 1194 },
  { name: 'mobile', width: 393, height: 851 },
]

test.describe.configure({ mode: 'serial' })

test.describe('UI Consistency Audit', () => {
  test.afterAll(async () => {
    // Generate audit report
    await generateAuditReport()
  })

  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      test(`${route.name} - ${viewport.name}`, async ({ page }) => {
        const audit: RouteAudit = {
          route: route.path,
          viewport,
          findings: [],
          consoleErrors: [],
          consoleWarnings: [],
          networkFailures: [],
          hydrationIssues: [],
        }

        // Setup
        await setupVisualTest(page)
        await mockConsistentData(page)
        await page.setViewportSize({ width: viewport.width, height: viewport.height })

        if (route.requiresAuth) {
          await mockAuthenticatedSession(page)
        }

        // Collect console errors/warnings
        page.on('console', (msg) => {
          const text = msg.text()
          if (msg.type() === 'error') {
            audit.consoleErrors.push(text)
            findings.push({
              severity: 'HIGH',
              category: 'console',
              route: route.path,
              viewport: viewport.name,
              message: `Console error: ${text.substring(0, 200)}`,
            })
          } else if (msg.type() === 'warning') {
            audit.consoleWarnings.push(text)
            findings.push({
              severity: 'MED',
              category: 'console',
              route: route.path,
              viewport: viewport.name,
              message: `Console warning: ${text.substring(0, 200)}`,
            })
          }
        })

        // Collect network failures
        page.on('response', (response) => {
          const url = response.url()
          const status = response.status()

          if (status >= 400) {
            const failure = `${status} ${url}`
            audit.networkFailures.push(failure)

            // Classify severity based on status
            let severity: 'BLOCKER' | 'HIGH' | 'MED' = 'MED'
            if (status >= 500) severity = 'BLOCKER'
            else if (status === 404) severity = 'HIGH'

            findings.push({
              severity,
              category: 'network',
              route: route.path,
              viewport: viewport.name,
              message: `Network failure: ${status} on ${new URL(url).pathname}`,
            })
          }
        })

        // Collect page errors
        page.on('pageerror', (error) => {
          const message = error.message
          audit.hydrationIssues.push(message)
          findings.push({
            severity: 'BLOCKER',
            category: 'hydration',
            route: route.path,
            viewport: viewport.name,
            message: `Page error (hydration): ${message.substring(0, 200)}`,
          })
        })

        // Navigate to route
        try {
          await page.goto(route.path, { timeout: 15000 })
          await waitForVisualStability(page)
        } catch (error) {
          findings.push({
            severity: 'BLOCKER',
            category: 'network',
            route: route.path,
            viewport: viewport.name,
            message: `Failed to load route: ${error instanceof Error ? error.message : String(error)}`,
          })
          return
        }

        // Check for 500 errors
        const url = page.url()
        if (url.includes('error') || url.includes('_next/static')) {
          // Check for error indicators
          const errorTitle = await page.locator('h1:has-text("Error"), h2:has-text("Error")').isVisible().catch(() => false)
          if (errorTitle) {
            findings.push({
              severity: 'BLOCKER',
              category: 'hydration',
              route: route.path,
              viewport: viewport.name,
              message: 'Error page displayed',
            })
          }
        }

        // Check for hydration mismatch indicators
        const hydrationError = await page.locator('text=/hydrat/i').isVisible().catch(() => false)
        if (hydrationError) {
          findings.push({
            severity: 'BLOCKER',
            category: 'hydration',
            route: route.path,
            viewport: viewport.name,
            message: 'Hydration mismatch indicator found',
          })
        }

        // Check responsive behavior
        await auditResponsiveBehavior(page, audit, route, viewport)

        // Check accessibility
        await auditAccessibility(page, audit, route, viewport)

        // Check reduced motion
        await auditReducedMotion(page, audit, route, viewport)

        // Check layout stability
        await auditLayoutStability(page, audit, route, viewport)

        routeAudits.push(audit)

        // Soft assertions - don't fail the test, just collect findings
        expect(audit.consoleErrors.length).toBe(0)
        expect(audit.hydrationIssues.length).toBe(0)
      })
    }
  }
})

async function auditResponsiveBehavior(
  page: any,
  _audit: RouteAudit,
  route: { path: string; name: string },
  viewport: { name: string; width: number; height: number }
): Promise<void> {
  // Check for elements that overflow viewport
  const overflows = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'))
    const overflowing: string[] = []

    for (const el of elements) {
      const rect = el.getBoundingClientRect()
      const html = document.documentElement

      if (rect.right > html.clientWidth || rect.bottom > html.clientHeight) {
        const tag = el.tagName.toLowerCase()
        const className = el.className
        if (className && typeof className === 'string') {
          overflowing.push(`${tag}.${className.split(' ')[0]}`)
        }
      }
    }

    return overflowing.slice(0, 5) // Limit to first 5
  })

  if (overflows.length > 0) {
    findings.push({
      severity: 'HIGH',
      category: 'responsive',
      route: route.path,
      viewport: viewport.name,
      message: `Elements overflow viewport: ${overflows.join(', ')}`,
    })
  }

  // Check for hidden navigation items on mobile
  if (viewport.name === 'mobile') {
    const hasMenuButton = await page.locator('button[aria-label*="menu"], button[aria-label*="Menu"]').isVisible().catch(() => false)
    const hasVisibleNav = await page.locator('nav a').first().isVisible().catch(() => false)

    if (!hasMenuButton && !hasVisibleNav) {
      findings.push({
        severity: 'MED',
        category: 'responsive',
        route: route.path,
        viewport: viewport.name,
        message: 'No visible navigation on mobile',
      })
    }
  }
}

async function auditAccessibility(
  page: any,
  _audit: RouteAudit,
  route: { path: string; name: string },
  viewport: { name: string; width: number; height: number }
): Promise<void> {
  // Check for focusable elements without visible focus indicators
  const focusableWithoutIndicators = await page.evaluate(() => {
    const focusable = Array.from(document.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    const problematic: string[] = []

    for (const el of focusable) {
      const style = window.getComputedStyle(el)
      const hasOutline = style.outlineStyle !== 'none' || style.boxShadow !== 'none'

      if (!hasOutline) {
        problematic.push(el.tagName.toLowerCase())
      }
    }

    return problematic.length
  })

  if (focusableWithoutIndicators > 0) {
    findings.push({
      severity: 'MED',
      category: 'accessibility',
      route: route.path,
      viewport: viewport.name,
      message: `${focusableWithoutIndicators} focusable elements may lack visible focus indicators`,
    })
  }

  // Check for images without alt text
  const imagesWithoutAlt = await page.locator('img:not([alt])').count()
  if (imagesWithoutAlt > 0) {
    findings.push({
      severity: 'MED',
      category: 'accessibility',
      route: route.path,
      viewport: viewport.name,
      message: `${imagesWithoutAlt} images without alt text`,
    })
  }

  // Check for missing landmarks
  const hasMain = await page.locator('main').count() > 0
  await page.locator('nav').count() // Check nav exists but don't require it

  if (!hasMain) {
    findings.push({
      severity: 'LOW',
      category: 'accessibility',
      route: route.path,
      viewport: viewport.name,
      message: 'No <main> landmark found',
    })
  }
}

async function auditReducedMotion(
  page: any,
  _audit: RouteAudit,
  route: { path: string; name: string },
  viewport: { name: string; width: number; height: number }
): Promise<void> {
  // Emulate reduced motion
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await waitForVisualStability(page)

  // Check for CSS animations still running
  const animationsRunning = await page.evaluate(() => {
    const animated = Array.from(document.querySelectorAll('.animate-*, [class*="animate-"], [style*="animation"]'))
    let runningCount = 0

    for (const el of animated) {
      const style = window.getComputedStyle(el)
      if (style.animationName !== 'none' && parseFloat(style.animationDuration) > 0.1) {
        runningCount++
      }
    }

    return runningCount
  })

  if (animationsRunning > 0) {
    findings.push({
      severity: 'LOW',
      category: 'motion',
      route: route.path,
      viewport: viewport.name,
      message: `${animationsRunning} animations may not respect reduced motion preference`,
    })
  }

  // Restore default motion
  await page.emulateMedia({ reducedMotion: 'no-preference' })
}

async function auditLayoutStability(
  page: any,
  _audit: RouteAudit,
  route: { path: string; name: string },
  viewport: { name: string; width: number; height: number }
): Promise<void> {
  // Measure layout shifts using PerformanceObserver
  const layoutShiftScore = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let clsScore = 0

      // Check if PerformanceObserver is available
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift') {
              clsScore += (entry as any).value
            }
          }
        })

        try {
          observer.observe({ entryTypes: ['layout-shift'] })
        } catch {
          // layout-shift might not be supported
        }
      }

      // Wait a bit and return score
      setTimeout(() => resolve(clsScore), 1000)
    })
  })

  if (layoutShiftScore > 0.1) {
    findings.push({
      severity: 'HIGH',
      category: 'layout',
      route: route.path,
      viewport: viewport.name,
      message: `Layout shift detected (CLS: ${layoutShiftScore.toFixed(3)})`,
    })
  }
}

async function generateAuditReport(): Promise<void> {
  const reportLines: string[] = []

  reportLines.push('# UI Consistency & Functional Integrity Audit Report')
  reportLines.push('')
  reportLines.push(`**Generated:** ${new Date().toISOString()}`)
  reportLines.push(`**Routes Audited:** ${ROUTES.length}`)
  reportLines.push(`**Viewports Tested:** ${VIEWPORTS.map(v => v.name).join(', ')}`)
  reportLines.push('')

  // Summary
  const blockerCount = findings.filter(f => f.severity === 'BLOCKER').length
  const highCount = findings.filter(f => f.severity === 'HIGH').length
  const medCount = findings.filter(f => f.severity === 'MED').length
  const lowCount = findings.filter(f => f.severity === 'LOW').length

  reportLines.push('## Summary')
  reportLines.push('')
  reportLines.push(`| Severity | Count |`)
  reportLines.push(`|----------|-------|`)
  reportLines.push(`| 🔴 BLOCKER | ${blockerCount} |`)
  reportLines.push(`| 🟠 HIGH | ${highCount} |`)
  reportLines.push(`| 🟡 MED | ${medCount} |`)
  reportLines.push(`| 🔵 LOW | ${lowCount} |`)
  reportLines.push('')

  // Findings by severity
  if (blockerCount > 0) {
    reportLines.push('## 🔴 BLOCKER Issues (Must Fix)')
    reportLines.push('')
    findings
      .filter(f => f.severity === 'BLOCKER')
      .forEach(f => {
        reportLines.push(`### ${f.category.toUpperCase()}: ${f.message}`)
        reportLines.push(`- **Route:** ${f.route}`)
        reportLines.push(`- **Viewport:** ${f.viewport}`)
        if (f.details) reportLines.push(`- **Details:** ${f.details}`)
        reportLines.push('')
      })
  }

  if (highCount > 0) {
    reportLines.push('## 🟠 HIGH Issues (Should Fix)')
    reportLines.push('')
    findings
      .filter(f => f.severity === 'HIGH')
      .forEach(f => {
        reportLines.push(`### ${f.category.toUpperCase()}: ${f.message}`)
        reportLines.push(`- **Route:** ${f.route}`)
        reportLines.push(`- **Viewport:** ${f.viewport}`)
        reportLines.push('')
      })
  }

  if (medCount > 0) {
    reportLines.push('## 🟡 MED Issues (Consider Fixing)')
    reportLines.push('')
    findings
      .filter(f => f.severity === 'MED')
      .slice(0, 20) // Limit to avoid huge reports
      .forEach(f => {
        reportLines.push(`- **${f.category}** (${f.viewport}): ${f.message} [${f.route}]`)
      })
    reportLines.push('')
  }

  // Route coverage table
  reportLines.push('## Route Coverage')
  reportLines.push('')
  reportLines.push('| Route | Desktop | Tablet | Mobile | Issues |')
  reportLines.push('|-------|---------|--------|--------|--------|')

  for (const route of ROUTES) {
    const routeFindings = findings.filter(f => f.route === route.path)
    const hasDesktop = findings.some(f => f.route === route.path && f.viewport === 'desktop')
    const hasTablet = findings.some(f => f.route === route.path && f.viewport === 'tablet')
    const hasMobile = findings.some(f => f.route === route.path && f.viewport === 'mobile')

    reportLines.push(`| ${route.name} | ${hasDesktop ? '✓' : '○'} | ${hasTablet ? '✓' : '○'} | ${hasMobile ? '✓' : '○'} | ${routeFindings.length} |`)
  }

  reportLines.push('')

  // Recommendations
  reportLines.push('## Recommendations')
  reportLines.push('')

  if (blockerCount > 0) {
    reportLines.push('### Immediate Actions Required')
    reportLines.push('1. Fix all BLOCKER issues before merging')
    reportLines.push('2. Review console errors for missing error boundaries')
    reportLines.push('3. Check hydration mismatches in Next.js components')
    reportLines.push('')
  }

  if (findings.some(f => f.category === 'responsive')) {
    reportLines.push('### Responsive Design')
    reportLines.push('- Review mobile navigation patterns')
    reportLines.push('- Check for horizontal overflow on small screens')
    reportLines.push('')
  }

  if (findings.some(f => f.category === 'accessibility')) {
    reportLines.push('### Accessibility Improvements')
    reportLines.push('- Add focus indicators to interactive elements')
    reportLines.push('- Review image alt text for decorative vs. informative images')
    reportLines.push('')
  }

  if (findings.some(f => f.category === 'motion')) {
    reportLines.push('### Motion Preferences')
    reportLines.push('- Ensure animations respect `prefers-reduced-motion`')
    reportLines.push('- Test with reduced motion enabled in OS settings')
    reportLines.push('')
  }

  // Write report
  const reportContent = reportLines.join('\n')
  const reportPath = path.join(process.cwd(), 'ui-consistency-report.md')

  fs.writeFileSync(reportPath, reportContent)

  // Also log summary to console
  console.log('\n========== UI CONSISTENCY AUDIT COMPLETE ==========')
  console.log(`BLOCKER: ${blockerCount}, HIGH: ${highCount}, MED: ${medCount}, LOW: ${lowCount}`)
  console.log(`Report saved to: ${reportPath}`)
  console.log('==================================================\n')
}
