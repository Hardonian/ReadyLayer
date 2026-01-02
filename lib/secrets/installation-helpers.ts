/**
 * Installation Token Helpers
 * 
 * Wrappers for Prisma Installation operations that handle encryption
 * Uses new crypto module with key rotation support
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { encryptToken, decryptToken, redactSecret } from './index';
import { isKeyConfigured } from '../crypto';
import { logger } from '../../observability/logging';

/**
 * Create installation with encrypted token
 * Never logs the token value
 */
export async function createInstallationWithEncryptedToken(
  data: Omit<Prisma.InstallationCreateInput, 'accessToken' | 'tokenEncrypted'> & { accessToken: string }
) {
  if (!isKeyConfigured()) {
    logger.error('Encryption keys not configured - cannot encrypt installation token');
    throw new Error('Encryption keys not configured. Set READY_LAYER_KMS_KEY, READY_LAYER_MASTER_KEY, or READY_LAYER_KEYS environment variable.');
  }

  try {
    const encryptedToken = encryptToken(data.accessToken);
    
    return prisma.installation.create({
      data: {
        ...data,
        accessToken: encryptedToken,
        tokenEncrypted: true,
      } as Prisma.InstallationCreateInput,
    });
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)), tokenPreview: redactSecret(data.accessToken) },
      'Failed to create installation with encrypted token'
    );
    throw error;
  }
}

/**
 * Update installation token (encrypts if plaintext)
 * Never logs the token value
 */
export async function updateInstallationToken(
  installationId: string,
  accessToken: string
) {
  if (!isKeyConfigured()) {
    logger.error('Encryption keys not configured - cannot encrypt installation token');
    throw new Error('Encryption keys not configured. Set READY_LAYER_KMS_KEY, READY_LAYER_MASTER_KEY, or READY_LAYER_KEYS environment variable.');
  }

  try {
    const encryptedToken = encryptToken(accessToken);
    
    return prisma.installation.update({
      where: { id: installationId },
      data: {
        accessToken: encryptedToken,
        tokenEncrypted: true,
      } as Prisma.InstallationUpdateInput,
    });
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)), installationId, tokenPreview: redactSecret(accessToken) },
      'Failed to update installation token'
    );
    throw error;
  }
}

/**
 * Get installation with decrypted token
 * Never logs the token value
 * Returns null if keys not configured (graceful degradation)
 */
export async function getInstallationWithDecryptedToken(installationId: string) {
  const installation = await prisma.installation.findUnique({
    where: { id: installationId },
  });

  if (!installation) {
    return null;
  }

  if (!isKeyConfigured()) {
    logger.error({ installationId }, 'Encryption keys not configured - cannot decrypt installation token');
    // Return installation without decrypted token (caller should handle)
    return {
      ...installation,
      accessToken: '', // Empty token indicates decryption failed
    };
  }

  try {
    return {
      ...installation,
      accessToken: decryptToken(installation.accessToken),
    };
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)), installationId, tokenPreview: redactSecret(installation.accessToken) },
      'Failed to decrypt installation token'
    );
    // Return installation with empty token on decryption failure
    return {
      ...installation,
      accessToken: '',
    };
  }
}

/**
 * Get installation by provider/providerId with decrypted token
 * Never logs the token value
 * Returns null if keys not configured (graceful degradation)
 */
export async function getInstallationByProviderWithDecryptedToken(
  provider: string,
  providerId: string
) {
  const installation = await prisma.installation.findUnique({
    where: {
      provider_providerId: {
        provider,
        providerId,
      },
    },
  });

  if (!installation) {
    return null;
  }

  if (!isKeyConfigured()) {
    logger.error({ provider, providerId }, 'Encryption keys not configured - cannot decrypt installation token');
    return {
      ...installation,
      accessToken: '', // Empty token indicates decryption failed
    };
  }

  try {
    return {
      ...installation,
      accessToken: decryptToken(installation.accessToken),
    };
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)), provider, providerId, tokenPreview: redactSecret(installation.accessToken) },
      'Failed to decrypt installation token'
    );
    return {
      ...installation,
      accessToken: '',
    };
  }
}
