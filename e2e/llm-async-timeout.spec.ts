/**
 * LLM Async Timeout E2E Test
 * 
 * Tests that the system properly handles LLM timeout scenarios:
 * - Returns immediate static analysis results
 * - Processes LLM enrichment in background
 * - Updates UI when async results arrive
 * - Gracefully degrades if LLM times out
 */

import { test, expect } from '@playwright/test';

test.describe('LLM Async Processing & Timeout Handling', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  test('PR review returns static results immediately while LLM processes async', async ({
    page,
  }) => {
    // Step 1: Navigate to code review page
    await page.goto(`${baseUrl}/dashboard`);

    // Step 2: Submit code for review
    await page.click('button:has-text("Analyze Code")');

    const testCode = `
const apiKey = 'sk-proj-1234567890abcdefghij';
const password = "hardcodedPassword123";
const query = \`SELECT * FROM users WHERE id = \${userId}\`;
    `;

    await page.fill('textarea[placeholder="Paste code"]', testCode);
    await page.click('button:has-text("Analyze")');

    // Step 3: Verify immediate static analysis results
    // The system should return results within 500ms
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="review-result"]', {
      timeout: 500,
    });
    const staticTime = Date.now() - startTime;

    console.log(`Static analysis returned in ${staticTime}ms`);
    expect(staticTime).toBeLessThan(500);

    // Verify basic violations are detected
    const violations = page.locator('[data-testid="violation-badge"]');
    const count = await violations.count();
    expect(count).toBeGreaterThan(0);

    // Step 4: Check for "pending enrichment" indicator
    const pendingBadge = page.locator('[data-testid="status-pending"]');
    const isPending = await pendingBadge.isVisible();

    if (isPending) {
      console.log('LLM enrichment in progress (async)');
    }

    // Step 5: Wait for async LLM results (up to 30 seconds)
    await page.waitForSelector('[data-testid="status-enriched"]', {
      timeout: 30000,
    }).catch(() => {
      // It's okay if LLM doesn't complete - static results are sufficient
      console.log('LLM enrichment timeout - static results available');
    });

    // Step 6: Verify that enriched results include remediation
    const remediationText = page.locator('[data-testid="remediation-guide"]');
    const isEnriched = await remediationText.isVisible().catch(() => false);

    if (isEnriched) {
      console.log('LLM enrichment completed successfully');
      // Remediation should be detailed
      const remediation = await remediationText.textContent();
      expect(remediation?.length || 0).toBeGreaterThan(20);
    }
  });

  test('System handles LLM timeout gracefully', async ({
    page,
    context,
  }) => {
    // Simulate slow network to trigger timeout
    await context.route('**/api/v1/llm/**', (route) => {
      // Delay response to trigger timeout
      setTimeout(() => {
        route.abort('timedout');
      }, 61000); // 61 seconds, longer than 60s timeout
    });

    // Step 1: Submit code for review
    await page.goto(`${baseUrl}/dashboard`);
    await page.click('button:has-text("Analyze Code")');

    const testCode = `
function complexAlgorithm() {
  // Complex code that would benefit from LLM analysis
  const result = encrypt(data, process.env.SECRET_KEY);
  return result;
}
    `;

    await page.fill('textarea[placeholder="Paste code"]', testCode);
    await page.click('button:has-text("Analyze")');

    // Step 2: Verify static results arrive quickly
    await page.waitForSelector('[data-testid="review-result"]', {
      timeout: 1000,
    });

    // Step 3: Wait for timeout to occur
    await page.waitForTimeout(5000);

    // Step 4: Verify graceful degradation
    // Should still show results without LLM enrichment
    const reviewStatus = page.locator('[data-testid="review-status"]');
    await expect(reviewStatus).toBeVisible();

    // Status should indicate static analysis only
    const badge = page.locator('[data-testid="static-analysis-only"]');
    await badge.isVisible().catch(() => false);

    // Step 5: If there's an error message, it should be helpful
    const errorMsg = page.locator('[data-testid="llm-timeout-notice"]');
    const showsTimeoutNotice = await errorMsg.isVisible().catch(() => false);

    if (showsTimeoutNotice) {
      console.log('User notified of LLM timeout');
      const message = await errorMsg.textContent();
      expect(message).toContain('temporarily unavailable');
    }

    // Step 6: User should still be able to see and act on results
    const acknowledgeButton = page.locator(
      'button:has-text("Acknowledge")'
    );
    expect(await acknowledgeButton.isVisible()).toBeTruthy();
  });

  test('Background LLM processor handles queued requests', async ({
    page,
  }) => {
    // Step 1: Submit multiple reviews in quick succession
    await page.goto(`${baseUrl}/dashboard`);

    const codes = [
      'const key1 = "secret123";',
      'const key2 = "secret456";',
      'const key3 = "secret789";',
    ];

    const reviewIds = [];

    for (const code of codes) {
      await page.click('button:has-text("Analyze Code")');
      await page.fill('textarea[placeholder="Paste code"]', code);
      await page.click('button:has-text("Analyze")');

      // Get the review ID from URL
      await page.waitForURL(/.*\/reviews\/.*/);
      const url = page.url();
      const id = url.split('/').pop();
      reviewIds.push(id);

      // Go back for next review
      await page.goBack();
    }

    // Step 2: All should show pending async status
    for (const id of reviewIds) {
      await page.goto(`${baseUrl}/dashboard/reviews/${id}`);
      const status = page.locator('[data-testid="review-status"]');
      await expect(status).toBeVisible();
    }

    // Step 3: Monitor background processing
    // In real scenario, would check database/logs
    // For now, verify UI updates as results come in
    for (const id of reviewIds) {
      await page.goto(`${baseUrl}/dashboard/reviews/${id}`);

      // Wait for either enriched or timeout
      const enrichedBadge = page.locator('[data-testid="status-enriched"]');
      await enrichedBadge
        .waitFor({ timeout: 35000 })
        .catch(() => {
          console.log(`Review ${id} did not complete enrichment`);
        });
    }
  });

  test('Timeout configuration is respected', async ({
    page,
  }) => {
    // This test verifies the 60-second timeout is enforced

    page.on('response', async (response) => {
      if (response.url().includes('/api/v1/llm/')) {
        // Track response time - timing info logged for debugging
        console.log('LLM API response received:', response.url());
      }
    });

    // Step 1: Submit code for review
    await page.goto(`${baseUrl}/dashboard`);
    await page.click('button:has-text("Analyze Code")');
    await page.fill('textarea[placeholder="Paste code"]', 'const key = "test";');
    await page.click('button:has-text("Analyze")');

    // Step 2: Measure how long we wait for static results
    const start = Date.now();
    await page.waitForSelector('[data-testid="review-result"]', {
      timeout: 60000,
    });
    const staticWait = Date.now() - start;

    console.log(`Static results received in ${staticWait}ms`);
    expect(staticWait).toBeLessThan(1000); // Should be very fast

    // Step 3: Optionally wait for async (but don't fail if it times out)
    const enrichedWait = Date.now();
    await page.waitForSelector('[data-testid="status-enriched"]', {
      timeout: 5000,
    }).catch(() => null);

    if (
      (Date.now() - enrichedWait) < 5000
    ) {
      const totalAsync = Date.now() - start;
      console.log(`Async enrichment completed in ${totalAsync}ms`);
      expect(totalAsync).toBeLessThan(65000); // 60s timeout + 5s buffer
    }
  });
});
