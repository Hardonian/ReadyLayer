/**
 * Provider Configuration Service
 * 
 * Handles encrypted storage and retrieval of LLM provider API keys.
 * Keys are encrypted at rest using lib/crypto and never exposed to client.
 */

import { prisma } from '@/lib/prisma';
import { encryptToString as encrypt, decryptFromString as decrypt } from '@/lib/crypto';
import { logger } from '@/observability/logging';

export interface ProviderConfigInput {
  provider: string; // openai, anthropic, opencode, openrouter
  apiKey: string;
  routingStrategy?: string; // single, fallback, variance
}

export interface ProviderConfigOutput {
  id: string;
  provider: string;
  routingStrategy: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // NOTE: apiKey is NEVER returned
}

export class ProviderConfigService {
  /**
   * Create or update provider configuration
   */
  async setProviderConfig(
    organizationId: string,
    input: ProviderConfigInput
  ): Promise<ProviderConfigOutput> {
    try {
      const encryptedKey = await encrypt(input.apiKey);

      const config = await prisma.providerConfig.upsert({
        where: {
          organizationId_provider: {
            organizationId,
            provider: input.provider,
          },
        },
        create: {
          organizationId,
          provider: input.provider,
          encryptedKey,
          routingStrategy: input.routingStrategy || 'single',
          isActive: true,
        },
        update: {
          encryptedKey,
          routingStrategy: input.routingStrategy || 'single',
          isActive: true,
        },
      });

      logger.info(
        {
          organizationId,
          provider: input.provider,
        },
        'Provider configuration updated'
      );

      return this.formatOutput(config);
    } catch (error) {
      logger.error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
          organizationId,
          provider: input.provider,
        },
        'Failed to set provider config'
      );
      throw error;
    }
  }

  /**
   * Get provider configuration (WITHOUT decrypting the key)
   */
  async getProviderConfig(
    organizationId: string,
    provider: string
  ): Promise<ProviderConfigOutput | null> {
    try {
      const config = await prisma.providerConfig.findUnique({
        where: {
          organizationId_provider: {
            organizationId,
            provider,
          },
        },
      });

      if (!config) {
        return null;
      }

      return this.formatOutput(config);
    } catch (error) {
      logger.error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
          organizationId,
          provider,
        },
        'Failed to get provider config'
      );
      throw error;
    }
  }

  /**
   * Get decrypted API key (server-only, never sent to client)
   */
  async getDecryptedApiKey(
    organizationId: string,
    provider: string
  ): Promise<string | null> {
    try {
      const config = await prisma.providerConfig.findUnique({
        where: {
          organizationId_provider: {
            organizationId,
            provider,
          },
        },
      });

      if (!config || !config.isActive) {
        return null;
      }

      const decrypted = await decrypt(config.encryptedKey);
      return decrypted;
    } catch (error) {
      logger.error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
          organizationId,
          provider,
        },
        'Failed to decrypt API key'
      );
      throw error;
    }
  }

  /**
   * List all provider configurations for organization (without keys)
   */
  async listProviderConfigs(organizationId: string): Promise<ProviderConfigOutput[]> {
    try {
      const configs = await prisma.providerConfig.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });

      return configs.map((config) => this.formatOutput(config));
    } catch (error) {
      logger.error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
          organizationId,
        },
        'Failed to list provider configs'
      );
      throw error;
    }
  }

  /**
   * Delete provider configuration
   */
  async deleteProviderConfig(
    organizationId: string,
    provider: string
  ): Promise<void> {
    try {
      await prisma.providerConfig.delete({
        where: {
          organizationId_provider: {
            organizationId,
            provider,
          },
        },
      });

      logger.info(
        {
          organizationId,
          provider,
        },
        'Provider configuration deleted'
      );
    } catch (error) {
      logger.error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
          organizationId,
          provider,
        },
        'Failed to delete provider config'
      );
      throw error;
    }
  }

  /**
   * Test provider connectivity (validates API key without storing)
   */
  async testProviderConnectivity(
    provider: string,
    apiKey: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      switch (provider) {
        case 'openai':
          return await this.testOpenAIConnectivity(apiKey);
        case 'anthropic':
          return await this.testAnthropicConnectivity(apiKey);
        case 'opencode':
          return await this.testOpenCodeConnectivity(apiKey);
        default:
          return { success: false, error: `Unknown provider: ${provider}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async testOpenAIConnectivity(apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return { success: true };
      } else if (response.status === 401) {
        return { success: false, error: 'Invalid API key' };
      } else {
        return { success: false, error: `API error: ${response.statusText}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private async testAnthropicConnectivity(apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'test' }],
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return { success: true };
      } else if (response.status === 401) {
        return { success: false, error: 'Invalid API key' };
      } else {
        return { success: false, error: `API error: ${response.statusText}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private async testOpenCodeConnectivity(apiKey: string): Promise<{ success: boolean; error?: string }> {
    const apiUrl = process.env.OPENCODE_API_URL;
    if (!apiUrl) {
      return { success: false, error: 'OPENCODE_API_URL not configured' };
    }

    try {
      const response = await fetch(`${apiUrl}/v1/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'opencode-baseline-v1',
          prompt: 'test',
          max_tokens: 100,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return { success: true };
      } else if (response.status === 401) {
        return { success: false, error: 'Invalid API key' };
      } else {
        return { success: false, error: `API error: ${response.statusText}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Format config for output (strip encrypted key)
   */
  private formatOutput(config: {
    id: string;
    provider: string;
    routingStrategy: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ProviderConfigOutput {
    return {
      id: config.id,
      provider: config.provider,
      routingStrategy: config.routingStrategy,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}

export const providerConfigService = new ProviderConfigService();
