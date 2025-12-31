/**
 * Edge-Safe Logging
 * 
 * Minimal logging for Edge runtime (middleware)
 * Uses console only - no Node.js dependencies
 */

/* eslint-disable no-console */

export interface EdgeLogContext {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  repositoryId?: string;
  path?: string;
  method?: string;
  [key: string]: unknown;
}

class EdgeLogger {
  private level: string;

  constructor() {
    this.level = (typeof process !== 'undefined' && process.env?.LOG_LEVEL) || 'info';
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level.toLowerCase());
    const messageLevelIndex = levels.indexOf(level.toLowerCase());
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: string, message: string, context?: EdgeLogContext): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      level: level.toUpperCase(),
      timestamp,
      message,
      ...context,
    };
    return JSON.stringify(logEntry);
  }

  info(message: string, context?: EdgeLogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: EdgeLogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(error: unknown, message: string, context?: EdgeLogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : String(error),
      };
      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  debug(message: string, context?: EdgeLogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  child(_context: EdgeLogContext): EdgeLogger {
    const childLogger = new EdgeLogger();
    // Merge parent context if needed (simplified for edge)
    return childLogger;
  }
}

export const edgeLogger = new EdgeLogger();
