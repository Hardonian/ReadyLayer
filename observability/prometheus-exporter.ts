/**
 * Prometheus Exporter
 * 
 * Exports application metrics to Prometheus or compatible backends.
 * Enables production-grade monitoring and alerting.
 * 
 * Supports:
 * - Prometheus push gateway
 * - Datadog StatsD
 * - Generic HTTP export
 */

import { logger } from './logging';
import { metrics } from './metrics';
import { productionReadinessService, type SLAStatus } from './production-readiness';

export interface ExportConfig {
  type: 'pushgateway' | 'statsd' | 'http';
  url?: string;
  jobName?: string;
  pushInterval?: number; // milliseconds
  enabled: boolean;
}

class PrometheusExporter {
  private config: ExportConfig;
  private exportInterval: ReturnType<typeof setInterval> | null = null;
  private lastExportTime = 0;

  constructor(config?: Partial<ExportConfig>) {
    this.config = {
      type: 'pushgateway',
      url: process.env.PROMETHEUS_PUSHGATEWAY_URL || 'http://localhost:9091',
      jobName: process.env.PROMETHEUS_JOB_NAME || 'readylayer',
      pushInterval: parseInt(process.env.PROMETHEUS_PUSH_INTERVAL || '60000'),
      enabled: process.env.PROMETHEUS_ENABLED !== 'false',
      ...config,
    };

    if (this.config.enabled) {
      this.start();
    }
  }

  /**
   * Start periodic metric export
   */
  start(): void {
    if (!this.config.enabled) {
      logger.info('Prometheus export disabled');
      return;
    }

    logger.info(
      { type: this.config.type, url: this.config.url },
      'Starting Prometheus exporter'
    );

    // Export on startup
    this.export();

    // Set up periodic export
    this.exportInterval = setInterval(
      () => this.export(),
      this.config.pushInterval || 60000
    );
  }

  /**
   * Stop periodic export
   */
  stop(): void {
    if (this.exportInterval) {
      clearInterval(this.exportInterval);
      this.exportInterval = null;
      logger.info('Prometheus exporter stopped');
    }
  }

  /**
   * Export metrics to configured backend
   */
  async export(): Promise<void> {
    try {
      const prometheusFormat = this.buildPrometheusFormat();

      switch (this.config.type) {
        case 'pushgateway':
          await this.exportToPushGateway(prometheusFormat);
          break;
        case 'statsd':
          await this.exportToStatsD(prometheusFormat);
          break;
        case 'http':
          await this.exportToHTTP(prometheusFormat);
          break;
      }

      this.lastExportTime = Date.now();
    } catch (error) {
      logger.warn({ error }, 'Failed to export metrics to Prometheus');
    }
  }

  /**
   * Build Prometheus text format from metrics
   */
  private buildPrometheusFormat(): string {
    const lines: string[] = [];

    // Add timestamp
    lines.push(`# HELP readylayer_export_timestamp_seconds Export timestamp`);
    lines.push(`# TYPE readylayer_export_timestamp_seconds gauge`);
    lines.push(`readylayer_export_timestamp_seconds ${Date.now() / 1000}`);
    lines.push('');

    // Add application metrics
    const appMetrics = metrics.getPrometheusFormat();
    lines.push(appMetrics);

    // Add SLA metrics
    const slaStatus = productionReadinessService.getSLAStatus();
    lines.push(this.formatSLAMetrics(slaStatus));

    // Add export metadata
    lines.push(`# HELP readylayer_export_count Total metric exports`);
    lines.push(`# TYPE readylayer_export_count counter`);
    lines.push(`readylayer_export_count 1`);

    return lines.join('\n');
  }

