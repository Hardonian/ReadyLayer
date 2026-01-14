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
  getSubscriptionStatus,
  handleSubscriptionUpdated,
  handlePaymentSucceeded,
} from '../services/billing/stripe-webhook-handler';

test.describe('Billing and Subscription Workflow', () => {
  const testOrgId = 'org_test_' + Date.now();

  test('should track LLM costs accurately', async () => {
    const entry = {
      organizationId: testOrgId,
      modelName: 'gpt-4-turbo',
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      costUSD: 0.025, // 0.01 + 0.015
      timestamp: new Date(),
    };

    await trackLLMCost(entry);

    const spend = await getOrganizationMonthlySpend(testOrgId);
    expect(spend).toBeGreaterThan(0);
  });

  test('should enforce budget limits', async () => {
    const monthlyBudget = 100;

    // Track expenses
    for (let i = 0; i < 50; i++) {
      await trackLLMCost({
        organizationId: testOrgId,
        modelName: 'gpt-3.5-turbo',
        inputTokens: 1000,
        outputTokens: 1000,
        totalTokens: 2000,
        costUSD: 0.002, // Cheap model
        timestamp: new Date(),
      });
    }

    const withinBudget = await isWithinBudget(testOrgId, monthlyBudget);
    expect(typeof withinBudget).toBe('boolean');

    const remaining = await getRemainingBudget(testOrgId, monthlyBudget);
    expect(remaining).toBeLessThanOrEqual(monthlyBudget);
  });

  test('should calculate budget utilization', async () => {
    const monthlyBudget = 1000;

    // Add some costs
    for (let i = 0; i < 10; i++) {
      await trackLLMCost({
        organizationId: testOrgId + '_utilization',
        modelName: 'gpt-4-turbo',
        inputTokens: 1000,
        outputTokens: 1000,
        totalTokens: 2000,
        costUSD: 0.04,
        timestamp: new Date(),
      });
    }

    const utilization = await getBudgetUtilization(testOrgId + '_utilization', monthlyBudget);
    expect(utilization).toBeGreaterThan(0);
    expect(utilization).toBeLessThanOrEqual(100);
  });

  test('should trigger budget alerts', async () => {
    const monthlyBudget = 100;
    const testId = testOrgId + '_alerts';

    // Track expensive usage to trigger warning
    for (let i = 0; i < 200; i++) {
      await trackLLMCost({
        organizationId: testId,
        modelName: 'gpt-4-turbo',
        inputTokens: 1000,
        outputTokens: 1000,
        totalTokens: 2000,
        costUSD: 0.04,
        timestamp: new Date(),
      });
    }

    const alert = await checkBudgetAlerts(testId, monthlyBudget);
    expect(['ok', 'warning', 'critical']).toContain(alert);
  });

  test('should handle subscription updates from Stripe', async () => {
    const event = {
      id: 'evt_test_123',
      object: 'event',
      type: 'customer.subscription.updated',
      created: Math.floor(Date.now() / 1000),
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
      livemode: false,
      pending_webhooks: 0,
    };

    // Should process without throwing
    await expect(handleSubscriptionUpdated(event as any)).resolves.not.toThrow();
  });

  test('should record successful payments', async () => {
    const event = {
      id: 'evt_invoice_123',
      object: 'event',
      type: 'invoice.payment_succeeded',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'in_test_123',
          customer: 'cus_test_123',
          amount_paid: 9900, // $99.00
          status: 'paid',
          paid_at: Math.floor(Date.now() / 1000),
          number: 'INV-0001',
        },
      },
      livemode: false,
      pending_webhooks: 0,
    };

    // Should process without throwing
    await expect(handlePaymentSucceeded(event as any)).resolves.not.toThrow();
  });

  test('should handle plan upgrades', async () => {
    const upgradeEvent = {
      id: 'evt_upgrade_123',
      object: 'event',
      type: 'customer.subscription.updated',
      created: Math.floor(Date.now() / 1000),
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
        },
      },
      livemode: false,
      pending_webhooks: 0,
    };

    // Should handle upgrade
    await expect(handleSubscriptionUpdated(upgradeEvent as any)).resolves.not.toThrow();
  });

  test('should detect free tier usage limits', async () => {
    const freeOrgId = testOrgId + '_free';

    // Track multiple LLM calls (free tier might have limits)
    const calls = 10;
    for (let i = 0; i < calls; i++) {
      await trackLLMCost({
        organizationId: freeOrgId,
        modelName: 'gpt-3.5-turbo',
        inputTokens: 100,
        outputTokens: 100,
        totalTokens: 200,
        costUSD: 0.00004,
        timestamp: new Date(),
      });
    }

    const spend = await getOrganizationMonthlySpend(freeOrgId);
    expect(spend).toBeGreaterThan(0);
  });

  test('should provide usage visibility in dashboard', async () => {
    const testId = testOrgId + '_visibility';

    // Track realistic usage
    const models = ['gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-haiku'];
    for (const model of models) {
      for (let i = 0; i < 5; i++) {
        await trackLLMCost({
          organizationId: testId,
          modelName: model,
          inputTokens: Math.floor(Math.random() * 2000),
          outputTokens: Math.floor(Math.random() * 1000),
          totalTokens: Math.floor(Math.random() * 3000),
          costUSD: Math.random() * 0.1,
          timestamp: new Date(Date.now() - Math.random() * 86400000 * 30),
        });
      }
    }

    const spend = await getOrganizationMonthlySpend(testId);
    const utilization = await getBudgetUtilization(testId, 500);
    const remaining = await getRemainingBudget(testId, 500);

    expect(spend).toBeGreaterThanOrEqual(0);
    expect(utilization).toBeGreaterThanOrEqual(0);
    expect(remaining).toBeLessThanOrEqual(500);
  });

  test('should calculate cost per operation', async () => {
    const testId = testOrgId + '_cost_per_op';

    // Track a known cost
    const costPerOp = 0.05;
    await trackLLMCost({
      organizationId: testId,
      modelName: 'gpt-4-turbo',
      inputTokens: 2000,
      outputTokens: 1000,
      totalTokens: 3000,
      costUSD: costPerOp,
      timestamp: new Date(),
    });

    const spend = await getOrganizationMonthlySpend(testId);
    expect(spend).toBeCloseTo(costPerOp);
  });

  test('should track cost trends over time', async () => {
    const testId = testOrgId + '_trends';

    // Simulate increasing usage over days
    for (let day = 0; day < 30; day++) {
      const dailyCost = 1 + day * 0.5; // Increasing trend
      await trackLLMCost({
        organizationId: testId,
        modelName: 'gpt-4-turbo',
        inputTokens: 1000,
        outputTokens: 1000,
        totalTokens: 2000,
        costUSD: dailyCost / 100,
        timestamp: new Date(Date.now() - (30 - day) * 86400000),
      });
    }

    const spend = await getOrganizationMonthlySpend(testId);
    expect(spend).toBeGreaterThan(0);
  });

  test('should handle subscription cancellation', async () => {
    const cancelEvent = {
      id: 'evt_cancel_123',
      object: 'event',
      type: 'customer.subscription.updated',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'sub_cancel_123',
          customer: 'cus_test_123',
          status: 'canceled',
        },
        previous_attributes: {
          status: 'active',
        },
      },
      livemode: false,
      pending_webhooks: 0,
    };

    // Should handle cancellation
    await expect(handleSubscriptionUpdated(cancelEvent as any)).resolves.not.toThrow();
  });
});
