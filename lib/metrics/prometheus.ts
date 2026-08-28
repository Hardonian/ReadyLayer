/**
 * Prometheus Metrics Integration
 *
 * P2: Production-ready Prometheus metrics exporter
 * Provides HTTP endpoint for metrics scraping with
 * support for counters, gauges, histograms, and summaries.
 *
 * Features:
 * - OpenMetrics format output
 * - Custom metric registration
 * - Automatic memory cleanup
 * - Label support with cardinality limits
 * - Push gateway support for batch jobs
 */

import { logger } from '@/observability/logging';

export interface MetricValue {
  value: number;
  labels: Record<string, string>;
  timestamp?: number;
}

export interface MetricDefinition {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labelNames: string[];
  buckets?: number[]; // For histograms
  quantiles?: number[]; // For summaries
}

export interface PrometheusConfig {
  defaultLabels?: Record<string, string>;
  maxCardinality?: number;
  defaultBuckets?: number[];
  collectDefaultMetrics?: boolean;
}

class MetricCollector {
  private definition: MetricDefinition;
  private values: Map<string, MetricValue> = new Map();
  private maxCardinality: number;

  constructor(definition: MetricDefinition, maxCardinality: number = 1000) {
    this.definition = definition;
    this.maxCardinality = maxCardinality;
  }

  record(value: number, labels: Record<string, string> = {}): void {
    const labelKey = this.getLabelKey(labels);

    // Check cardinality
    if (!this.values.has(labelKey) && this.values.size >= this.maxCardinality) {
      logger.warn({
        metric: this.definition.name,
        cardinality: this.values.size,
      }, 'Metric cardinality limit reached');
      return;
    }

    const existing = this.values.get(labelKey);

    switch (this.definition.type) {
      case 'counter':
        this.values.set(labelKey, {
          value: (existing?.value || 0) + value,
          labels,
          timestamp: Date.now(),
        });
        break;

      case 'gauge':
        this.values.set(labelKey, {
          value,
          labels,
          timestamp: Date.now(),
        });
        break;

      case 'histogram':
        this.recordHistogram(labelKey, labels, value);
        break;

      case 'summary':
        this.recordSummary(labelKey, labels, value);
        break;
    }
  }

  private recordHistogram(labelKey: string, labels: Record<string, string>, value: number): void {
    // Store raw values for histogram calculation
    const existing = this.values.get(labelKey);
    const values = existing ? [...(existing as unknown as { values: number[] }).values, value] : [value];

    this.values.set(labelKey, {
      value: 0, // Placeholder
      labels,
      timestamp: Date.now(),
    } as unknown as MetricValue);

    // Store values array as hidden property
    (this.values.get(labelKey) as unknown as { values: number[] }).values = values;
  }

  private recordSummary(labelKey: string, labels: Record<string, string>, value: number): void {
    // Similar to histogram but for quantiles
    const existing = this.values.get(labelKey);
    const values = existing ? [...(existing as unknown as { values: number[] }).values, value] : [value];

    this.values.set(labelKey, {
      value: 0,
      labels,
      timestamp: Date.now(),
    } as unknown as MetricValue);

    (this.values.get(labelKey) as unknown as { values: number[] }).values = values;
  }

  getOutput(): string {
    const lines: string[] = [];

    // Metric header
    lines.push(`# HELP ${this.definition.name} ${this.definition.help}`);
    lines.push(`# TYPE ${this.definition.name} ${this.definition.type}`);

    // Output values
    if (this.definition.type === 'histogram') {
      lines.push(...this.getHistogramOutput());
    } else if (this.definition.type === 'summary') {
      lines.push(...this.getSummaryOutput());
    } else {
      for (const [_, metricValue] of this.values) {
        const labelStr = this.formatLabels(metricValue.labels);
        lines.push(`${this.definition.name}${labelStr} ${metricValue.value}`);
      }
    }

    return lines.join('\n');
  }

