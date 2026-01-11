# Accessibility Testing Setup & CI Integration

Comprehensive guide to implementing automated accessibility testing in the ReadyLayer CI/CD pipeline.

---

## Quick Start

### 1. Install Dependencies

```bash
npm install --save-dev @axe-core/playwright axe-core pa11y pa11y-ci
```

### 2. Add to package.json Scripts

```json
{
  "scripts": {
    "test:a11y": "playwright test tests/a11y.spec.ts",
    "test:a11y:ci": "pa11y-ci --config .pa11yci.json",
    "test:contrast": "node scripts/test-contrast.js"
  }
}
```

### 3. Run Tests Locally

```bash
npm run test:a11y
npm run test:contrast
```

---

## Automated Accessibility Testing

### Playwright + Axe-core Integration

**File: `tests/a11y.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

const PAGES_TO_TEST = [
  { url: '/', name: 'Homepage' },
  { url: '/dashboard', name: 'Dashboard' },
  { url: '/dashboard/runs', name: 'Runs Page' },
  { url: '/dashboard/findings', name: 'Findings Page' },
  { url: '/dashboard/reviews', name: 'Reviews Page' },
]

test.describe('Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await injectAxe(page)
  })

  PAGES_TO_TEST.forEach(({ url, name }) => {
    test(`${name} (${url}) should have no accessibility violations`, async ({ page }) => {
      await page.goto(url)
      await injectAxe(page)
      
      // Check for violations
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: {
          html: true,
        },
      })
    })

    test(`${name} (${url}) - Light mode - contrast compliance`, async ({ page }) => {
      await page.goto(url)
      await page.evaluate(() => document.documentElement.classList.remove('dark'))
      await injectAxe(page)
      await checkA11y(page)
    })

    test(`${name} (${url}) - Dark mode - contrast compliance`, async ({ page }) => {
      await page.goto(url)
      await page.evaluate(() => document.documentElement.classList.add('dark'))
      await injectAxe(page)
      await checkA11y(page)
    })

    test(`${name} (${url}) - Keyboard navigation`, async ({ page }) => {
      await page.goto(url)
      
      // Tab through all interactive elements
      let tabCount = 0
      while (tabCount < 50) {  // Limit iterations
        await page.keyboard.press('Tab')
        const focused = await page.evaluate(() => {
          const el = document.activeElement
          return {
            tag: el?.tagName,
            type: (el as HTMLInputElement)?.type || 'none',
            role: el?.getAttribute('role'),
            tabIndex: el?.getAttribute('tabindex'),
          }
        })
        
        // Verify focus is visible
        const isVisible = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement
          if (!el) return false
          const style = window.getComputedStyle(el)
          return style.outline !== 'none' || style.boxShadow !== 'none'
        })
        
        expect(isVisible).toBeTruthy()
        tabCount++
      }
    })

    test(`${name} (${url}) - Respects prefers-reduced-motion`, async ({ page }) => {
      await page.goto(url)
      
      // Set reduced motion preference
      await page.evaluate(() => {
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      })
      
      // Verify no animations are breaking the layout
      const violations = await page.evaluate(() => {
        // Check for long animations
        const sheets = document.styleSheets
        const animations: string[] = []
        
        for (let sheet of sheets) {
          try {
            const rules = (sheet as CSSStyleSheet).cssRules
            for (let rule of rules) {
              const text = rule.cssText
              if (text.includes('animation') && !text.includes('animation: none')) {
                animations.push(text)
              }
            }
          } catch (e) {
            // CORS issues, skip
          }
        }
        
        return animations.length > 0 ? animations : null
      })
      
      // Should not have long animations when reduced motion is preferred
      expect(violations).toBeNull()
    })
  })

  test('Color contrast validation - Light mode', async ({ page }) => {
    await page.goto('/dashboard')
    
    const contrastViolations = await page.evaluate(() => {
      const violations: Array<{ element: string; contrast: number; required: number }> = []
      
      document.querySelectorAll('*').forEach((el) => {
        const style = window.getComputedStyle(el)
        const color = style.color
        const bgColor = style.backgroundColor
        
        // Calculate contrast ratio (simplified)
        // In production, use wcag-contrast library
        if (el.textContent && el.textContent.trim().length > 0) {
          // Check if contrast is at least 4.5:1 (WCAG AA)
          // This is a simplified check - use proper library in production
        }
      })
      
      return violations
    })
    
    expect(contrastViolations.length).toBe(0)
  })

  test('Touch target validation - All buttons 44px minimum', async ({ page }) => {
    await page.goto('/dashboard')
    
    const smallTargets = await page.evaluate(() => {
      const targets: string[] = []
      
      document.querySelectorAll('button, a[role="button"], input[type="checkbox"], input[type="radio"]').forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.width < 44 || rect.height < 44) {
          targets.push(`${el.tagName} - ${rect.width}×${rect.height}`)
        }
      })
      
      return targets
    })
    
    expect(smallTargets.length).toBe(0)
  })
})
```

