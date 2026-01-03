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
  [key: string]: unknown;
}

class Logger {
  private logger: pino.Logger;

  constructor(loggerInstance?: pino.Logger) {
    if (loggerInstance) {
      this.logger = loggerInstance;
    } else {
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
  }

  /**
   * Log info message
   */
  info(messageOrContext: string | LogContext, contextOrMessage?: LogContext | string): void {
    if (typeof messageOrContext === 'string') {
      // Called as info(message, context?)
      this.logger.info(contextOrMessage as LogContext || {}, messageOrContext);
    } else {
      // Called as info(context, message) - pino style
      this.logger.info(messageOrContext, (contextOrMessage as string) || '');
    }
  }

  /**
   * Log warning message
   */
  warn(messageOrContext: string | LogContext, contextOrMessage?: LogContext | string): void {
    if (typeof messageOrContext === 'string') {
      this.logger.warn(contextOrMessage as LogContext || {}, messageOrContext);
    } else {
      this.logger.warn(messageOrContext, (contextOrMessage as string) || '');
    }
  }

  /**
   * Log error message
   */
  error(errorOrMessage: Error | unknown | string, messageOrContext?: string | LogContext, context?: LogContext): void {
    if (typeof errorOrMessage === 'string') {
      // Called as error(message, context?)
      const errorContext = {
        ...(messageOrContext as LogContext || {}),
        ...(context || {}),
      };
      this.logger.error(errorContext, errorOrMessage);
    } else {
      // Called as error(error, message) or error(error, context)
      const message = typeof messageOrContext === 'string' 
        ? messageOrContext 
        : (context as unknown as string) || '';
      const errorContext = {
        ...(typeof messageOrContext === 'object' ? messageOrContext : {}),
        ...(context || {}),
        error: errorOrMessage instanceof Error ? {
          message: errorOrMessage.message,
          stack: errorOrMessage.stack,
          name: errorOrMessage.name,
        } : errorOrMessage,
      };
      this.logger.error(errorContext, message);
    }
  }

  /**
   * Log debug message
   */
  debug(messageOrContext: string | LogContext, contextOrMessage?: LogContext | string): void {
    if (typeof messageOrContext === 'string') {
      this.logger.debug(contextOrMessage as LogContext || {}, messageOrContext);
    } else {
      this.logger.debug(messageOrContext, (contextOrMessage as string) || '');
    }
  }

  /**
   * Create child logger with context
   */
  child(context: LogContext): Logger {
    return new Logger(this.logger.child(context));
  }
}

export const logger = new Logger();
