/**
 * Migrate Installation Tokens to Encrypted Format
 * 
 * Encrypts all plaintext installation tokens using the new crypto module.
 * Safe to run multiple times (idempotent).
 */

import { prisma } from '../lib/prisma';
import { encryptToken, isEncrypted, isKeyConfigured, redactSecret } from '../lib/crypto';
import { logger } from '../observability/logging';

async function migrateInstallationTokens() {
  logger.info('Starting installation token migration');

  // Check if encryption keys are configured
  if (!isKeyConfigured()) {
    logger.error(
      'Encryption keys not configured. Set READY_LAYER_KMS_KEY, READY_LAYER_MASTER_KEY, or READY_LAYER_KEYS environment variable.'
    );
    process.exit(1);
  }

  try {
    // Get all installations
    const installations = await prisma.installation.findMany({
      select: {
        id: true,
        accessToken: true,
        tokenEncrypted: true,
        provider: true,
        providerId: true,
      },
    });

    logger.info({ total: installations.length }, 'Found installations to check');

    let encrypted = 0;
    let skipped = 0;
    let failed = 0;

    for (const installation of installations) {
      try {
        // Check if already encrypted (new format)
        if (isEncrypted(installation.accessToken)) {
          // Already encrypted, just ensure tokenEncrypted flag is set
          if (!installation.tokenEncrypted) {
            await prisma.installation.update({
              where: { id: installation.id },
              data: { tokenEncrypted: true },
            });
            logger.debug(
              { installationId: installation.id, provider: installation.provider },
              'Updated tokenEncrypted flag for already-encrypted token'
            );
          }
          skipped++;
          continue;
        }

        // Check if marked as encrypted but actually plaintext (data inconsistency)
        if (installation.tokenEncrypted && !isEncrypted(installation.accessToken)) {
          logger.warn(
            { installationId: installation.id, provider: installation.provider },
            'Installation marked as encrypted but token is plaintext - re-encrypting'
          );
        }

        // Encrypt plaintext token
        logger.info(
          {
            installationId: installation.id,
            provider: installation.provider,
            providerId: installation.providerId,
            tokenPreview: redactSecret(installation.accessToken),
          },
          'Encrypting installation token'
        );

        const encryptedToken = encryptToken(installation.accessToken);

        // Update installation
        await prisma.installation.update({
          where: { id: installation.id },
          data: {
            accessToken: encryptedToken,
            tokenEncrypted: true,
          },
        });

        encrypted++;
        logger.info(
          { installationId: installation.id, provider: installation.provider },
          'Token encrypted successfully'
        );
      } catch (error) {
        failed++;
        logger.error(
          {
            err: error instanceof Error ? error : new Error(String(error)),
            installationId: installation.id,
            provider: installation.provider,
            providerId: installation.providerId,
            tokenPreview: redactSecret(installation.accessToken),
          },
          'Failed to encrypt installation token'
        );
        // Continue with next installation
      }
    }

    logger.info(
      {
        total: installations.length,
        encrypted,
        skipped,
        failed,
      },
      'Migration completed'
    );

    if (failed > 0) {
      logger.warn({ failed }, 'Some installations failed to encrypt - review logs');
      process.exit(1);
    }

    logger.info('All installation tokens migrated successfully');
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'Migration failed'
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateInstallationTokens()
  .then(() => {
    logger.info('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'Migration script failed'
    );
    process.exit(1);
  });
