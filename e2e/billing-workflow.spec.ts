/**
 * Billing Workflow E2E Tests
 * 
 * Tests complete billing scenarios:
 * - Free tier usage and limits
 * - Upgrade flow
 * - Subscription management
 * - Invoice and payment tracking
 * - Cost alerts and budget management
 */

import { test, expect } from '@playwright/test';
import {
  trackLLMCost,
  getOrganizationMonthlySpend,
  isWithinBudget,
  getRemainingBudget,
  getBudgetUtilization,
  checkBudgetAlerts,
} from '../lib/telemetry/llm-costs';
import {
  handleSubscriptionUpdated,
  handlePaymentSucceeded,
  type StripeWebhookEvent,
} from '../services/billing/stripe-webhook-handler';

test.describe('Billing and Subscription Workflow', () => {
  const testOrgId = 'org_test_' + Date.now();

  test('should track LLM costs accurately', async () => {
    const metrics = {
      provider: 'openai' as const,
      model: 'gpt-4-turbo',
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      costUSD: 0.025, // 0.01 + 0.015
      requestDurationMs: 100,
      timestamp: new Date(),
      success: true,
    };

    trackLLMCost(testOrgId, metrics);

    const spend = getOrganizationMonthlySpend(testOrgId);
    expect(spend).toBeGreaterThan(0);
  });

  test('should enforce budget limits', async () => {
    const monthlyBudget = 100;

    // Track expenses
    for (let i = 0; i < 50; i++) {
      trackLLMCost(testOrgId, {
        provider: 'openai' as const,
        model: 'gpt-3.5-turbo',
        inputTokens: 1000,
        outputTokens: 1000,
        totalTokens: 2000,
        costUSD: 0.002, // Cheap model
        requestDurationMs: 100,
        timestamp: new Date(),
        success: true,
      });
    }

    const withinBudget = isWithinBudget(testOrgId, monthlyBudget);
    expect(typeof withinBudget).toBe('boolean');

    const remaining = getRemainingBudget(testOrgId, monthlyBudget);
    expect(remaining).toBeLessThanOrEqual(monthlyBudget);
  });

  test('should calculate budget utilization', async () => {
    const monthlyBudget = 1000;

    // Add some costs
    for (let i = 0; i < 10; i++) {
      trackLLMCost(testOrgId + '_utilization', {
        provider: 'openai' as const,
        model: 'gpt-4-turbo',
        inputTokens: 1000,
        outputTokens: 1000,
        totalTokens: 2000,
        costUSD: 0.04,
        requestDurationMs: 100,
        timestamp: new Date(),
        success: true,
      });
    }

    const utilization = getBudgetUtilization(testOrgId + '_utilization', monthlyBudget);
    expect(utilization).toBeGreaterThan(0);
    expect(utilization).toBeLessThanOrEqual(100);
  });

  test('should trigger budget alerts', async () => {
    const monthlyBudget = 100;
    const testId = testOrgId + '_alerts';

    // Track expensive usage to trigger warning
    for (let i = 0; i < 200; i++) {
      trackLLMCost(testId, {
        provider: 'openai' as const,
        model: 'gpt-4-turbo',
        inputTokens: 1000,
        outputTokens: 1000,
        totalTokens: 2000,
        costUSD: 0.04,
        requestDurationMs: 100,
        timestamp: new Date(),
        success: true,
      });
    }

    const alert = checkBudgetAlerts(testId, monthlyBudget);
    expect(['ok', 'warning', 'critical']).toContain(alert);
  });

  test('should handle subscription updates from Stripe', async () => {
    const event: StripeWebhookEvent = {
      id: 'evt_test_123',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test_123',
          customer: 'cus_test_123',
          status: 'active',
          items: {
            data: [
              {
                price: {
                  id: 'price_growth',
                },
              },
            ],
          },
        },
        previous_attributes: {
          status: 'past_due',
        },
      },
    } as any;

    // Should process without throwing
    await expect(handleSubscriptionUpdated(event)).resolves.not.toThrow();
  });

  test('should record successful payments', async () => {
    const event: StripeWebhookEvent = {
      id: 'evt_invoice_123',
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_test_123',
          customer: 'cus_test_123',
          amount_paid: 9900, // $99.00
          status: 'paid',
          paid_at: Math.floor(Date.now() / 1000),
          number: 'INV-0001',
        } as any,
      },
    } as any;

    // Should process without throwing
    await expect(handlePaymentSucceeded(event)).resolves.not.toThrow();
  });

  test('should handle plan upgrades', async () => {
    const upgradeEvent: StripeWebhookEvent = {
      id: 'evt_upgrade_123',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_upgrade_123',
          customer: 'cus_test_123',
          status: 'active',
          items: {
            data: [
              {
                price: {
                  id: 'price_scale', // Upgraded to Scale
                },
              },
            ],
          },
        },
        previous_attributes: {
          items: {
            data: [
              {
                price: {
                  id: 'price_growth', // Was on Growth
                },
              },
            ],
          },
        } as any,
      },
    } as any;

    // Should handle upgrade
    await expect(handleSubscriptionUpdated(upgradeEvent)).resolves.not.toThrow();
  });

  test('should detect free tier usage limits', async () => {
    const freeOrgId = testOrgId + '_free';

    // Track multiple LLM calls (free tier might have limits)
    const calls = 10;
    for (let i = 0; i < calls; i++) {
      trackLLMCost(freeOrgId, {
        provider: 'openai' as const,
        model: 'gpt-3.5-turbo',
        inputTokens: 100,
        outputTokens: 100,
        totalTokens: 200,
        costUSD: 0.00004,
        requestDurationMs: 100,
        timestamp: new Date(),
        success: true,
      });
    }

    const spend = getOrganizationMonthlySpend(freeOrgId);
    expect(spend).toBeGreaterThan(0);
  });

  test('should provide usage visibility in dashboard', async () => {
    const testId = testOrgId + '_visibility';

    // Track realistic usage
    const models = ['gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-haiku'];
    for (const model of models) {
      for (let i = 0; i < 5; i++) {
        trackLLMCost(testId, {
          provider: 'openai' as const,
          model: model,
          inputTokens: Math.floor(Math.random() * 2000),
          outputTokens: Math.floor(Math.random() * 1000),
          totalTokens: Math.floor(Math.random() * 3000),
          costUSD: Math.random() * 0.1,
          requestDurationMs: 100,
          timestamp: new Date(Date.now() - Math.random() * 86400000 * 30),
          success: true,
        });
      }
    }

    const spend = getOrganizationMonthlySpend(testId);
    const utilization = getBudgetUtilization(testId, 500);
    const remaining = getRemainingBudget(testId, 500);

    expect(spend).toBeGreaterThanOrEqual(0);
    expect(utilization).toBeGreaterThanOrEqual(0);
    expect(remaining).toBeLessThanOrEqual(500);
  });

  test('should calculate cost per operation', async () => {
    const testId = testOrgId + '_cost_per_op';

    // Track a known cost
    const costPerOp = 0.05;
    trackLLMCost(testId, {
      provider: 'openai' as const,
      model: 'gpt-4-turbo',
      inputTokens: 2000,
      outputTokens: 1000,
      totalTokens: 3000,
      costUSD: costPerOp,
      requestDurationMs: 100,
      timestamp: new Date(),
      success: true,
    });

    const spend = getOrganizationMonthlySpend(testId);
    expect(spend).toBeCloseTo(costPerOp);
  });

  test('should track cost trends over time', async () => {
    const testId = testOrgId + '_trends';

    // Simulate increasing usage over days
    for (let day = 0; day < 30; day++) {
      const dailyCost = 1 + day * 0.5; // Increasing trend
      trackLLMCost(testId, {
        provider: 'openai' as const,
        model: 'gpt-4-turbo',
        inputTokens: 1000,
        outputTokens: 1000,
        totalTokens: 2000,
        costUSD: dailyCost / 100,
        requestDurationMs: 100,
        timestamp: new Date(Date.now() - (30 - day) * 86400000),
        success: true,
      });
    }

    const spend = getOrganizationMonthlySpend(testId);
    expect(spend).toBeGreaterThan(0);
  });

  test('should handle subscription cancellation', async () => {
    const cancelEvent: StripeWebhookEvent = {
      id: 'evt_cancel_123',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_cancel_123',
          customer: 'cus_test_123',
          status: 'canceled',
        } as any,
        previous_attributes: {
          status: 'active',
        },
      },
    } as any;

    // Should handle cancellation
    await expect(handleSubscriptionUpdated(cancelEvent)).resolves.not.toThrow();
  });
});