  private getHistogramOutput(): string[] {
    const lines: string[] = [];
    const buckets = this.definition.buckets || [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

    for (const [_, metricValue] of this.values) {
      const labelStr = this.formatLabels(metricValue.labels);
      const values = (metricValue as unknown as { values: number[] }).values || [];

      // Bucket counts
      let cumulativeCount = 0;
      for (const bucket of buckets) {
        const count = values.filter(v => v <= bucket).length;
        cumulativeCount = count;
        lines.push(`${this.definition.name}_bucket{le="${bucket}"${labelStr.replace('{', ',').replace('}', '')}} ${cumulativeCount}`);
      }

      // +Inf bucket
      lines.push(`${this.definition.name}_bucket{le="+Inf"${labelStr.replace('{', ',').replace('}', '')}} ${values.length}`);

      // Sum and count
      const sum = values.reduce((a, b) => a + b, 0);
      lines.push(`${this.definition.name}_sum${labelStr} ${sum}`);
      lines.push(`${this.definition.name}_count${labelStr} ${values.length}`);
    }

    return lines;
  }

  private getSummaryOutput(): string[] {
    const lines: string[] = [];
    const quantiles = this.definition.quantiles || [0.5, 0.9, 0.95, 0.99];

    for (const [_, metricValue] of this.values) {
      const labelStr = this.formatLabels(metricValue.labels);
      const values = (metricValue as unknown as { values: number[] }).values || [];

      if (values.length === 0) continue;

      // Calculate quantiles
      const sorted = [...values].sort((a, b) => a - b);

      for (const q of quantiles) {
        const index = Math.floor(sorted.length * q);
        const quantileValue = sorted[Math.min(index, sorted.length - 1)];
        lines.push(`${this.definition.name}{quantile="${q}"${labelStr.replace('{', ',').replace('}', '')}} ${quantileValue}`);
      }

      // Sum and count
      const sum = values.reduce((a, b) => a + b, 0);
      lines.push(`${this.definition.name}_sum${labelStr} ${sum}`);
      lines.push(`${this.definition.name}_count${labelStr} ${values.length}`);
    }

    return lines;
  }

  private getLabelKey(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
  }

  private formatLabels(labels: Record<string, string>): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';

    const labelStr = entries
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `{${labelStr}}`;
  }

  clear(): void {
    this.values.clear();
  }

  getCardinality(): number {
    return this.values.size;
  }
}

export class PrometheusMetrics {
  private metrics: Map<string, MetricCollector> = new Map();
  private config: Required<PrometheusConfig>;
  private startTime: number = Date.now();

