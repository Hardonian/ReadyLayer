/**
 * Circuit Breaker Pattern Implementation
 *
 * P3-FIX: Prevents cascading failures in LLM provider calls
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests fail fast
 * - HALF_OPEN: Testing if service recovered
 *
 * Features:
 * - Configurable failure threshold
 * - Automatic recovery after timeout
 * - Per-provider circuit breakers
 * - Metrics tracking
 */

import { logger } from '../observability/logging';
import { metrics } from '../observability/metrics';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes to close from half-open
  timeout: number; // Time (ms) before attempting half-open
  name: string; // Circuit breaker name for logging/metrics
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  nextAttemptTime: Date | null;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private nextAttemptTime: Date | null = null;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      // Check if timeout has elapsed
      if (this.nextAttemptTime && new Date() >= this.nextAttemptTime) {
        logger.info(
          { circuit: this.config.name },
          'Circuit breaker transitioning to HALF_OPEN'
        );
        this.state = CircuitState.HALF_OPEN;
        this.consecutiveSuccesses = 0;
        metrics.increment(`circuit_breaker.${this.config.name}.half_open`);
      } else {
        // Circuit still open, fail fast
        logger.warn(
          {
            circuit: this.config.name,
            nextAttempt: this.nextAttemptTime,
          },
          'Circuit breaker is OPEN, failing fast'
        );
        metrics.increment(`circuit_breaker.${this.config.name}.rejected`);
        throw new Error(
          `Circuit breaker is OPEN for ${this.config.name}. ` +
            `Service unavailable. Next attempt at ${this.nextAttemptTime?.toISOString()}`
        );
      }
    }

    try {
      // Execute the function
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.successes++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = new Date();

    metrics.increment(`circuit_breaker.${this.config.name}.success`);

    if (this.state === CircuitState.HALF_OPEN) {
      // Check if we can close the circuit
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        logger.info(
          {
            circuit: this.config.name,
            consecutiveSuccesses: this.consecutiveSuccesses,
          },
          'Circuit breaker closing after successful recovery'
        );
        this.state = CircuitState.CLOSED;
        this.consecutiveFailures = 0;
        this.nextAttemptTime = null;
        metrics.increment(`circuit_breaker.${this.config.name}.closed`);
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failures++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = new Date();

    metrics.increment(`circuit_breaker.${this.config.name}.failure`);

    // If in half-open state, immediately open on failure
    if (this.state === CircuitState.HALF_OPEN) {
      logger.warn(
        { circuit: this.config.name },
        'Circuit breaker opening after failure in HALF_OPEN state'
      );
      this.openCircuit();
      return;
    }

    // Check if we should open the circuit
    if (
      this.state === CircuitState.CLOSED &&
      this.consecutiveFailures >= this.config.failureThreshold
    ) {
      logger.error(
        {
          circuit: this.config.name,
          consecutiveFailures: this.consecutiveFailures,
          threshold: this.config.failureThreshold,
        },
        'Circuit breaker opening due to consecutive failures'
      );
      this.openCircuit();
    }
  }

  /**
   * Open the circuit
   */
  private openCircuit(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
    metrics.increment(`circuit_breaker.${this.config.name}.opened`);
  }

  /**
   * Get current circuit breaker state
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    logger.info({ circuit: this.config.name }, 'Circuit breaker manually reset');
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.nextAttemptTime = null;
    metrics.increment(`circuit_breaker.${this.config.name}.reset`);
  }
}

/**
 * Circuit breaker instances for LLM providers
 */
export const llmCircuitBreakers = {
  openai: new CircuitBreaker({
    name: 'llm.openai',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 60 seconds
  }),
  anthropic: new CircuitBreaker({
    name: 'llm.anthropic',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
  }),
  openrouter: new CircuitBreaker({
    name: 'llm.openrouter',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
  }),
};

/**
 * Get circuit breaker for a provider
 */
export function getCircuitBreaker(provider: string): CircuitBreaker {
  const breaker = llmCircuitBreakers[provider as keyof typeof llmCircuitBreakers];
  if (!breaker) {
    throw new Error(`No circuit breaker configured for provider: ${provider}`);
  }
  return breaker;
}
