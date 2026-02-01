export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
}

export interface ConsoleAdapter {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function resolveLogLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  if (raw && LOG_LEVELS.includes(raw as LogLevel)) {
    return raw as LogLevel;
  }
  return 'info';
}

function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(minLevel);
}

function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  return JSON.stringify(payload);
}

export function createLogger(scope?: string): Logger {
  const minLevel = resolveLogLevel();
  const baseContext = scope ? { scope } : undefined;

  const log = (level: LogLevel, message: string, context?: LogContext): void => {
    if (!shouldLog(level, minLevel)) {
      return;
    }

    const output = formatLog(level, message, {
      ...baseContext,
      ...context,
    });

    if (level === 'error') {
      console.error(output);
    } else {
      console.log(output);
    }
  };

  return {
    debug: (message, context) => log('debug', message, context),
    info: (message, context) => log('info', message, context),
    warn: (message, context) => log('warn', message, context),
    error: (message, context) => log('error', message, context),
  };
}

function formatArgs(args: unknown[]): string {
  return args
    .map((value) => {
      if (typeof value === 'string') {
        return value;
      }
      if (value instanceof Error) {
        return value.stack ?? value.message;
      }
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    })
    .join(' ');
}

export function createConsoleAdapter(logger: Logger): ConsoleAdapter {
  return {
    log: (...args) => logger.info(formatArgs(args)),
    info: (...args) => logger.info(formatArgs(args)),
    warn: (...args) => logger.warn(formatArgs(args)),
    error: (...args) => logger.error(formatArgs(args)),
  };
}