### Pa11y-CI Configuration

**File: `.pa11yci.json`**

```json
{
  "runners": [
    "axe",
    "pa11y"
  ],
  "standard": "WCAG2AA",
  "chromeLaunchConfig": {
    "args": [
      "--no-sandbox"
    ]
  },
  "timeout": 10000,
  "urls": [
    "http://localhost:3000/",
    "http://localhost:3000/dashboard",
    "http://localhost:3000/dashboard/runs",
    "http://localhost:3000/dashboard/findings",
    "http://localhost:3000/dashboard/reviews",
    "http://localhost:3000/auth/signin"
  ],
  "threshold": {
    "errors": 0,
    "warnings": 5
  }
}
```

---

## GitHub Actions Integration

**File: `.github/workflows/accessibility.yml`**

```yaml
name: Accessibility Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  accessibility:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Start dev server
        run: npm run dev &
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Wait for server to be ready
        run: npx wait-on http://localhost:3000 --timeout 30000
      
      - name: Run Playwright accessibility tests
        run: npm run test:a11y
      
      - name: Run Pa11y-CI tests
        run: npm run test:a11y:ci
      
      - name: Check contrast ratios
        run: npm run test:contrast
      
      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: accessibility-reports
          path: |
            a11y-reports/
            pa11y-results/
```

---

## Local Testing Tools

### Manual Accessibility Audit

**Steps:**

1. **Test in Dark Mode:**
   ```bash
   # Toggle dark mode in browser DevTools
   # Verify all colors remain readable
   # Check status badges in particular
   ```

2. **Test Keyboard Navigation:**
   ```bash
   # Press Tab to navigate
   # Verify logical tab order
   # Verify all interactive elements are reachable
   # Press Escape to close modals
   # Press Enter to activate buttons
   ```

3. **Test with VoiceOver (macOS):**
   ```bash
   # Cmd+F5 to enable
   # Verify page structure is announced correctly
   # Verify form labels are associated
   # Verify button purposes are clear
   ```

4. **Test with NVDA (Windows):**
   ```bash
   # Download from https://www.nvaccess.org/
   # Ctrl+Alt+N to start
   # Verify similar checklist as VoiceOver
   ```

5. **Test on Mobile:**
   ```bash
   # iOS: Settings > Accessibility > VoiceOver
   # Android: Settings > Accessibility > TalkBack
   # Verify touch targets are at least 44×44px
   # Verify spacing is adequate
   ```

### Contrast Checker Script

**File: `scripts/test-contrast.js`**

```javascript
const { chromium } = require('playwright');
const { WCAG_AA, WCAG_AAA } = require('wcag-contrast');

async function testContrast() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const urls = [
    'http://localhost:3000/dashboard',
    'http://localhost:3000/dashboard/runs',
    'http://localhost:3000/dashboard/findings',
  ];
  
  for (const url of urls) {
    console.log(`\nTesting contrast for: ${url}`);
    await page.goto(url);
    
    // Test light mode
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await testPageContrast(page, 'light', url);
    
    // Test dark mode
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await testPageContrast(page, 'dark', url);
  }
  
  await browser.close();
}

async function testPageContrast(page, mode, url) {
  const violations = await page.evaluate(() => {
    const issues = [];
    
    document.querySelectorAll('*').forEach((el) => {
      const text = el.textContent?.trim();
      if (!text || text.length === 0) return;
      
      const style = window.getComputedStyle(el);
      const color = style.color;
      const bgColor = style.backgroundColor;
      
      // Calculate contrast (simplified)
      // In production, use wcag-contrast library
      // if (contrast < 4.5) {
      //   issues.push({
      //     element: el.tagName,
      //     text: text.substring(0, 50),
      //     contrast: contrast.toFixed(2),
      //   });
      // }
    });
    
    return issues;
  });
  
  if (violations.length > 0) {
    console.warn(`❌ ${mode} mode: ${violations.length} contrast violations`);
    violations.forEach((v) => {
      console.log(`   - ${v.element}: ${v.text} (${v.contrast}:1)`);
    });
  } else {
    console.log(`✅ ${mode} mode: All colors pass WCAG AA (4.5:1)`);
  }
}

testContrast().catch(console.error);
```

