#!/usr/bin/env tsx
/**
 * Webhook Security Simulator
 *
 * Simulates webhook security scenarios for testing:
 * - Duplicate deliveries
 * - Signature validation
 * - Replay attacks
 * - Stale timestamps
 *
 * Usage:
 *   npx tsx scripts/webhook-simulator.ts --provider=github --action=duplicate
 *   npx tsx scripts/webhook-simulator.ts --provider=all --action=all
 */

import { randomUUID } from 'crypto';
import { Command } from 'commander';
import { webhookReplayProtection } from '../lib/security/webhook-replay';
import { generateHmacSignature, verifyHmacSignature } from '../lib/security/webhook-signature';
import { webhookIdempotencyService, ProcessWebhookResult } from '../lib/webhook-idempotency';

const program = new Command();

program
  .name('webhook-simulator')
  .description('Simulate webhook security scenarios for testing')
  .option('--provider <provider>', 'Provider to test', 'github')
  .option('--action <action>', 'Action to perform', 'all')
  .option('--secret <secret>', 'Webhook secret', 'test_secret_12345')
  .option('--count <count>', 'Number of iterations', '10');

program.parse();

interface Options {
  provider: string;
  action: string;
  secret: string;
  count: string;
}

const options = program.opts<Options>();
const COUNT = parseInt(options.count, 10);

console.log('='.repeat(60));
console.log('Webhook Security Simulator');
console.log('='.repeat(60));
console.log(`Provider: ${options.provider}`);
console.log(`Action: ${options.action}`);
console.log(`Iterations: ${COUNT}`);
console.log('='.repeat(60));

async function generateGitHubPayload(action: string = 'opened'): Promise<string> {
  return JSON.stringify({
    action,
    pull_request: {
      id: 12345,
      number: Math.floor(Math.random() * 1000),
      title: `Test PR #${Math.floor(Math.random() * 1000)}`,
      head: {
        sha: randomUUID().replace(/-/g, '').substring(0, 40),
        ref: 'feature-branch',
      },
      base: {
        ref: 'main',
      },
      merged: action === 'closed',
    },
    repository: {
      id: 98765,
      full_name: 'testorg/testrepo',
    },
    installation: {
      id: 123456,
    },
  });
}

async function generateSignature(payload: string, secret: string, provider: string): Promise<string> {
  if (provider === 'github') {
    return generateHmacSignature(payload, secret, 'sha256=');
  }
  if (provider === 'bitbucket') {
    return generateHmacSignature(payload, secret, '');
  }
  // gitlab uses plain token
  return secret;
}

async function simulateDuplicateDeliveries(provider: string, _secret: string): Promise<{ processed: number; duplicates: number; errors: number; }> {
  console.log('\n--- Duplicate Delivery Simulation ---');

  const results = {
    processed: 0,
    duplicates: 0,
    errors: 0,
  };

  for (let i = 0; i < COUNT; i++) {
    const eventId = `evt_${randomUUID()}`;

    try {
      const result = await webhookIdempotencyService.processWebhook({
        eventId,
        provider,
        eventType: 'pull_request',
        installationId: 'inst_123',
        async handler() {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { processed: true, iteration: i };
        },
      });

      if (result.isDuplicate) {
        results.duplicates++;
      } else {
        results.processed++;
      }

      // Simulate duplicate delivery
      const duplicateResult = await webhookIdempotencyService.processWebhook({
        eventId,
        provider,
        eventType: 'pull_request',
        installationId: 'inst_123',
        async handler() {
          return { shouldNotRun: true };
        },
      });

      if (duplicateResult.isDuplicate) {
        results.duplicates++;
      } else {
        results.errors++;
      }
    } catch {
      results.errors++;
    }
  }

  console.log(`Processed: ${results.processed}`);
  console.log(`Duplicates detected: ${results.duplicates}`);
  console.log(`Errors: ${results.errors}`);

  return results;
}

