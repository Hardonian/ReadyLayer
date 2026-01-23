/**
 * Installation Token Encryption/Decryption Helpers
 *
 * Provides secure access to GitHub installation tokens with automatic encryption/decryption
 * All tokens MUST be encrypted at rest in database
 */

import { encrypt, decrypt, isEncrypted } from './secrets/encrypt';
import { prisma } from './prisma';
import { logger } from '../observability/logging';
import { toJsonValue } from './prisma-json';

export interface InstallationWithToken {
  id: string;
  provider: string;
  providerId: string;
  accessToken: string;
  tokenEncrypted: boolean;
  organizationId: string | null;
  repositoryId: string | null;
  permissions: Record<string, unknown>;
  selectedRepos: string[];
  webhookSecret: string | null;
  isActive: boolean;
  installedAt: Date;
  updatedAt: Date;
}

/**
 * Create installation with encrypted token
 */
export async function createInstallation(params: {
  organizationId?: string;
  repositoryId?: string;
  provider: string;
  providerId: string;
  accessToken: string;
  permissions: Record<string, unknown>;
  selectedRepos?: string[];
  webhookSecret?: string;
}): Promise<InstallationWithToken> {
  // Encrypt token before storing
  const encryptedToken = encrypt(params.accessToken);

  const installation = await prisma.installation.create({
    data: {
      organizationId: params.organizationId || null,
      repositoryId: params.repositoryId || null,
      provider: params.provider,
      providerId: params.providerId,
      accessToken: encryptedToken, // Encrypted
      tokenEncrypted: true,
      permissions: toJsonValue(params.permissions),
      selectedRepos: params.selectedRepos || [],
      webhookSecret: params.webhookSecret || null,
      isActive: true,
    },
  });

  logger.info(
    {
      installationId: installation.id,
      provider: installation.provider,
      providerId: installation.providerId,
    },
    'Installation created with encrypted token'
  );

  return {
    ...installation,
    accessToken: params.accessToken, // Return plaintext for immediate use
    permissions: installation.permissions as Record<string, unknown>,
  };
}

/**
 * Get installation token (decrypted)
 */
export async function getInstallationToken(installationId: string): Promise<string> {
  const installation = await prisma.installation.findUnique({
    where: { id: installationId },
    select: {
      id: true,
      accessToken: true,
      tokenEncrypted: true,
      provider: true,
      providerId: true,
    },
  });

  if (!installation) {
    throw new Error(`Installation ${installationId} not found`);
  }

  // Decrypt token
  return decryptInstallationToken(installation);
}

/**
 * Get installation token by provider ID (decrypted)
 */
export async function getInstallationTokenByProviderId(
  provider: string,
  providerId: string
): Promise<string> {
  const installation = await prisma.installation.findUnique({
    where: {
      provider_providerId: {
        provider,
        providerId,
      },
    },
    select: {
      id: true,
      accessToken: true,
      tokenEncrypted: true,
      provider: true,
      providerId: true,
    },
  });

  if (!installation) {
    throw new Error(`Installation for ${provider}:${providerId} not found`);
  }

  return decryptInstallationToken(installation);
}

/**
 * Update installation token (encrypted)
 */
export async function updateInstallationToken(
  installationId: string,
  newToken: string
): Promise<void> {
  const encryptedToken = encrypt(newToken);

  await prisma.installation.update({
    where: { id: installationId },
    data: {
      accessToken: encryptedToken,
      tokenEncrypted: true,
      updatedAt: new Date(),
    },
  });

  logger.info(
    { installationId },
    'Installation token updated with encryption'
  );
}

/**
 * Decrypt installation token with migration support
 */
function decryptInstallationToken(installation: {
  id: string;
  accessToken: string;
  tokenEncrypted: boolean;
  provider: string;
  providerId: string;
}): string {
  // If token is already encrypted, decrypt it
  if (installation.tokenEncrypted || isEncrypted(installation.accessToken)) {
    try {
      return decrypt(installation.accessToken);
    } catch (error) {
      logger.error(
        {
          installationId: installation.id,
          provider: installation.provider,
          providerId: installation.providerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to decrypt installation token'
      );
      throw new Error('Failed to decrypt installation token. Token may be corrupted.');
    }
  }

  // SECURITY: Plaintext token detected - this should not happen in production
  // Log warning but allow access during migration period
  logger.warn(
    {
      installationId: installation.id,
      provider: installation.provider,
      providerId: installation.providerId,
    },
    'SECURITY WARNING: Plaintext installation token detected. Run migration: npm run secrets:encrypt-tokens'
  );

  // Return plaintext token (migration grace period)
  // TODO: After migration is complete, throw error instead
  return installation.accessToken;
}

/**
 * Migrate all plaintext tokens to encrypted
 * Run this script once to encrypt all existing tokens
 */
export async function migrateAllTokens(): Promise<{
  total: number;
  encrypted: number;
  alreadyEncrypted: number;
  failed: number;
}> {
  const installations = await prisma.installation.findMany({
    where: {
      tokenEncrypted: false,
    },
    select: {
      id: true,
      accessToken: true,
      tokenEncrypted: true,
      provider: true,
      providerId: true,
    },
  });

  let encrypted = 0;
  let alreadyEncrypted = 0;
  let failed = 0;

  for (const installation of installations) {
    try {
      // Check if already encrypted (flag might be wrong)
      if (isEncrypted(installation.accessToken)) {
        // Just update flag
        await prisma.installation.update({
          where: { id: installation.id },
          data: { tokenEncrypted: true },
        });
        alreadyEncrypted++;
        continue;
      }

      // Encrypt plaintext token
      const encryptedToken = encrypt(installation.accessToken);

      await prisma.installation.update({
        where: { id: installation.id },
        data: {
          accessToken: encryptedToken,
          tokenEncrypted: true,
        },
      });

      encrypted++;
      logger.info(
        {
          installationId: installation.id,
          provider: installation.provider,
        },
        'Token encrypted'
      );
    } catch (error) {
      failed++;
      logger.error(
        {
          installationId: installation.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to encrypt token'
      );
    }
  }

  const result = {
    total: installations.length,
    encrypted,
    alreadyEncrypted,
    failed,
  };

  logger.info(result, 'Token migration completed');

  return result;
}

/**
 * Rotate installation token
 * Fetches new token from provider and stores encrypted
 */
export async function rotateInstallationToken(
  installationId: string,
  newToken: string
): Promise<void> {
  await updateInstallationToken(installationId, newToken);

  logger.info(
    { installationId },
    'Installation token rotated'
  );
}
