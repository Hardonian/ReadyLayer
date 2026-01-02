/**
 * Embeddings Providers
 * 
 * OpenAI embeddings provider and disabled fallback
 */

import { env } from '../../env';
import type { EmbeddingsProvider } from '../types';

/**
 * OpenAI Embeddings Provider
 */
export class OpenAIEmbeddingsProvider implements EmbeddingsProvider {
  private apiKey: string;
  private model: string;
  private dimensions: number;

  constructor() {
    this.apiKey = env.OPENAI_API_KEY || '';
    this.model = env.RAG_EMBED_MODEL || 'text-embedding-3-small';
    
    // Set dimensions based on model
    if (this.model.includes('3-large')) {
      this.dimensions = 3072;
    } else if (this.model.includes('3-small')) {
      this.dimensions = 1536;
    } else {
      // Default for text-embedding-ada-002
      this.dimensions = 1536;
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  getDimensions(): number {
    return this.dimensions;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    if (texts.length === 0) {
      return [];
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
      return data.data.map((item) => item.embedding);
    } catch (error) {
      throw new Error(
        `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Disabled Embeddings Provider
 * 
 * Returns empty embeddings, triggers lexical fallback
 */
export class DisabledEmbeddingsProvider implements EmbeddingsProvider {
  getDimensions(): number {
    return 1536; // Return standard dimension for compatibility
  }

  isAvailable(): boolean {
    return false;
  }

  async embed(_texts: string[]): Promise<number[][]> {
    // Return empty arrays - store will use lexical fallback
    return [];
  }
}

/**
 * Get embeddings provider based on configuration
 */
export function getEmbeddingsProvider(): EmbeddingsProvider {
  const provider = env.RAG_PROVIDER || 'disabled';
  
  if (provider === 'openai') {
    const openaiProvider = new OpenAIEmbeddingsProvider();
    if (openaiProvider.isAvailable()) {
      return openaiProvider;
    }
    // Fallback to disabled if key not available
    return new DisabledEmbeddingsProvider();
  }

  return new DisabledEmbeddingsProvider();
}
