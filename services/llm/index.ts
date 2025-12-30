/**
 * LLM Service
 * 
 * Centralized LLM interaction and prompt management
 * Supports OpenAI and Anthropic APIs with caching and cost tracking
 */

import { prisma } from '../../lib/prisma';
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
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || 'gpt-4-turbo-preview';
    const url = `${this.baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: request.prompt }],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    const tokensUsed = data.usage?.total_tokens || 0;

    // Calculate cost (approximate, varies by model)
    const cost = this.calculateCost(model, tokensUsed);

    // Track cost
    await this.trackCost(request.organizationId, model, tokensUsed, cost);

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
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || 'claude-3-opus-20240229';
    const url = `${this.baseUrl}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: request.prompt }],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text || '';
    const tokensUsed = data.usage?.input_tokens + data.usage?.output_tokens || 0;

    // Calculate cost
    const cost = this.calculateCost(model, tokensUsed);

    // Track cost
    await this.trackCost(request.organizationId, model, tokensUsed, cost);

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
    // Initialize providers
    if (process.env.OPENAI_API_KEY) {
      this.providers.set('openai', new OpenAIProvider());
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.set('anthropic', new AnthropicProvider());
    }

    this.defaultProvider = process.env.DEFAULT_LLM_PROVIDER || 'openai';

    if (this.providers.size === 0) {
      throw new Error('At least one LLM provider API key must be configured');
    }
  }

  /**
   * Complete a prompt with caching support
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    // Check cache if enabled
    if (request.cache !== false) {
      const cached = await this.getCachedResponse(request);
      if (cached) {
        return cached;
      }
    }

    // Check budget limits
    await this.checkBudget(request.organizationId);

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

  /**
   * Check budget limits for organization
   */
  private async checkBudget(organizationId: string): Promise<void> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { subscriptions: true },
    });

    if (!org) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    const subscription = org.subscriptions[0];
    if (!subscription || subscription.status !== 'active') {
      throw new Error(`Organization ${organizationId} has no active subscription`);
    }

    // Budget limits by plan (monthly)
    const budgets: Record<string, number> = {
      starter: 50, // $50/month
      growth: 500, // $500/month
      scale: 5000, // $5000/month
    };

    const budget = budgets[subscription.plan] || budgets.starter;

    // Check current month spend
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthSpend = await prisma.costTracking.aggregate({
      where: {
        organizationId,
        date: { gte: startOfMonth },
        service: 'llm',
      },
      _sum: {
        amount: true,
      },
    });

    const totalSpend = Number(monthSpend._sum.amount || 0);
    if (totalSpend >= budget) {
      throw new Error(
        `Budget limit exceeded: $${totalSpend.toFixed(2)} / $${budget} for ${subscription.plan} plan`
      );
    }
  }

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
export const llmService = new LLMService();
