/**
 * Encrypt Existing Installation Tokens
 * 
 * This script encrypts all plaintext tokens in the Installation table.
 * Run this AFTER deploying the encryption utility.
 * 
 * Usage:
 *   ENCRYPTION_KEY=<your-key> tsx scripts/encrypt-existing-tokens.ts
 */

import { prisma } from '../lib/prisma';
import { encryptToken, isEncrypted } from '../lib/secrets';
import { logger } from '../observability/logging';

async function encryptExistingTokens() {
  logger.info('Starting token encryption migration');

  try {
    // Get all installations with unencrypted tokens
    const installations = await prisma.installation.findMany({
      where: {
        OR: [
          { tokenEncrypted: false },
          { tokenEncrypted: null },
        ],
      } as any, // Type assertion needed until Prisma types are regenerated
    });

    logger.info({ count: installations.length }, 'Found installations to encrypt');

    let encrypted = 0;
    let skipped = 0;
    let errors = 0;

    for (const installation of installations) {
      try {
        // Check if already encrypted
        if (isEncrypted(installation.accessToken)) {
          logger.info({ installationId: installation.id }, 'Token already encrypted, skipping');
          await prisma.installation.update({
            where: { id: installation.id },
            data: { tokenEncrypted: true } as any, // Type assertion needed until Prisma types are regenerated
          });
          skipped++;
          continue;
        }

        // Encrypt token
        const encryptedToken = encryptToken(installation.accessToken);

        // Update installation
        await prisma.installation.update({
          where: { id: installation.id },
          data: {
            accessToken: encryptedToken,
            tokenEncrypted: true,
          } as any, // Type assertion needed until Prisma types are regenerated
        });

        encrypted++;
        logger.info({ installationId: installation.id }, 'Token encrypted successfully');
      } catch (error) {
        errors++;
        logger.error(
          {
            err: error instanceof Error ? error : new Error(String(error)),
            installationId: installation.id,
          },
          'Failed to encrypt token'
        );
      }
    }

    logger.info(
      {
        total: installations.length,
        encrypted,
        skipped,
        errors,
      },
      'Token encryption migration completed'
    );

    if (errors > 0) {
      logger.warn({ errors }, 'Some tokens failed to encrypt. Review logs and retry.');
      process.exit(1);
    }
  } catch (error) {
    logger.error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
      },
      'Token encryption migration failed'
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  encryptExistingTokens().catch((error) => {
    logger.error(error, 'Unhandled error in token encryption script');
    process.exit(1);
  });
}

export { encryptExistingTokens };
