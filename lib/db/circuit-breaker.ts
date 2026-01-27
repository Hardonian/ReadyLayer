/**
 * Database Circuit Breaker
 *
 * Prevents cascading failures when database is degraded or overloaded.
 * Based on OpenAI playbook: fail fast instead of piling up requests.
 *
 * Pattern:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: DB is failing, reject requests immediately with 503
 * - HALF_OPEN: Testing if DB recovered, allow limited requests
 */

import { logger } from '../../observability/logging'
import { metrics } from '../../observability/metrics'

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject immediately
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

/**
 * Circuit breaker error
 */
export class CircuitBreakerOpenError extends Error {
  httpStatus = 503

  constructor(message: string = 'Service temporarily unavailable - database circuit breaker open') {
    super(message)
    this.name = 'CircuitBreakerOpenError'
  }
}

/**
 * Configuration
 */
export interface CircuitBreakerConfig {
  // Failure threshold
  failureThreshold: number // Open circuit after N failures (default: 5)
  failureRateThreshold: number // Open after X% failures (default: 50%)
  minimumRequests: number // Minimum requests before calculating failure rate (default: 10)

  // Timing
  resetTimeout: number // Time in OPEN state before trying HALF_OPEN (default: 30s)
  successThreshold: number // Successes in HALF_OPEN to close circuit (default: 2)
  monitoringWindow: number // Rolling window for failure rate calc (default: 60s)

  // Request limits in HALF_OPEN
  halfOpenMaxRequests: number // Max concurrent requests in HALF_OPEN (default: 3)
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  failureRateThreshold: 50, // 50%
  minimumRequests: 10,
  resetTimeout: 30000, // 30s
  successThreshold: 2,
  monitoringWindow: 60000, // 60s
  halfOpenMaxRequests: 3,
}

/**
 * Request result for tracking
 */
interface RequestResult {
  success: boolean
  timestamp: number
}

/**
 * Circuit Breaker Implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount = 0
  private successCount = 0
  private nextAttemptTime = 0
  private halfOpenRequests = 0

  // Rolling window of requests
  private requests: RequestResult[] = []

  private readonly config: CircuitBreakerConfig

  constructor(
    private readonly name: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    logger.info({
      circuitBreaker: this.name,
      config: this.config,
    }, 'Circuit breaker initialized')
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      // Check if reset timeout elapsed
      if (Date.now() >= this.nextAttemptTime) {
        this.transitionTo(CircuitState.HALF_OPEN)
      } else {
        // Circuit still open, reject immediately
        metrics.increment('circuit_breaker.rejected', {
          name: this.name,
          state: this.state,
        })
        throw new CircuitBreakerOpenError()
      }
    }

    // HALF_OPEN: Limit concurrent requests
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenRequests >= this.config.halfOpenMaxRequests) {
        metrics.increment('circuit_breaker.rejected', {
          name: this.name,
          state: this.state,
        })
        throw new CircuitBreakerOpenError('Circuit breaker in half-open state - max requests reached')
      }
      this.halfOpenRequests++
    }

    // Execute request
    try {
      const result = await fn()

      // Record success
      this.recordSuccess()

      return result
    } catch (error) {
      // Record failure
      this.recordFailure()

      throw error
    } finally {
      if (this.state === CircuitState.HALF_OPEN) {
        this.halfOpenRequests--
      }

      // Clean old requests from window
      this.cleanRequestWindow()
    }
  }

  /**
   * Record successful request
   */
  private recordSuccess(): void {
    this.requests.push({ success: true, timestamp: Date.now() })

    metrics.increment('circuit_breaker.success', { name: this.name })

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++

      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED)
      }
    }
  }

  /**
   * Record failed request
   */
  private recordFailure(): void {
    this.requests.push({ success: false, timestamp: Date.now() })
    this.failureCount++

    metrics.increment('circuit_breaker.failure', { name: this.name })

    if (this.state === CircuitState.HALF_OPEN) {
      // Failure in HALF_OPEN -> back to OPEN
      this.transitionTo(CircuitState.OPEN)
      return
    }

    if (this.state === CircuitState.CLOSED) {
      // Check if should open circuit
      const shouldOpen = this.shouldOpenCircuit()
      if (shouldOpen) {
        this.transitionTo(CircuitState.OPEN)
      }
    }
  }

  /**
   * Determine if circuit should open
   */
  private shouldOpenCircuit(): boolean {
    const now = Date.now()
    const recentRequests = this.requests.filter(
      (r) => now - r.timestamp <= this.config.monitoringWindow
    )

    if (recentRequests.length < this.config.minimumRequests) {
      // Not enough data to calculate failure rate
      return this.failureCount >= this.config.failureThreshold
    }

    const failures = recentRequests.filter((r) => !r.success).length
    const failureRate = (failures / recentRequests.length) * 100

    logger.debug({
      circuitBreaker: this.name,
      failureRate,
      threshold: this.config.failureRateThreshold,
      recentRequests: recentRequests.length,
      failures,
    }, 'Circuit breaker failure rate check')

    return failureRate >= this.config.failureRateThreshold
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state
    this.state = newState

    logger.warn({
      circuitBreaker: this.name,
      oldState,
      newState,
      failureCount: this.failureCount,
      successCount: this.successCount,
    }, 'Circuit breaker state transition')

    metrics.increment('circuit_breaker.state_change', {
      name: this.name,
      from: oldState,
      to: newState,
    })

    // State-specific actions
    if (newState === CircuitState.OPEN) {
      this.nextAttemptTime = Date.now() + this.config.resetTimeout
    } else if (newState === CircuitState.CLOSED) {
      this.failureCount = 0
      this.successCount = 0
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successCount = 0
      this.halfOpenRequests = 0
    }
  }

  /**
   * Clean old requests from monitoring window
   */
  private cleanRequestWindow(): void {
    const now = Date.now()
    this.requests = this.requests.filter(
      (r) => now - r.timestamp <= this.config.monitoringWindow
    )
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    state: CircuitState
    failureCount: number
    successCount: number
    requestsInWindow: number
    failureRate: number
  } {
    const now = Date.now()
    const recentRequests = this.requests.filter(
      (r) => now - r.timestamp <= this.config.monitoringWindow
    )
    const failures = recentRequests.filter((r) => !r.success).length
    const failureRate = recentRequests.length > 0
      ? (failures / recentRequests.length) * 100
      : 0

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestsInWindow: recentRequests.length,
      failureRate,
    }
  }

  /**
   * Manually reset circuit (for testing/ops)
   */
  reset(): void {
    logger.info({ circuitBreaker: this.name }, 'Circuit breaker manually reset')
    this.transitionTo(CircuitState.CLOSED)
    this.requests = []
  }
}

/**
 * Global database circuit breaker instance
 */
export const dbCircuitBreaker = new CircuitBreaker('database', {
  failureThreshold: 5,
  failureRateThreshold: 50,
  resetTimeout: 30000, // 30s
  successThreshold: 3,
})

/**
 * Wrapper for Prisma queries with circuit breaker
 */
export async function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  circuitBreaker: CircuitBreaker = dbCircuitBreaker
): Promise<T> {
  return circuitBreaker.execute(fn)
}
