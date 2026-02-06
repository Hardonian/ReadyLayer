import { prisma } from '../lib/prisma';
import { sandboxPRMetadata } from '../content/demo/sandboxFixtures';

async function main(): Promise<void> {
  const defaultSandboxId = `sandbox_${sandboxPRMetadata.prSha}`;
  const sandboxId = process.env.DEMO_SANDBOX_ID ?? defaultSandboxId;

  console.log('ReadyLayer demo reset');
  console.log(`- DEMO_SANDBOX_ID=${sandboxId}`);

  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL not set; skipping database reset.');
    return;
  }

  try {
    await prisma.$connect();
    const deletedRuns = await prisma.readyLayerRun.deleteMany({
      where: { sandboxId },
    });
    const deletedOutbox = await prisma.outboxIntent.deleteMany({
      where: { sandboxId },
    });
    console.log(`Deleted sandbox runs: ${deletedRuns.count}`);
    console.log(`Deleted sandbox outbox intents: ${deletedOutbox.count}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Demo reset failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