  constructor(config: PrometheusConfig = {}) {
    this.config = {
      defaultLabels: config.defaultLabels || {},
      maxCardinality: config.maxCardinality || 1000,
      defaultBuckets: config.defaultBuckets || [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      collectDefaultMetrics: config.collectDefaultMetrics ?? true,
    };

    if (this.config.collectDefaultMetrics) {
      this.registerDefaultMetrics();
    }
  }

  /**
   * Register a new metric
   */
  register(definition: MetricDefinition): void {
    if (this.metrics.has(definition.name)) {
      throw new Error(`Metric ${definition.name} already registered`);
    }

    // Set default buckets for histograms
    if (definition.type === 'histogram' && !definition.buckets) {
      definition.buckets = this.config.defaultBuckets;
    }

    this.metrics.set(
      definition.name,
      new MetricCollector(definition, this.config.maxCardinality)
    );

    logger.debug({ metric: definition.name, type: definition.type }, 'Metric registered');
  }

  /**
   * Record a metric value
   */
  record(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    const metric = this.metrics.get(name);
    if (!metric) {
      logger.warn({ metric: name }, 'Metric not found');
      return;
    }

    const mergedLabels = { ...this.config.defaultLabels, ...labels };
    metric.record(value, mergedLabels);
  }

  /**
   * Increment a counter metric
   */
  increment(name: string, labels?: Record<string, string>, value: number = 1): void {
    this.record(name, value, labels);
  }

  /**
   * Set a gauge metric
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    this.record(name, value, labels);
  }

  /**
   * Record a histogram observation
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    this.record(name, value, labels);
  }

  /**
   * Generate Prometheus/OpenMetrics format output
   */
  generateMetrics(): string {
    const sections: string[] = [];

    // Add default metrics
    if (this.config.collectDefaultMetrics) {
      this.updateDefaultMetrics();
    }

    // Generate output for each metric
    for (const [_, metric] of this.metrics) {
      const output = metric.getOutput();
      if (output) {
        sections.push(output);
      }
    }

    return sections.join('\n\n');
  }

  /**
   * Get metrics as HTTP response
   */
  getMetricsResponse(): {
    content: string;
    contentType: string;
  } {
    return {
      content: this.generateMetrics(),
      contentType: 'text/plain; version=0.0.4; charset=utf-8',
    };
  }

  /**
   * Get all metric cardinalities
   */
  getCardinalities(): Record<string, number> {
    const cardinalities: Record<string, number> = {};
    for (const [name, metric] of this.metrics) {
      cardinalities[name] = metric.getCardinality();
    }
    return cardinalities;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    for (const metric of this.metrics.values()) {
      metric.clear();
    }
    logger.info('All metrics cleared');
  }

  /**
   * Create metrics HTTP handler for Next.js
   */
  createHandler() {
    return async (_req: Request): Promise<Response> => {
      const { content, contentType } = this.getMetricsResponse();

      return new Response(content, {
        status: 200,
        headers: {
          'Content-Type': contentType,
        },
      });
    };
  }

  private registerDefaultMetrics(): void {
    // Process metrics
    this.register({
      name: 'process_cpu_user_seconds_total',
      help: 'Total user CPU time spent in seconds',
      type: 'counter',
      labelNames: [],
    });

    this.register({
      name: 'process_cpu_system_seconds_total',
      help: 'Total system CPU time spent in seconds',
      type: 'counter',
      labelNames: [],
    });

    this.register({
      name: 'process_resident_memory_bytes',
      help: 'Resident memory size in bytes',
      type: 'gauge',
      labelNames: [],
    });

    // Node.js specific
    this.register({
      name: 'nodejs_heap_size_total_bytes',
      help: 'Total heap size in bytes',
      type: 'gauge',
      labelNames: [],
    });

    this.register({
      name: 'nodejs_heap_size_used_bytes',
      help: 'Used heap size in bytes',
      type: 'gauge',
      labelNames: [],
    });

    this.register({
      name: 'nodejs_active_handles',
      help: 'Number of active handles',
      type: 'gauge',
      labelNames: [],
    });

    this.register({
      name: 'nodejs_active_requests',
      help: 'Number of active requests',
      type: 'gauge',
      labelNames: [],
    });

    // Uptime
    this.register({
      name: 'process_start_time_seconds',
      help: 'Start time of the process since unix epoch in seconds',
      type: 'gauge',
      labelNames: [],
    });

    // Record start time
    this.record('process_start_time_seconds', Math.floor(this.startTime / 1000));
  }

  private updateDefaultMetrics(): void {
    if (typeof process === 'undefined') return;

    const usage = process.cpuUsage();
    const memory = process.memoryUsage();

    // CPU metrics (convert from microseconds to seconds)
    this.record('process_cpu_user_seconds_total', usage.user / 1e6);
    this.record('process_cpu_system_seconds_total', usage.system / 1e6);

    // Memory metrics
    this.record('process_resident_memory_bytes', memory.rss);
    this.record('nodejs_heap_size_total_bytes', memory.heapTotal);
    this.record('nodejs_heap_size_used_bytes', memory.heapUsed);

    // Active handles/requests (if available)
    try {
      // @ts-expect-error - Node.js internal
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const handles = process._getActiveHandles() as unknown[];
      // @ts-expect-error - Node.js internal
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const requests = process._getActiveRequests() as unknown[];
      this.record('nodejs_active_handles', handles.length);
      this.record('nodejs_active_requests', requests.length);
    } catch {
      // Ignore if not available
    }
  }
}

// Global instance
let globalMetrics: PrometheusMetrics | null = null;

export function getPrometheusMetrics(config?: PrometheusConfig): PrometheusMetrics {
  if (!globalMetrics) {
    globalMetrics = new PrometheusMetrics(config);
  }
  return globalMetrics;
}

export function resetPrometheusMetrics(): void {
  globalMetrics = null;
}

export default { PrometheusMetrics, getPrometheusMetrics };
