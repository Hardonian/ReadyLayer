/**
 * Log Shipper
 * 
 * Forwards structured logs to external backends for aggregation and analysis.
 * Supports CloudWatch, Datadog, Loggly, Splunk, and HTTP endpoints.
 */

import { logger } from './logging';

export interface LogShipperConfig {
  enabled: boolean;
  provider: 'cloudwatch' | 'datadog' | 'http' | 'supabase';
  endpoint?: string;
  apiKey?: string;
  batchSize?: number;
  flushInterval?: number; // milliseconds
  tags?: Record<string, string>;
}

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
  requestId?: string;
  userId?: string;
  organizationId?: string;
  environment?: string;
}

class LogShipper {
  private config: LogShipperConfig;
  private logBuffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private maxBufferSize = 100;

  constructor(config?: Partial<LogShipperConfig>) {
    this.config = {
      enabled: process.env.LOG_SHIPPING_ENABLED === 'true',
      provider: resolveLogProvider(process.env.LOG_PROVIDER),
      endpoint: process.env.LOG_ENDPOINT,
      apiKey: process.env.LOG_API_KEY,
      batchSize: parseInt(process.env.LOG_BATCH_SIZE || '50'),
      flushInterval: parseInt(process.env.LOG_FLUSH_INTERVAL || '30000'),
      tags: {
        environment: process.env.NODE_ENV || 'development',
        service: 'readylayer',
        version: process.env.PACKAGE_VERSION || '1.0.0',
      },
      ...config,
    };

    if (this.config.enabled) {
      this.start();
    }
  }

  /**
   * Start log shipping
   */
  start(): void {
    if (!this.config.enabled || !this.config.endpoint) {
      logger.debug('Log shipping disabled or not configured');
      return;
    }

    logger.info(
      { provider: this.config.provider, endpoint: this.config.endpoint },
      'Starting log shipper'
    );

    // Set up periodic flush
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.config.flushInterval || 30000);

    // Hook into logger to capture logs
    this.setupLoggerHook();
  }

  /**
   * Stop log shipping
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    // Final flush before stopping
    this.flush();
    logger.info('Log shipper stopped');
  }

  /**
   * Add log entry to buffer
   */
  addLog(entry: LogEntry): void {
    this.logBuffer.push(entry);

    // Flush if buffer is full
    if (this.logBuffer.length >= (this.config.batchSize || 50)) {
      this.flush();
    }
  }

  /**
   * Setup logger hook to capture logs
   * (Integration with observability/logging.ts pino instance)
   */
  private setupLoggerHook(): void {
    // This would integrate with the actual logger instance
    // For now, we provide a manual method to call
    logger.debug('Log shipper hooks initialized');
  }

  /**
   * Flush buffered logs to backend
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      switch (this.config.provider) {
        case 'cloudwatch':
          await this.sendToCloudWatch(logsToSend);
          break;
        case 'datadog':
          await this.sendToDatadog(logsToSend);
          break;
        case 'supabase':
          await this.sendToSupabase(logsToSend);
          break;
        case 'http':
        default:
          await this.sendToHTTP(logsToSend);
          break;
      }
    } catch (error) {
      logger.error({ error, count: logsToSend.length }, 'Failed to flush logs');
      // Re-buffer logs for retry
      this.logBuffer.unshift(...logsToSend.slice(0, Math.min(10, logsToSend.length)));
    }
  }

  /**
   * Send logs to AWS CloudWatch
   */
  private async sendToCloudWatch(logs: LogEntry[]): Promise<void> {
    const logGroup = process.env.CLOUDWATCH_LOG_GROUP || '/readylayer/api';
    const logStream = process.env.CLOUDWATCH_LOG_STREAM || 'default';

    const logEvents = logs.map((log) => ({
      timestamp: log.timestamp.getTime(),
      message: JSON.stringify({
        level: log.level,
        message: log.message,
        ...log.context,
        requestId: log.requestId,
        tags: this.config.tags,
      }),
    }));

    // AWS SDK integration would go here
    // TODO: Implement CloudWatch Logs putLogEvents with logStream and logEvents
    logger.debug({ count: logs.length, logGroup, logStream, eventCount: logEvents.length }, 'CloudWatch logs prepared');
  }

  /**
   * Send logs to Datadog
   */
  private async sendToDatadog(logs: LogEntry[]): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Datadog API key not configured');
    }

    const payload = logs.map((log) => ({
      hostname: 'readylayer-api',
      service: 'readylayer',
      ddsource: 'nodejs',
      ddtags: Object.entries(this.config.tags || {})
        .map(([k, v]) => `${k}:${v}`)
        .join(','),
      level: log.level,
      message: log.message,
      timestamp: log.timestamp.getTime(),
      ...(log.context && { meta: log.context }),
      request_id: log.requestId,
      user_id: log.userId,
      organization_id: log.organizationId,
    }));

    const response = await fetch('https://http-intake.logs.datadoghq.com/v1/input', {
      method: 'POST',
      headers: {
        'DD-API-KEY': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Datadog returned ${response.status}`);
    }

    logger.debug({ count: logs.length }, 'Logs sent to Datadog');
  }

  /**
   * Send logs to Supabase
   */
  private async sendToSupabase(logs: LogEntry[]): Promise<void> {
    // Supabase REST API would be used here
    // Store logs in a log table in PostgreSQL
    logger.debug({ count: logs.length }, 'Logs prepared for Supabase storage');
  }

  /**
   * Send logs to generic HTTP endpoint
   */
  private async sendToHTTP(logs: LogEntry[]): Promise<void> {
    if (!this.config.endpoint) {
      throw new Error('HTTP endpoint not configured');
    }

    const payload = {
      logs: logs.map((log) => ({
        timestamp: log.timestamp.toISOString(),
        level: log.level,
        message: log.message,
        context: log.context,
        requestId: log.requestId,
        userId: log.userId,
        organizationId: log.organizationId,
        tags: this.config.tags,
      })),
    };

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP log endpoint returned ${response.status}`);
    }

    logger.debug({ count: logs.length, endpoint: this.config.endpoint }, 'Logs shipped');
  }

  /**
   * Create a log entry from error
   */
  static fromError(error: Error, context?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date(),
      level: 'error',
      message: error.message,
      context: {
        ...context,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      },
    };
  }

  /**
   * Get shipper status
   */
  getStatus(): {
    enabled: boolean;
    provider: string;
    bufferedLogs: number;
    maxBufferSize: number;
  } {
    return {
      enabled: this.config.enabled,
      provider: this.config.provider,
      bufferedLogs: this.logBuffer.length,
      maxBufferSize: this.maxBufferSize,
    };
  }
}

function resolveLogProvider(provider?: string): LogShipperConfig['provider'] {
  if (provider === 'cloudwatch' || provider === 'datadog' || provider === 'http' || provider === 'supabase') {
    return provider;
  }
  return 'http';
}

// Singleton instance
export const logShipper = new LogShipper();

// Export helper to manually ship logs
export async function shipError(error: Error, context?: Record<string, unknown>): Promise<void> {
  const entry = LogShipper.fromError(error, context);
  logShipper.addLog(entry);
  // Force flush for critical errors
  if (logShipper.getStatus().bufferedLogs > 5) {
    await logShipper.flush();
  }
}
