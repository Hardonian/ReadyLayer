/**
 * Async Handler Support for I/O-Bound Operations
 *
 * P2: Efficient async handling for database queries, API calls, file I/O
 * Provides worker pool management, concurrency control, and backpressure
 * handling for optimal I/O-bound performance.
 *
 * Features:
 * - Worker pool with dynamic sizing
 * - Task queue with priority support
 * - Concurrency limiting and backpressure
 * - Circuit breaker integration
 * - Graceful degradation and retries
 */

import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';
import { CircuitBreaker } from '@/lib/circuit-breaker';

export interface AsyncTask<T, R> {
  id: string;
  priority: number; // 0-10, higher = more important
  data: T;
  execute: (data: T) => Promise<R>;
  retries: number;
  timeout: number;
  createdAt: Date;
}

export interface AsyncHandlerConfig {
  minWorkers?: number;
  maxWorkers?: number;
  queueSize?: number;
  taskTimeout?: number;
  retryAttempts?: number;
  enableCircuitBreaker?: boolean;
  backpressureThreshold?: number; // Queue fill percentage
}

export interface TaskResult<R> {
  taskId: string;
  success: boolean;
  result?: R;
  error?: Error;
  durationMs: number;
  attempts: number;
}

export class AsyncHandler<T, R> {
  private config: Required<AsyncHandlerConfig>;
  private workers: Array<{
    id: number;
    busy: boolean;
    currentTask?: AsyncTask<T, R>;
  }> = [];
  private taskQueue: AsyncTask<T, R>[] = [];
  private results: Map<string, TaskResult<R>> = new Map();
  private circuitBreaker?: CircuitBreaker;
  private isRunning: boolean = false;
  private stats = {
    tasksSubmitted: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    tasksRetried: 0,
    avgDuration: 0,
  };

  constructor(config: AsyncHandlerConfig = {}) {
    this.config = {
      minWorkers: config.minWorkers || 2,
      maxWorkers: config.maxWorkers || 10,
      queueSize: config.queueSize || 1000,
      taskTimeout: config.taskTimeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      enableCircuitBreaker: config.enableCircuitBreaker ?? true,
      backpressureThreshold: config.backpressureThreshold || 0.8,
    };

    if (this.config.enableCircuitBreaker) {
      this.circuitBreaker = new CircuitBreaker({
        name: 'async-handler',
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 30000,
      });
    }

    this.initializeWorkers();
  }

  /**
   * Start the async handler
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startWorkerLoop();

    logger.info({
      minWorkers: this.config.minWorkers,
      maxWorkers: this.config.maxWorkers,
      queueSize: this.config.queueSize,
    }, 'Async handler started');
  }

  /**
   * Submit a task for async processing
   */
  async submit(task: Omit<AsyncTask<T, R>, 'retries' | 'timeout' | 'createdAt'>): Promise<string> {
    const fullTask: AsyncTask<T, R> = {
      ...task,
      retries: 0,
      timeout: this.config.taskTimeout,
      createdAt: new Date(),
    };

    // Check backpressure
    const queueFillRatio = this.taskQueue.length / this.config.queueSize;
    if (queueFillRatio > this.config.backpressureThreshold) {
      metrics.increment('async_handler_backpressure');

      // If queue is full, reject or apply backpressure
      if (this.taskQueue.length >= this.config.queueSize) {
        throw new Error('Task queue is full - apply backpressure');
      }
    }

    // Add to queue with priority sorting
    this.taskQueue.push(fullTask);
    this.taskQueue.sort((a, b) => b.priority - a.priority);

    this.stats.tasksSubmitted++;
    metrics.increment('async_handler_task_submitted');

    logger.debug({ taskId: fullTask.id, priority: fullTask.priority }, 'Task submitted');

    return fullTask.id;
  }

  /**
   * Submit multiple tasks in batch
   */
  async submitBatch(tasks: Array<Omit<AsyncTask<T, R>, 'retries' | 'timeout' | 'createdAt'>>): Promise<string[]> {
    const taskIds: string[] = [];

    for (const task of tasks) {
      try {
        const id = await this.submit(task);
        taskIds.push(id);
      } catch (error) {
        logger.warn({ error, taskId: task.id }, 'Failed to submit task in batch');
      }
    }

    return taskIds;
  }

