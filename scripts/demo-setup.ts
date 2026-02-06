import { prisma } from '../lib/prisma';
import { sandboxFiles, sandboxPRMetadata } from '../content/demo/sandboxFixtures';

async function main(): Promise<void> {
  const defaultSandboxId = `sandbox_${sandboxPRMetadata.prSha}`;
  const defaultRunId = `demo_${sandboxPRMetadata.prSha}`;
  const sandboxId = process.env.DEMO_SANDBOX_ID ?? defaultSandboxId;
  const runId = process.env.DEMO_RUN_ID ?? defaultRunId;

  console.log('ReadyLayer demo setup');
  console.log(`- DEMO_MODE_ENABLED=${process.env.DEMO_MODE_ENABLED ?? 'false'}`);
  console.log(`- DEMO_SANDBOX_ID=${sandboxId}`);
  console.log(`- DEMO_RUN_ID=${runId}`);
  console.log(`- Demo files loaded: ${sandboxFiles.length}`);
  console.log(`- Demo PR: #${sandboxPRMetadata.prNumber} ${sandboxPRMetadata.prTitle}`);

  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL not set; skipping database verification.');
    return;
  }

  try {
    await prisma.$connect();
    const existingRuns = await prisma.readyLayerRun.count({
      where: { sandboxId },
    });
    console.log(`Existing sandbox runs with sandboxId=${sandboxId}: ${existingRuns}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Demo setup failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