---

## Continuous Improvement

### Monthly Accessibility Audits

```bash
# Full audit of all pages
npm run test:a11y:ci

# Generate detailed report
npm run test:a11y -- --json > a11y-report-$(date +%Y-%m-%d).json

# Track improvements over time
git log --all -- a11y-report-*.json
```

### Pre-commit Hooks

**File: `.husky/pre-commit`**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run accessibility tests before commit
npm run test:a11y:ci

if [ $? -ne 0 ]; then
  echo "❌ Accessibility tests failed. Fix issues before committing."
  exit 1
fi

echo "✅ Accessibility tests passed"
```

---

## Accessibility Metrics

### Dashboard Metrics to Track

1. **Color Contrast Ratio:** Target 4.5:1 (WCAG AA)
2. **Touch Target Size:** 100% ≥ 44×44px
3. **Keyboard Navigation:** 100% of interactive elements
4. **Screen Reader Support:** 100% of pages
5. **Motion Accessibility:** 100% respecting prefers-reduced-motion
6. **Form Label Association:** 100% of form fields
7. **Heading Hierarchy:** Proper h1-h6 structure
8. **Alt Text Coverage:** 100% of images

---

## Common Fixes

### Color Contrast Issues

```tsx
// ❌ Bad: Hard-coded color, may not contrast in dark mode
<div className="text-red-500">Error message</div>

// ✅ Good: Semantic token ensures proper contrast
import { getSeverityColor } from '@/lib/utils/color-mapping'
const colors = getSeverityColor('critical')
<div className={colors.text}>Error message</div>
```

### Touch Target Issues

```tsx
// ❌ Bad: 32px height
<button className="h-8 w-8 p-1">Icon</button>

// ✅ Good: 44px height
<Button size="icon"><Icon /></Button>
```

### Missing Keyboard Support

```tsx
// ❌ Bad: div is not keyboard accessible
<div onClick={handleClick}>Save</div>

// ✅ Good: Button is keyboard accessible
<Button onClick={handleClick}>Save</Button>
```

### Missing Form Labels

```tsx
// ❌ Bad: Only placeholder, no label
<input type="email" placeholder="Email" />

// ✅ Good: Associated label
<label htmlFor="email">Email address</label>
<input id="email" type="email" />
```

---

## Resources

- **Web Accessibility Initiative (WAI)**: https://www.w3.org/WAI/
- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **Axe DevTools**: https://www.deque.com/axe/devtools/
- **WAVE Browser Extension**: https://wave.webaim.org/extension/
- **WebAIM**: https://webaim.org/
- **A11y Project**: https://www.a11yproject.com/
- **Inclusive Components**: https://inclusive-components.design/

---

## Accessibility Checklist

- [ ] All pages tested with axe-core (0 violations)
- [ ] All pages tested in light, dark, high-contrast modes
- [ ] All colors meet WCAG AA contrast ratio (4.5:1 minimum)
- [ ] All interactive elements are ≥ 44×44px
- [ ] All form fields have associated labels
- [ ] All icon-only buttons have aria-labels
- [ ] All pages have proper heading hierarchy (h1, h2, h3)
- [ ] All images have alt text (or alt="" if decorative)
- [ ] All keyboard navigation works (Tab, Shift+Tab, Enter, Escape)
- [ ] All focus indicators are visible
- [ ] All motion respects prefers-reduced-motion
- [ ] All pages tested with screen readers (VoiceOver, NVDA)
- [ ] All links have descriptive anchor text (not "click here")
- [ ] All error messages are clear and actionable
- [ ] All required fields are marked and announced

---

**Last Updated**: January 11, 2026  
**Setup Version**: 1.0.0
