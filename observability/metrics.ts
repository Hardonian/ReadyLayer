/**
 * Metrics Collection
 * 
 * Prometheus-compatible metrics
 */

export interface Metric {
  name: string;
  value: number;
  labels?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram';
}

class MetricsCollector {
  private metrics: Map<string, Metric> = new Map();

  /**
   * Increment counter
   */
  increment(name: string, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const existing = this.metrics.get(key);

    if (existing && existing.type === 'counter') {
      existing.value += 1;
    } else {
      this.metrics.set(key, {
        name,
        value: 1,
        labels,
        type: 'counter',
      });
    }
  }

  /**
   * Set gauge value
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    this.metrics.set(key, {
      name,
      value,
      labels,
      type: 'gauge',
    });
  }

  /**
   * Record histogram value
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const existing = this.metrics.get(key);

    if (existing && existing.type === 'histogram') {
      // Would maintain histogram buckets in production
      existing.value = value;
    } else {
      this.metrics.set(key, {
        name,
        value,
        labels,
        type: 'histogram',
      });
    }
  }

  /**
   * Get metrics in Prometheus format
   */
  getPrometheusFormat(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      const labelStr = metric.labels
        ? `{${Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
        : '';
      lines.push(`${metric.name}${labelStr} ${metric.value}`);
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Get key for metric
   */
  protected getKey(name: string, labels?: Record<string, string>): string {
    if (!labels) {
      return name;
    }
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }
}

/**
 * Metric Summary with percentiles and aggregations
 */
export interface MetricSummary {
  name: string;
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Extended metrics with distribution tracking
 */
class ExtendedMetricsCollector extends MetricsCollector {
  private histogramData: Map<string, number[]> = new Map();

  /**
   * Record histogram with distribution tracking
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    super.recordHistogram(name, value, labels);

    const key = this.getKey(name, labels);
    if (!this.histogramData.has(key)) {
      this.histogramData.set(key, []);
    }
    this.histogramData.get(key)!.push(value);
  }

  /**
   * Get metric summary with percentiles
   */
  getSummary(name: string, labels?: Record<string, string>): MetricSummary | null {
    const key = this.getKey(name, labels);
    const values = this.histogramData.get(key);

    if (!values || values.length === 0) {
      return null;
    }

    const sorted = values.sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;

    const percentile = (p: number): number => {
      const idx = Math.ceil((p / 100) * values.length) - 1;
      return sorted[Math.max(0, idx)];
    };

    return {
      name,
      count: values.length,
      sum,
      average: avg,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: percentile(50),
      p95: percentile(95),
      p99: percentile(99),
    };
  }

  /**
   * Clear old data
   */
  clearOldData(_maxAge: number = 3600000): void {
    // Keep only recent data (default: 1 hour)
    // In production, would use timestamps for each value
  }
}

export const metrics = new ExtendedMetricsCollector();
