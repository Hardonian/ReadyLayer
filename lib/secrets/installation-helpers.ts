/**
 * Installation Token Helpers
 * 
 * Wrappers for Prisma Installation operations that handle encryption
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { encryptToken, decryptToken } from './index';

/**
 * Create installation with encrypted token
 */
export async function createInstallationWithEncryptedToken(
  data: Omit<Prisma.InstallationCreateInput, 'accessToken' | 'tokenEncrypted'> & { accessToken: string }
) {
  const encryptedToken = encryptToken(data.accessToken);
  
  return prisma.installation.create({
    data: {
      ...data,
      accessToken: encryptedToken,
      tokenEncrypted: true,
    } as Prisma.InstallationCreateInput,
  });
}

/**
 * Update installation token (encrypts if plaintext)
 */
export async function updateInstallationToken(
  installationId: string,
  accessToken: string
) {
  const encryptedToken = encryptToken(accessToken);
  
  return prisma.installation.update({
    where: { id: installationId },
    data: {
      accessToken: encryptedToken,
      tokenEncrypted: true,
    } as Prisma.InstallationUpdateInput,
  });
}

/**
 * Get installation with decrypted token
 */
export async function getInstallationWithDecryptedToken(installationId: string) {
  const installation = await prisma.installation.findUnique({
    where: { id: installationId },
  });

  if (!installation) {
    return null;
  }

  return {
    ...installation,
    accessToken: decryptToken(installation.accessToken),
  };
}

/**
 * Get installation by provider/providerId with decrypted token
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

  return {
    ...installation,
    accessToken: decryptToken(installation.accessToken),
  };
}