  /**
   * Wait for a specific task to complete
   */
  async waitForResult(taskId: string, timeout?: number): Promise<TaskResult<R>> {
    const waitTimeout = timeout || 60000;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkResult = (): void => {
        const result = this.results.get(taskId);

        if (result) {
          this.results.delete(taskId);
          resolve(result);
          return;
        }

        if (Date.now() - startTime > waitTimeout) {
          reject(new Error(`Timeout waiting for task ${taskId}`));
          return;
        }

        setTimeout(checkResult, 100);
      };

      checkResult();
    });
  }

  /**
   * Wait for multiple tasks to complete
   */
  async waitForBatch(taskIds: string[], timeout?: number): Promise<Map<string, TaskResult<R>>> {
    const results = new Map<string, TaskResult<R>>();

    await Promise.all(
      taskIds.map(async (taskId) => {
        try {
          const result = await this.waitForResult(taskId, timeout);
          results.set(taskId, result);
        } catch (error) {
          results.set(taskId, {
            taskId,
            success: false,
            error: error as Error,
            durationMs: 0,
            attempts: 0,
          });
        }
      })
    );

    return results;
  }

  /**
   * Get current handler statistics
   */
  getStats(): {
    workers: {
      total: number;
      busy: number;
      idle: number;
    };
    queue: {
      size: number;
      fillRatio: number;
    };
    tasks: {
      submitted: number;
      completed: number;
      failed: number;
      retried: number;
      avgDuration: number;
    };
    circuitBreaker?: {
      state: string;
      failures: number;
    };
  } {
    const busyWorkers = this.workers.filter(w => w.busy).length;

    return {
      workers: {
        total: this.workers.length,
        busy: busyWorkers,
        idle: this.workers.length - busyWorkers,
      },
      queue: {
        size: this.taskQueue.length,
        fillRatio: this.taskQueue.length / this.config.queueSize,
      },
      tasks: {
        submitted: this.stats.tasksSubmitted,
        completed: this.stats.tasksCompleted,
        failed: this.stats.tasksFailed,
        retried: this.stats.tasksRetried,
        avgDuration: this.stats.avgDuration,
      },
      circuitBreaker: this.circuitBreaker?.getStats(),
    };
  }

  /**
   * Gracefully shutdown the handler
   */
  async shutdown(timeout: number = 30000): Promise<void> {
    this.isRunning = false;

    logger.info({
      pendingTasks: this.taskQueue.length,
      activeWorkers: this.workers.filter(w => w.busy).length,
    }, 'Async handler shutting down');

    // Wait for active tasks to complete
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const activeWorkers = this.workers.filter(w => w.busy).length;
      if (activeWorkers === 0 && this.taskQueue.length === 0) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info('Async handler shutdown complete');
  }

  /**
   * Pause processing (for maintenance/backpressure)
   */
  pause(): void {
    this.isRunning = false;
    logger.info('Async handler paused');
  }

  /**
   * Resume processing
   */
  resume(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.startWorkerLoop();
      logger.info('Async handler resumed');
    }
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.config.minWorkers; i++) {
      this.workers.push({
        id: i,
        busy: false,
      });
    }
  }

  private startWorkerLoop(): void {
    // Start worker processing loops
    for (const worker of this.workers) {
      this.runWorker(worker);
    }

    // Dynamic worker scaling
    setInterval(() => {
      this.scaleWorkers();
    }, 5000);
  }

  private async runWorker(worker: typeof this.workers[0]): Promise<void> {
    while (this.isRunning) {
      if (this.taskQueue.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      // Check circuit breaker - if it's open, wait
      if (this.circuitBreaker && this.circuitBreaker.isOpen()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      // Get next task
      const task = this.taskQueue.shift();
      if (!task) continue;

      worker.busy = true;
      worker.currentTask = task;

      const startTime = Date.now();
      let attempts = 0;
      let success = false;
      let result: R | undefined;
      let error: Error | undefined;

      try {
        // Execute with circuit breaker
        if (this.circuitBreaker) {
          result = await this.circuitBreaker.execute(() =>
            this.executeWithTimeout(task)
          );
        } else {
          result = await this.executeWithTimeout(task);
        }

        success = true;
        this.stats.tasksCompleted++;
        metrics.increment('async_handler_task_completed');
      } catch (err) {
        error = err as Error;
        attempts++;

        // Retry logic
        if (task.retries < this.config.retryAttempts) {
          task.retries++;
          this.stats.tasksRetried++;
          metrics.increment('async_handler_task_retry');

          // Re-queue with exponential backoff
          setTimeout(() => {
            this.taskQueue.push(task);
            this.taskQueue.sort((a, b) => b.priority - a.priority);
          }, Math.pow(2, task.retries) * 1000);
        } else {
          this.stats.tasksFailed++;
          metrics.increment('async_handler_task_failed');
          logger.warn({ taskId: task.id, error: error.message }, 'Task failed after retries');
        }
      }

      const duration = Date.now() - startTime;

      // Update average duration
      this.stats.avgDuration =
        (this.stats.avgDuration * (this.stats.tasksCompleted - 1) + duration) /
        this.stats.tasksCompleted || duration;

      // Store result if final attempt
      if (success || task.retries >= this.config.retryAttempts) {
        this.results.set(task.id, {
          taskId: task.id,
          success,
          result,
          error,
          durationMs: duration,
          attempts,
        });
      }

      worker.busy = false;
      worker.currentTask = undefined;

      metrics.recordHistogram('async_handler_task_duration', duration);
    }
  }

  private async executeWithTimeout(task: AsyncTask<T, R>): Promise<R> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Task ${task.id} timed out after ${task.timeout}ms`));
      }, task.timeout);

      task.execute(task.data)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private scaleWorkers(): void {
    const queueSize = this.taskQueue.length;
    const totalWorkers = this.workers.length;

    // Scale up if queue is growing and we have capacity
    if (queueSize > totalWorkers * 2 && totalWorkers < this.config.maxWorkers) {
      const newWorkerId = totalWorkers;
      const newWorker = { id: newWorkerId, busy: false };
      this.workers.push(newWorker);
      this.runWorker(newWorker);

      logger.debug({ workerId: newWorkerId }, 'Scaled up worker');
      metrics.increment('async_handler_worker_scaled_up');
    }

    // Scale down if idle workers and low queue
    if (queueSize < totalWorkers && totalWorkers > this.config.minWorkers) {
      const idleWorkerIndex = this.workers.findIndex(w => !w.busy);
      if (idleWorkerIndex > this.config.minWorkers - 1) {
        this.workers.splice(idleWorkerIndex, 1);

        logger.debug({ workerIndex: idleWorkerIndex }, 'Scaled down worker');
        metrics.increment('async_handler_worker_scaled_down');
      }
    }
  }
}

/**
 * Specialized async handlers for common I/O operations
 */
export class DatabaseAsyncHandler extends AsyncHandler<
  { query: string; params?: unknown[] },
  unknown
> {
  constructor(config?: AsyncHandlerConfig) {
    super({
      ...config,
      taskTimeout: config?.taskTimeout || 10000,
      retryAttempts: config?.retryAttempts || 3,
    });
  }
}

export class APIAsyncHandler extends AsyncHandler<
  { url: string; method: string; body?: unknown; headers?: Record<string, string> },
  unknown
> {
  constructor(config?: AsyncHandlerConfig) {
    super({
      ...config,
      taskTimeout: config?.taskTimeout || 30000,
      retryAttempts: config?.retryAttempts || 2,
    });
  }
}

export class FileIOAsyncHandler extends AsyncHandler<
  { path: string; operation: 'read' | 'write' | 'delete'; data?: Buffer },
  Buffer | void
> {
  constructor(config?: AsyncHandlerConfig) {
    super({
      ...config,
      taskTimeout: config?.taskTimeout || 60000,
      retryAttempts: config?.retryAttempts || 2,
    });
  }
}

export default { AsyncHandler, DatabaseAsyncHandler, APIAsyncHandler, FileIOAsyncHandler };
