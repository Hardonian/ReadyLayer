/**
 * LLM Service
 * 
 * Centralized LLM interaction and prompt management
 * Supports OpenAI and Anthropic APIs with caching and cost tracking
 */

import { prisma } from '../../lib/prisma';
import { usageEnforcementService } from '../../lib/usage-enforcement';
// import { createHash } from 'crypto'; // Reserved for future caching

export interface LLMRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  organizationId: string;
  userId?: string;
  cache?: boolean;
}

export interface LLMResponse {
  content: string;
  model: string;
  tokensUsed: number;
  cost: number;
  cached: boolean;
}

export interface LLMProvider {
  name: string;
  complete(request: LLMRequest): Promise<LLMResponse>;
}

// OpenAI Provider
class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private apiKey: string | null = null;
  private baseUrl = 'https://api.openai.com/v1';

  private getApiKey(): string {
    if (!this.apiKey) {
      this.apiKey = process.env.OPENAI_API_KEY || '';
      if (!this.apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }
    }
    return this.apiKey;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const apiKey = this.getApiKey();
    const model = request.model || 'gpt-4-turbo-preview';
    const url = `${this.baseUrl}/chat/completions`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: request.prompt }],
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 2000,
        }),
        signal: AbortSignal.timeout(60000), // 60 second timeout for LLM
      });
    } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new Error('OpenAI API request timed out');
      }
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error(`OpenAI API network error: ${error.message}`);
      }
      throw error;
    }

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.message || `${response.status} ${response.statusText}`;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error('Failed to parse OpenAI API response as JSON');
    }

    const content = data.choices[0]?.message?.content || '';
    const tokensUsed = data.usage?.total_tokens || 0;

    if (!content) {
      throw new Error('OpenAI API returned empty response');
    }

    // Calculate cost (approximate, varies by model)
    const cost = this.calculateCost(model, tokensUsed);

    // Track cost (don't fail on cost tracking errors)
    try {
      await this.trackCost(request.organizationId, model, tokensUsed, cost);
    } catch (error) {
      // Log but don't fail the request
      console.error('Failed to track LLM cost:', error);
    }

    return {
      content,
      model,
      tokensUsed,
      cost,
      cached: false,
    };
  }

  private calculateCost(model: string, tokens: number): number {
    // Pricing per 1K tokens (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
    };

    const prices = pricing[model] || pricing['gpt-3.5-turbo'];
    // Approximate: assume 50/50 input/output split
    return (tokens / 1000) * ((prices.input + prices.output) / 2);
  }

  private async trackCost(
    organizationId: string,
    model: string,
    tokens: number,
    cost: number
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.costTracking.upsert({
      where: {
        organizationId_date_service_provider: {
          organizationId,
          date: today,
          service: 'llm',
          provider: 'openai',
        },
      },
      update: {
        amount: { increment: cost },
        units: { increment: tokens },
        metadata: { model },
      },
      create: {
        organizationId,
        date: today,
        service: 'llm',
        provider: 'openai',
        amount: cost,
        units: tokens,
        metadata: { model },
      },
    });
  }
}

