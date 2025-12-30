/**
 * Structured Logging
 * 
 * JSON-formatted logs with request IDs and context
 */

import pino from 'pino';

export interface LogContext {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  repositoryId?: string;
  [key: string]: any;
}

class Logger {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        level: (label) => {
          return { level: label.toUpperCase() };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.logger.info(context || {}, message);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.logger.warn(context || {}, message);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    };
    this.logger.error(errorContext, message);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.logger.debug(context || {}, message);
  }

  /**
   * Create child logger with context
   */
  child(context: LogContext): pino.Logger {
    return this.logger.child(context);
  }
}

export const logger = new Logger();
