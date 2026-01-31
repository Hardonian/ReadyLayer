/**
 * Structured JSON logger for worker
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  trace_id?: string
  tenant_id?: string
  job_id?: string
  job_type?: string
  worker_id?: string
  [key: string]: unknown
}

class Logger {
  private context: LogContext = {}

  constructor(initialContext: LogContext = {}) {
    this.context = initialContext
  }

  child(context: LogContext): Logger {
    return new Logger({ ...this.context, ...context })
  }

  private log(level: LogLevel, message: string, extra: LogContext = {}): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...extra,
    }

    console.log(JSON.stringify(entry))
  }

  debug(message: string, extra?: LogContext): void {
    this.log('debug', message, extra)
  }

  info(message: string, extra?: LogContext): void {
    this.log('info', message, extra)
  }

  warn(message: string, extra?: LogContext): void {
    this.log('warn', message, extra)
  }

  error(message: string, extra?: LogContext): void {
    this.log('error', message, extra)
  }
}

export const logger = new Logger()
export type { Logger, LogContext }
