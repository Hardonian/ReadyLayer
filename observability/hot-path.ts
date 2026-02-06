import { logger } from './logging';
import { metrics } from './metrics';

export interface HotPathTrackerOptions {
  requestId: string;
  route: string;
  operation?: string;
}

export interface HotPathTracker {
  recordDbCall: (count?: number) => void;
  recordExternalCall: (count?: number) => void;
  finish: (status: 'ok' | 'error', details?: Record<string, unknown>) => {
    durationMs: number;
    dbCalls: number;
    externalCalls: number;
  };
}

export function startHotPathTracker(options: HotPathTrackerOptions): HotPathTracker {
  const { requestId, route, operation } = options;
  const startedAt = Date.now();
  let dbCalls = 0;
  let externalCalls = 0;

  return {
    recordDbCall: (count: number = 1): void => {
      dbCalls += count;
    },
    recordExternalCall: (count: number = 1): void => {
      externalCalls += count;
    },
    finish: (
      status: 'ok' | 'error',
      details?: Record<string, unknown>
    ): { durationMs: number; dbCalls: number; externalCalls: number } => {
      const durationMs = Date.now() - startedAt;
      const labels = {
        route,
        operation: operation ?? 'unknown',
        status,
      };

      metrics.recordHistogram('hot_path.duration_ms', durationMs, labels);
      metrics.setGauge('hot_path.db_calls', dbCalls, labels);
      metrics.setGauge('hot_path.external_calls', externalCalls, labels);

      logger.info(
        {
          requestId,
          route,
          operation,
          durationMs,
          dbCalls,
          externalCalls,
          status,
          ...(details ?? {}),
        },
        'Hot path timing recorded'
      );

      return { durationMs, dbCalls, externalCalls };
    },
  };
}
