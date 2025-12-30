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
  private getKey(name: string, labels?: Record<string, string>): string {
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

export const metrics = new MetricsCollector();
