import pino from 'pino'

/**
 * Structured logger for the application
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }),
})

/**
 * Log levels
 */
export const logLevels = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
} as const

/**
 * Create a child logger with context
 */
import type { Logger } from 'pino';

export function createLogger(context: Record<string, unknown>): Logger {
  return logger.child(context)
}
