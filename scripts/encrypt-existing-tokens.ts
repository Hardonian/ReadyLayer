/**
 * Encrypt Existing Installation Tokens (Legacy Script)
 * 
 * This script encrypts all plaintext tokens in the Installation table.
 * Uses the new crypto module with key rotation support.
 * 
 * Usage:
 *   READY_LAYER_KMS_KEY=<your-key> npm run secrets:encrypt-tokens
 *   OR
 *   READY_LAYER_MASTER_KEY=<your-key> npm run secrets:encrypt-tokens
 *   OR
 *   READY_LAYER_KEYS="v1:key1;v2:key2" npm run secrets:encrypt-tokens
 * 
 * For migration to new format, use: npm run secrets:migrate-tokens
 */

import { prisma } from '../lib/prisma';
import { encryptToken, isEncrypted, redactSecret } from '../lib/secrets';
import { isKeyConfigured } from '../lib/crypto';
import { logger } from '../observability/logging';

async function encryptExistingTokens() {
  logger.info('Starting token encryption migration');

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
    let errors = 0;

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
        errors++;
        logger.error(
          {
            err: error instanceof Error ? error : new Error(String(error)),
            installationId: installation.id,
            provider: installation.provider,
            providerId: installation.providerId,
            tokenPreview: redactSecret(installation.accessToken),
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