async function simulateSignatureValidationFailures(provider: string, secret: string): Promise<{ valid: number; invalidSignature: number; tamperedPayload: number; }> {
  console.log('\n--- Signature Validation Failure Simulation ---');

  const results = {
    valid: 0,
    invalidSignature: 0,
    tamperedPayload: 0,
  };

  const payload = await generateGitHubPayload('opened');

  for (let i = 0; i < COUNT; i++) {
    const validSignature = await generateSignature(payload, secret, provider);

    // Test 1: Valid signature
    const isValid = verifyHmacSignature(
      payload,
      validSignature,
      secret,
      provider === 'github' ? 'sha256=' : ''
    );
    if (isValid) results.valid++;

    // Test 2: Invalid signature
    const invalidSignature = 'sha256=invalid_signature_1234567890abcdef1234567890abcdef';
    const isInvalid = !verifyHmacSignature(payload, invalidSignature, secret, 'sha256=');
    if (isInvalid) results.invalidSignature++;

    // Test 3: Tampered payload
    const tamperedPayload = '{"action": "closed"}';
    const isTampered = !verifyHmacSignature(tamperedPayload, validSignature, secret, 'sha256=');
    if (isTampered) results.tamperedPayload++;
  }

  console.log(`Valid signatures accepted: ${results.valid}`);
  console.log(`Invalid signatures rejected: ${results.invalidSignature}`);
  console.log(`Tampered payloads rejected: ${results.tamperedPayload}`);

  return results;
}

async function simulateReplayAttacks(provider: string, _secret: string): Promise<{ firstRequest: number; replayRejected: number; differentNonceAccepted: number; }> {
  console.log('\n--- Replay Attack Simulation ---');

  await webhookReplayProtection.clearAllReplayCache();

  const results = {
    firstRequest: 0,
    replayRejected: 0,
    differentNonceAccepted: 0,
  };

  for (let i = 0; i < COUNT; i++) {
    const timestamp = Date.now().toString();
    const nonce1 = `${timestamp}:nonce1_${i}`;
    const nonce2 = `${timestamp}:nonce2_${i}`;
    const payload = await generateGitHubPayload('opened');
    const signature = await generateSignature(payload, 'test_secret', provider);

    // First request
    const isFirstReplay = await webhookReplayProtection.isReplay(provider, signature, parseInt(timestamp, 10), nonce1);
    if (!isFirstReplay) results.firstRequest++;

    // Replay with same nonce
    const isReplay = await webhookReplayProtection.isReplay(provider, signature, parseInt(timestamp, 10), nonce1);
    if (isReplay) results.replayRejected++;

    // Different nonce (should be accepted as new request)
    const isDifferentReplay = await webhookReplayProtection.isReplay(provider, signature, parseInt(timestamp, 10), nonce2);
    if (!isDifferentReplay) results.differentNonceAccepted++;
  }

  console.log(`First requests accepted: ${results.firstRequest}`);
  console.log(`Replays rejected: ${results.replayRejected}`);
  console.log(`Different nonces accepted: ${results.differentNonceAccepted}`);

  return results;
}

async function simulateStaleTimestamps(provider: string, _secret: string): Promise<{ freshAccepted: number; staleRejected: number; futureRejected: number; }> {
  console.log('\n--- Stale Timestamp Simulation ---');

  await webhookReplayProtection.clearAllReplayCache();

  const results = {
    freshAccepted: 0,
    staleRejected: 0,
    futureRejected: 0,
  };

  for (let i = 0; i < COUNT; i++) {
    const signature = 'test_signature_' + i;

    // Fresh timestamp (now)
    const freshTimestamp = Date.now();
    const freshNonce = `${freshTimestamp}:fresh_${i}`;
    const isFresh = await webhookReplayProtection.isReplay(provider, signature, freshTimestamp, freshNonce);
    if (!isFresh) results.freshAccepted++;

    // Stale timestamp (10 minutes ago)
    const staleTimestamp = Date.now() - 600000;
    const staleNonce = `${staleTimestamp}:stale_${i}`;
    const staleSignature = signature + '_stale';
    const isStale = await webhookReplayProtection.isReplay(provider, staleSignature, staleTimestamp, staleNonce);
    if (isStale) results.staleRejected++;

    // Future timestamp (5 minutes ahead)
    const futureTimestamp = Date.now() + 300000;
    const futureNonce = `${futureTimestamp}:future_${i}`;
    const futureSignature = signature + '_future';
    const isFuture = await webhookReplayProtection.isReplay(provider, futureSignature, futureTimestamp, futureNonce);
    if (isFuture) results.futureRejected++;
  }

  console.log(`Fresh timestamps accepted: ${results.freshAccepted}`);
  console.log(`Stale timestamps rejected: ${results.staleRejected}`);
  console.log(`Future timestamps rejected: ${results.futureRejected}`);

  return results;
}