// Anthropic Provider
class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  private apiKey: string | null = null;
  private baseUrl = 'https://api.anthropic.com/v1';

  private getApiKey(): string {
    if (!this.apiKey) {
      this.apiKey = process.env.ANTHROPIC_API_KEY || '';
      if (!this.apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required');
      }
    }
    return this.apiKey;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const apiKey = this.getApiKey();
    const model = request.model || 'claude-3-opus-20240229';
    const url = `${this.baseUrl}/messages`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: request.prompt }],
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 2000,
        }),
        signal: AbortSignal.timeout(60000), // 60 second timeout for LLM
      });
    } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new Error('Anthropic API request timed out');
      }
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error(`Anthropic API network error: ${error.message}`);
      }
      throw error;
    }

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.message || `${response.status} ${response.statusText}`;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(`Anthropic API error: ${errorMessage}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error('Failed to parse Anthropic API response as JSON');
    }

    const content = data.content[0]?.text || '';
    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    if (!content) {
      throw new Error('Anthropic API returned empty response');
    }

    // Calculate cost
    const cost = this.calculateCost(model, tokensUsed);

    // Track cost (don't fail on cost tracking errors)
    try {
      await this.trackCost(request.organizationId, model, tokensUsed, cost);
    } catch (error) {
      // Log but don't fail the request
      console.error('Failed to track LLM cost:', error);
    }

    return {
      content,
      model,
      tokensUsed,
      cost,
      cached: false,
    };
  }

  private calculateCost(model: string, tokens: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
    };

    const prices = pricing[model] || pricing['claude-3-sonnet-20240229'];
    return (tokens / 1000) * ((prices.input + prices.output) / 2);
  }

  private async trackCost(
    organizationId: string,
    model: string,
    tokens: number,
    cost: number
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.costTracking.upsert({
      where: {
        organizationId_date_service_provider: {
          organizationId,
          date: today,
          service: 'llm',
          provider: 'anthropic',
        },
      },
      update: {
        amount: { increment: cost },
        units: { increment: tokens },
        metadata: { model },
      },
      create: {
        organizationId,
        date: today,
        service: 'llm',
        provider: 'anthropic',
        amount: cost,
        units: tokens,
        metadata: { model },
      },
    });
  }
}

// LLM Service with caching
export class LLMService {
  private providers: Map<string, LLMProvider> = new Map();
  private defaultProvider: string;

  constructor() {
    this.defaultProvider = process.env.DEFAULT_LLM_PROVIDER || 'openai';
    // Providers initialized lazily in initializeProviders()
  }

  private initializeProviders(): void {
    if (this.providers.size > 0) {
      return; // Already initialized
    }

    // Initialize providers
    if (process.env.OPENAI_API_KEY) {
      this.providers.set('openai', new OpenAIProvider());
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.set('anthropic', new AnthropicProvider());
    }

    // During build time, skip validation
    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                        process.env.NEXT_PHASE === 'phase-development-build' ||
                        typeof window === 'undefined' && !process.env.DATABASE_URL;

    if (!isBuildTime && this.providers.size === 0) {
      throw new Error('At least one LLM provider API key must be configured');
    }
  }

  /**
   * Complete a prompt with caching support
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    // Initialize providers lazily
    this.initializeProviders();

    // Check cache if enabled
    if (request.cache !== false) {
      const cached = await this.getCachedResponse(request);
      if (cached) {
        return cached;
      }
    }

    // Estimate tokens (rough estimate: ~4 chars per token)
    const estimatedTokens = Math.ceil((request.prompt.length / 4) + (request.maxTokens || 2000));

    // Check usage limits before making API call
    try {
      await usageEnforcementService.checkLLMRequest(
        request.organizationId,
        request.userId || null,
        estimatedTokens
      );
    } catch (error) {
      // Re-throw usage limit errors as-is (they have proper HTTP status codes)
      throw error;
    }

    // Get provider
    const providerName = request.model?.includes('claude') ? 'anthropic' : this.defaultProvider;
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not available`);
    }

    try {
      const response = await provider.complete(request);

      // Cache response if enabled
      if (request.cache !== false) {
        await this.cacheResponse(request, response);
      }

      return response;
    } catch (error) {
      // If primary provider fails, try fallback
      if (providerName !== this.defaultProvider && this.providers.has(this.defaultProvider)) {
        const fallbackProvider = this.providers.get(this.defaultProvider)!;
        return fallbackProvider.complete(request);
      }
      throw error;
    }
  }

  // Removed checkBudget - now handled by usageEnforcementService

  /**
   * Get cached response
   * TODO: Implement Redis caching
   */
  private async getCachedResponse(_request: LLMRequest): Promise<LLMResponse | null> {
    // Caching not yet implemented
    return null;
  }

  /**
   * Cache response
   * TODO: Implement Redis caching
   */
  private async cacheResponse(_request: LLMRequest, _response: LLMResponse): Promise<void> {
    // Caching not yet implemented
  }
}

// Export singleton instance
// LLM Service Singleton (lazy initialization)
let llmServiceInstance: LLMService | null = null;

function getLLMService(): LLMService {
  if (!llmServiceInstance) {
    llmServiceInstance = new LLMService();
  }
  return llmServiceInstance;
}

// Export getter that lazily initializes
export const llmService = new Proxy({} as LLMService, {
  get(_target, prop: keyof LLMService) {
    const service = getLLMService();
    return service[prop];
  },
});
