/**
 * Deterministic Seed Data for Demo Mode
 *
 * Provides fixed IDs, timestamps, and records so that demo environments
 * are fully reproducible without external services or secrets.
 *
 * Used by:
 * - prisma/seed.ts (when DEMO_MODE_ENABLED=true)
 * - E2E tests that need predictable database state
 */

import { DEMO_FROZEN_TIMESTAMP, DEMO_FROZEN_DATE } from '../../lib/demo/pipeline';
import { sandboxPRMetadata } from './sandboxFixtures';

/** Fixed UUIDs so every seed run is idempotent */
export const DEMO_IDS = {
  organizationId: 'demo-org-00000000-0000-0000-0000-000000000001',
  userId: 'demo-user-00000000-0000-0000-0000-000000000001',
  repositoryId: 'demo-repo-00000000-0000-0000-0000-000000000001',
  runId: 'demo-run-00000000-0000-0000-0000-000000000001',
  sandboxId: `sandbox_${sandboxPRMetadata.prSha}`,
} as const;

/** Deterministic organization record */
export const demoOrganization = {
  id: DEMO_IDS.organizationId,
  name: 'ReadyLayer Demo Org',
  slug: 'readylayer-demo',
  createdAt: new Date(DEMO_FROZEN_TIMESTAMP),
  updatedAt: new Date(DEMO_FROZEN_TIMESTAMP),
};

/** Deterministic user record */
export const demoUser = {
  id: DEMO_IDS.userId,
  email: 'demo@readylayer.dev',
  name: 'Demo User',
  createdAt: new Date(DEMO_FROZEN_TIMESTAMP),
  updatedAt: new Date(DEMO_FROZEN_TIMESTAMP),
};

/** Deterministic repository record */
export const demoRepository = {
  id: DEMO_IDS.repositoryId,
  organizationId: DEMO_IDS.organizationId,
  name: 'demo-sandbox-repo',
  fullName: 'readylayer-demo/demo-sandbox-repo',
  provider: 'github' as const,
  defaultBranch: 'main',
  createdAt: new Date(DEMO_FROZEN_TIMESTAMP),
  updatedAt: new Date(DEMO_FROZEN_TIMESTAMP),
};

/** Deterministic run record that matches the demo pipeline output */
export const demoRun = {
  id: DEMO_IDS.runId,
  correlationId: `run_demo_${sandboxPRMetadata.prSha}`,
  repositoryId: DEMO_IDS.repositoryId,
  sandboxId: DEMO_IDS.sandboxId,
  trigger: 'sandbox' as const,
  triggerMetadata: {
    prNumber: sandboxPRMetadata.prNumber,
    prSha: sandboxPRMetadata.prSha,
    prTitle: sandboxPRMetadata.prTitle,
  },
  status: 'completed' as const,
  conclusion: 'failure' as const,
  reviewGuardStatus: 'failed' as const,
  testEngineStatus: 'succeeded' as const,
  docSyncStatus: 'succeeded' as const,
  gatesPassed: false,
  gatesFailed: [
    {
      gate: 'review_guard',
      reason: 'Critical findings must be resolved before merging.',
    },
  ],
  startedAt: new Date(DEMO_FROZEN_TIMESTAMP),
  completedAt: new Date(DEMO_FROZEN_TIMESTAMP),
};

/** Summary of what the seed populates - useful for logging */
export const DEMO_SEED_SUMMARY = {
  organization: demoOrganization.name,
  user: demoUser.email,
  repository: demoRepository.fullName,
  runId: demoRun.id,
  frozenTimestamp: DEMO_FROZEN_TIMESTAMP,
  frozenDate: DEMO_FROZEN_DATE,
};
