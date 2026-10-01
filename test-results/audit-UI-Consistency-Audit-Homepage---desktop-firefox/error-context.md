# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: audit.spec.ts >> UI Consistency Audit >> Homepage - desktop
- Location: e2e\audit.spec.ts:86:11

# Error details

```
TimeoutError: page.reload: Timeout 15000ms exceeded.
Call log:
  - waiting for navigation until "load"

```

# Test source

```ts
  283 |     return overflowing.slice(0, 5) // Limit to first 5
  284 |   })
  285 | 
  286 |   if (overflows.length > 0) {
  287 |     findings.push({
  288 |       severity: 'HIGH',
  289 |       category: 'responsive',
  290 |       route: route.path,
  291 |       viewport: viewport.name,
  292 |       message: `Elements overflow viewport: ${overflows.join(', ')}`,
  293 |     })
  294 |   }
  295 | 
  296 |   // Check for hidden navigation items on mobile
  297 |   if (viewport.name === 'mobile') {
  298 |     const hasMenuButton = await page.locator('button[aria-label*="menu"], button[aria-label*="Menu"]').isVisible().catch(() => false)
  299 |     const hasVisibleNav = await page.locator('nav a').first().isVisible().catch(() => false)
  300 |     
  301 |     if (!hasMenuButton && !hasVisibleNav) {
  302 |       findings.push({
  303 |         severity: 'MED',
  304 |         category: 'responsive',
  305 |         route: route.path,
  306 |         viewport: viewport.name,
  307 |         message: 'No visible navigation on mobile',
  308 |       })
  309 |     }
  310 |   }
  311 | }
  312 | 
  313 | async function auditAccessibility(
  314 |   page: any,
  315 |   _audit: RouteAudit,
  316 |   route: { path: string; name: string },
  317 |   viewport: { name: string; width: number; height: number }
  318 | ): Promise<void> {
  319 |   // Check for focusable elements without visible focus indicators
  320 |   const focusableWithoutIndicators = await page.evaluate(() => {
  321 |     const focusable = Array.from(document.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'))
  322 |     const problematic: string[] = []
  323 |     
  324 |     for (const el of focusable) {
  325 |       const style = window.getComputedStyle(el)
  326 |       const hasOutline = style.outlineStyle !== 'none' || style.boxShadow !== 'none'
  327 |       
  328 |       if (!hasOutline) {
  329 |         problematic.push(el.tagName.toLowerCase())
  330 |       }
  331 |     }
  332 |     
  333 |     return problematic.length
  334 |   })
  335 | 
  336 |   if (focusableWithoutIndicators > 0) {
  337 |     findings.push({
  338 |       severity: 'MED',
  339 |       category: 'accessibility',
  340 |       route: route.path,
  341 |       viewport: viewport.name,
  342 |       message: `${focusableWithoutIndicators} focusable elements may lack visible focus indicators`,
  343 |     })
  344 |   }
  345 | 
  346 |   // Check for images without alt text
  347 |   const imagesWithoutAlt = await page.locator('img:not([alt])').count()
  348 |   if (imagesWithoutAlt > 0) {
  349 |     findings.push({
  350 |       severity: 'MED',
  351 |       category: 'accessibility',
  352 |       route: route.path,
  353 |       viewport: viewport.name,
  354 |       message: `${imagesWithoutAlt} images without alt text`,
  355 |     })
  356 |   }
  357 | 
  358 |   // Check for missing landmarks
  359 |   const hasMain = await page.locator('main').count() > 0
  360 |   await page.locator('nav').count() // Check nav exists but don't require it
  361 |   
  362 |   if (!hasMain) {
  363 |     findings.push({
  364 |       severity: 'LOW',
  365 |       category: 'accessibility',
  366 |       route: route.path,
  367 |       viewport: viewport.name,
  368 |       message: 'No <main> landmark found',
  369 |     })
  370 |   }
  371 | }
  372 | 
  373 | async function auditReducedMotion(
  374 |   page: any,
  375 |   _audit: RouteAudit,
  376 |   route: { path: string; name: string },
  377 |   viewport: { name: string; width: number; height: number },
  378 |   setReducedMotionPass: (active: boolean) => void
  379 | ): Promise<void> {
  380 |   // Emulate reduced motion
  381 |   await page.emulateMedia({ reducedMotion: 'reduce' })
  382 |   setReducedMotionPass(true)
> 383 |   await page.reload()
      |              ^ TimeoutError: page.reload: Timeout 15000ms exceeded.
  384 |   await waitForVisualStability(page)
  385 | 
  386 |   // Check for CSS animations still running
  387 |   const animationsRunning = await page.evaluate(() => {
  388 |     const animated = Array.from(document.querySelectorAll('[class*="animate-"], [style*="animation"]'))
  389 |     let runningCount = 0
  390 |     
  391 |     for (const el of animated) {
  392 |       const style = window.getComputedStyle(el)
  393 |       if (style.animationName !== 'none' && parseFloat(style.animationDuration) > 0.1) {
  394 |         runningCount++
  395 |       }
  396 |     }
  397 |     
  398 |     return runningCount
  399 |   })
  400 | 
  401 |   if (animationsRunning > 0) {
  402 |     findings.push({
  403 |       severity: 'LOW',
  404 |       category: 'motion',
  405 |       route: route.path,
  406 |       viewport: viewport.name,
  407 |       message: `${animationsRunning} animations may not respect reduced motion preference`,
  408 |     })
  409 |   }
  410 | 
  411 |   // Restore default motion
  412 |   setReducedMotionPass(false)
  413 |   await page.emulateMedia({ reducedMotion: 'no-preference' })
  414 | }
  415 | 
  416 | async function auditLayoutStability(
  417 |   page: any,
  418 |   _audit: RouteAudit,
  419 |   route: { path: string; name: string },
  420 |   viewport: { name: string; width: number; height: number }
  421 | ): Promise<void> {
  422 |   // Measure layout shifts using PerformanceObserver
  423 |   const layoutShiftScore = await page.evaluate(() => {
  424 |     return new Promise<number>((resolve) => {
  425 |       let clsScore = 0
  426 |       
  427 |       // Check if PerformanceObserver is available
  428 |       if ('PerformanceObserver' in window) {
  429 |         const observer = new PerformanceObserver((list) => {
  430 |           for (const entry of list.getEntries()) {
  431 |             if (entry.entryType === 'layout-shift') {
  432 |               clsScore += (entry as any).value
  433 |             }
  434 |           }
  435 |         })
  436 |         
  437 |         try {
  438 |           observer.observe({ entryTypes: ['layout-shift'] })
  439 |         } catch {
  440 |           // layout-shift might not be supported
  441 |         }
  442 |       }
  443 |       
  444 |       // Wait a bit and return score
  445 |       setTimeout(() => resolve(clsScore), 1000)
  446 |     })
  447 |   })
  448 | 
  449 |   if (layoutShiftScore > 0.1) {
  450 |     findings.push({
  451 |       severity: 'HIGH',
  452 |       category: 'layout',
  453 |       route: route.path,
  454 |       viewport: viewport.name,
  455 |       message: `Layout shift detected (CLS: ${layoutShiftScore.toFixed(3)})`,
  456 |     })
  457 |   }
  458 | }
  459 | 
  460 | async function generateAuditReport(): Promise<void> {
  461 |   const reportLines: string[] = []
  462 |   
  463 |   reportLines.push('# UI Consistency & Functional Integrity Audit Report')
  464 |   reportLines.push('')
  465 |   reportLines.push(`**Generated:** ${new Date().toISOString()}`)
  466 |   reportLines.push(`**Routes Audited:** ${ROUTES.length}`)
  467 |   reportLines.push(`**Viewports Tested:** ${VIEWPORTS.map(v => v.name).join(', ')}`)
  468 |   reportLines.push('')
  469 | 
  470 |   // Summary
  471 |   const blockerCount = findings.filter(f => f.severity === 'BLOCKER').length
  472 |   const highCount = findings.filter(f => f.severity === 'HIGH').length
  473 |   const medCount = findings.filter(f => f.severity === 'MED').length
  474 |   const lowCount = findings.filter(f => f.severity === 'LOW').length
  475 | 
  476 |   reportLines.push('## Summary')
  477 |   reportLines.push('')
  478 |   reportLines.push(`| Severity | Count |`)
  479 |   reportLines.push(`|----------|-------|`)
  480 |   reportLines.push(`| 🔴 BLOCKER | ${blockerCount} |`)
  481 |   reportLines.push(`| 🟠 HIGH | ${highCount} |`)
  482 |   reportLines.push(`| 🟡 MED | ${medCount} |`)
  483 |   reportLines.push(`| 🔵 LOW | ${lowCount} |`)
```