  /**
   * Format SLA metrics in Prometheus format
   */
  private formatSLAMetrics(slaStatus: SLAStatus): string {
    const lines: string[] = [
      `# HELP readylayer_uptime_percent System uptime percentage`,
      `# TYPE readylayer_uptime_percent gauge`,
      `readylayer_uptime_percent ${slaStatus.metrics.uptime}`,
      '',
      `# HELP readylayer_error_rate_percent Error rate percentage`,
      `# TYPE readylayer_error_rate_percent gauge`,
      `readylayer_error_rate_percent ${slaStatus.metrics.errorRate}`,
      '',
      `# HELP readylayer_latency_p95_ms P95 latency in milliseconds`,
      `# TYPE readylayer_latency_p95_ms gauge`,
      `readylayer_latency_p95_ms ${slaStatus.metrics.latencyP95}`,
      '',
      `# HELP readylayer_latency_p99_ms P99 latency in milliseconds`,
      `# TYPE readylayer_latency_p99_ms gauge`,
      `readylayer_latency_p99_ms ${slaStatus.metrics.latencyP99}`,
      '',
      `# HELP readylayer_mttr_minutes Mean time to recovery in minutes`,
      `# TYPE readylayer_mttr_minutes gauge`,
      `readylayer_mttr_minutes ${slaStatus.metrics.mttr}`,
      '',
      `# HELP readylayer_readiness_score Production readiness score (0-100)`,
      `# TYPE readylayer_readiness_score gauge`,
      `readylayer_readiness_score ${productionReadinessService.getReadinessScore()}`,
    ];

    return lines.join('\n');
  }

  /**
   * Export to Prometheus Push Gateway
   */
  private async exportToPushGateway(data: string): Promise<void> {
    if (!this.config.url) {
      throw new Error('Prometheus Push Gateway URL not configured');
    }

    const url = new URL(
      `/metrics/job/${this.config.jobName || 'readylayer'}`,
      this.config.url
    );

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: data,
      });

      if (!response.ok) {
        throw new Error(`Push Gateway returned ${response.status}`);
      }

      logger.debug('Metrics exported to Prometheus Push Gateway');
    } catch (error) {
      logger.warn({ error, url: url.toString() }, 'Failed to export to Push Gateway');
      throw error;
    }
  }

  /**
   * Export to StatsD (Datadog compatible)
   */
  private async exportToStatsD(data: string): Promise<void> {
    // Parse Prometheus format and convert to StatsD
    const lines = data.split('\n');
    const statsdMetrics: string[] = [];

    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;

      // Convert gauge readylayer_uptime_percent 99.5
      // to Datadog format: readylayer.uptime_percent:99.5|g
      const match = line.match(/^(\w+)(?:{.*})?\s+([\d.]+)$/);
      if (match) {
        const [, metric, value] = match;
        statsdMetrics.push(`${metric}:${value}|g`);
      }
    }

    if (statsdMetrics.length === 0) return;

    // Send via UDP to StatsD server
    const dgram = await import('dgram');
    const socket = dgram.createSocket('udp4');
    const server = process.env.STATSD_HOST || 'localhost';
    const port = parseInt(process.env.STATSD_PORT || '8125');

    const message = statsdMetrics.join('\n');

    socket.send(message, 0, message.length, port, server, (error) => {
      socket.close();
      if (error) {
        logger.warn({ error }, 'Failed to send StatsD metrics');
      } else {
        logger.debug('Metrics exported to StatsD');
      }
    });
  }

  /**
   * Export via HTTP endpoint
   */
  private async exportToHTTP(data: string): Promise<void> {
    if (!this.config.url) {
      throw new Error('HTTP export URL not configured');
    }

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': `Bearer ${process.env.PROMETHEUS_TOKEN || ''}`,
        },
        body: data,
      });

      if (!response.ok) {
        throw new Error(`HTTP export returned ${response.status}`);
      }

      logger.debug('Metrics exported via HTTP');
    } catch (error) {
      logger.warn({ error }, 'Failed to export metrics via HTTP');
      throw error;
    }
  }

  /**
   * Get exporter status
   */
  getStatus(): {
    enabled: boolean;
    type: string;
    url?: string;
    lastExport: Date | null;
  } {
    return {
      enabled: this.config.enabled,
      type: this.config.type,
      url: this.config.url,
      lastExport: this.lastExportTime ? new Date(this.lastExportTime) : null,
    };
  }
}

// Singleton instance
export const prometheusExporter = new PrometheusExporter();

// Export for API endpoint
export async function getMetricsForPrometheus(): Promise<string> {
  const exporter = new PrometheusExporter();
  return exporter['buildPrometheusFormat']();
}