async function simulateConcurrentProcessing(provider: string, _secret: string): Promise<{ total: number; handlerCalls: number; duplicates: number; }> {
  console.log('\n--- Concurrent Processing Simulation ---');

  const eventId = `concurrent_${randomUUID()}`;
  const handlerCalls: number[] = [];

  const promises: Promise<ProcessWebhookResult>[] = [];

  for (let i = 0; i < 5; i++) {
    promises.push(
      webhookIdempotencyService.processWebhook({
        eventId,
        provider,
        eventType: 'pull_request',
        installationId: 'inst_123',
        async handler() {
          handlerCalls.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          return { concurrent: true };
        },
      })
    );
  }

  const results = await Promise.all(promises);

  console.log(`Total concurrent requests: ${results.length}`);
  console.log(`Handler called: ${handlerCalls.length} times`);
  console.log(`Duplicates detected: ${results.filter(r => r.isDuplicate).length}`);

  return {
    total: results.length,
    handlerCalls: handlerCalls.length,
    duplicates: results.filter(r => r.isDuplicate).length,
  };
}

async function runAllTests(): Promise<void> {
  const providers = ['github', 'gitlab', 'bitbucket'];
  const actions = ['duplicate', 'signature', 'replay', 'stale', 'concurrent'];

  const summary: Record<string, Record<string, unknown>> = {};

  for (const provider of providers) {
    summary[provider] = {};

    for (const action of actions) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Provider: ${provider.toUpperCase()} | Action: ${action.toUpperCase()}`);
      console.log('='.repeat(60));

      switch (action) {
        case 'duplicate':
          summary[provider][action] = await simulateDuplicateDeliveries(provider, options.secret);
          break;
        case 'signature':
          summary[provider][action] = await simulateSignatureValidationFailures(provider, options.secret);
          break;
        case 'replay':
          summary[provider][action] = await simulateReplayAttacks(provider, options.secret);
          break;
        case 'stale':
          summary[provider][action] = await simulateStaleTimestamps(provider, options.secret);
          break;
        case 'concurrent':
          summary[provider][action] = await simulateConcurrentProcessing(provider, options.secret);
          break;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  for (const provider of providers) {
    console.log(`\n${provider}:`);
    for (const action of actions) {
      const result = summary[provider][action];
      if (result) {
        console.log(`  ${action}:`, JSON.stringify(result));
      }
    }
  }
}

async function main(): Promise<void> {
  try {
    if (options.action === 'all') {
      await runAllTests();
    } else {
      switch (options.action) {
        case 'duplicate':
          await simulateDuplicateDeliveries(options.provider, options.secret);
          break;
        case 'signature':
          await simulateSignatureValidationFailures(options.provider, options.secret);
          break;
        case 'replay':
          await simulateReplayAttacks(options.provider, options.secret);
          break;
        case 'stale':
          await simulateStaleTimestamps(options.provider, options.secret);
          break;
        case 'concurrent':
          await simulateConcurrentProcessing(options.provider, options.secret);
          break;
        default:
          console.error(`Unknown action: ${options.action}`);
          process.exit(1);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Simulation completed successfully');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Simulation failed:', error);
    process.exit(1);
  }
}

main();
