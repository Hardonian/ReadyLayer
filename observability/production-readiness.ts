/**
 * Production Readiness & SLA Tracking
 *
 * Monitors uptime, latency, error rates, and test coverage
 * to provide SLA compliance visibility for Startup CTOs.
 */

import { logger } from './logging';

export interface SLAMetrics {
  uptime: number; // Percentage (0-100)
  availability: number; // Percentage (0-100)
  errorRate: number; // Percentage (0-100)
  latencyP50: number; // milliseconds
  latencyP95: number; // milliseconds
  latencyP99: number; // milliseconds
  testCoverage: number; // Percentage (0-100)
  deployFrequency: number; // Deploys per day
  leadTime: number; // Minutes
  mttr: number; // Mean Time To Recovery (minutes)
  mttf: number; // Mean Time To Failure (minutes)
}

export interface SLATarget {
  uptime: number; // Target percentage (e.g., 99.9)
  latencyP95: number; // Target milliseconds
  errorRate: number; // Target percentage (e.g., 0.1)
  testCoverage: number; // Target percentage
}

export interface SLAStatus {
  status: 'healthy' | 'degraded' | 'critical';
  metrics: SLAMetrics;
  targets: SLATarget;
  compliance: Record<string, boolean>;
  lastUpdated: Date;
}

export interface HealthCheckResult {
  healthy: boolean;
  timestamp: Date;
  latency: number;
  errorCode?: number;
}

export interface ServiceEndpoint {
  name: string;
  url: string;
  critical: boolean; // If false, failures don't affect overall uptime
}

class ProductionReadinessService {
  private healthCheckResults: HealthCheckResult[] = [];
  private deploymentHistory: Date[] = [];
  private incidentHistory: Array<{ startTime: Date; duration: number }> = [];
  private maxHistorySize = 10000; // Keep last 10k health checks
  private readonly DEFAULT_SLA_TARGETS: SLATarget = {
    uptime: 99.9,
    latencyP95: 500,
    errorRate: 0.1,
    testCoverage: 80,
  };

  constructor(private endpoints: ServiceEndpoint[] = []) {
    // Endpoints will be used for distributed health checks in the future
    void this.endpoints;
  }

  /**
   * Record health check result
   */
  recordHealthCheck(healthy: boolean, latency: number, errorCode?: number): void {
    const result: HealthCheckResult = {
      healthy,
      timestamp: new Date(),
      latency,
      errorCode,
    };

    this.healthCheckResults.push(result);

    // Prune old results to prevent memory bloat
    if (this.healthCheckResults.length > this.maxHistorySize) {
      this.healthCheckResults = this.healthCheckResults.slice(-this.maxHistorySize);
    }

    if (!healthy) {
      logger.warn(
        { latency, errorCode },
        'Health check failed'
      );
    }
  }

  /**
   * Record deployment event
   */
  recordDeployment(): void {
    this.deploymentHistory.push(new Date());
  }

  /**
   * Record incident (outage) start/end
   */
  recordIncident(duration: number): void {
    this.incidentHistory.push({
      startTime: new Date(Date.now() - duration * 1000),
      duration,
    });
  }

  /**
   * Calculate uptime percentage over last N days
   */
  calculateUptime(daysPeriod: number = 7): number {
    const now = new Date();
    const periodStart = new Date(now.getTime() - daysPeriod * 24 * 60 * 60 * 1000);

    const recentChecks = this.healthCheckResults.filter(
      r => r.timestamp >= periodStart
    );

    if (recentChecks.length === 0) {
      return 100; // No data = assume healthy
    }

    const healthyChecks = recentChecks.filter(r => r.healthy).length;
    return (healthyChecks / recentChecks.length) * 100;
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate(minutes: number = 60): number {
    const now = new Date();
    const periodStart = new Date(now.getTime() - minutes * 60 * 1000);

    const recentChecks = this.healthCheckResults.filter(
      r => r.timestamp >= periodStart
    );

    if (recentChecks.length === 0) {
      return 0;
    }

    const errors = recentChecks.filter(r => !r.healthy).length;
    return (errors / recentChecks.length) * 100;
  }

  /**
   * Calculate latency percentiles
   */
  calculateLatencyPercentiles(minutes: number = 60): {
    p50: number;
    p95: number;
    p99: number;
  } {
    const now = new Date();
    const periodStart = new Date(now.getTime() - minutes * 60 * 1000);

    const recentChecks = this.healthCheckResults
      .filter(r => r.timestamp >= periodStart)
      .sort((a, b) => a.latency - b.latency);

    if (recentChecks.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const getPercentile = (p: number): number => {
      const index = Math.ceil((p / 100) * recentChecks.length) - 1;
      return recentChecks[Math.max(0, index)].latency;
    };

    return {
      p50: getPercentile(50),
      p95: getPercentile(95),
      p99: getPercentile(99),
    };
  }

  /**
   * Calculate Mean Time To Recovery
   */
  calculateMTTR(): number {
    if (this.incidentHistory.length === 0) {
      return 0;
    }

    const totalDuration = this.incidentHistory.reduce((sum, incident) => sum + incident.duration, 0);
    return totalDuration / this.incidentHistory.length / 60; // Convert to minutes
  }

  /**
   * Calculate Mean Time To Failure
   */
  calculateMTTF(): number {
    if (this.incidentHistory.length < 2) {
      return Infinity; // Not enough data
    }

    let totalTimeBetweenFailures = 0;
    for (let i = 1; i < this.incidentHistory.length; i++) {
      const timeBetween =
        this.incidentHistory[i].startTime.getTime() -
        (this.incidentHistory[i - 1].startTime.getTime() +
          this.incidentHistory[i - 1].duration * 1000);
      totalTimeBetweenFailures += timeBetween;
    }

    return totalTimeBetweenFailures / (this.incidentHistory.length - 1) / 60000; // Convert to minutes
  }

  /**
   * Calculate deployment frequency (per day)
   */
  calculateDeployFrequency(daysPeriod: number = 7): number {
    const now = new Date();
    const periodStart = new Date(now.getTime() - daysPeriod * 24 * 60 * 60 * 1000);

    const recentDeployments = this.deploymentHistory.filter(
      d => d >= periodStart
    ).length;

    return recentDeployments / daysPeriod;
  }

  /**
   * Get comprehensive SLA status
   */
  getSLAStatus(targets?: Partial<SLATarget>): SLAStatus {
    const slaTargets = { ...this.DEFAULT_SLA_TARGETS, ...targets };

    const uptime = this.calculateUptime(7);
    const errorRate = this.calculateErrorRate(60);
    const latencies = this.calculateLatencyPercentiles(60);
    const mttr = this.calculateMTTR();
    const mttf = this.calculateMTTF();
    const deployFrequency = this.calculateDeployFrequency(7);

    const metrics: SLAMetrics = {
      uptime,
      availability: uptime, // Same as uptime
      errorRate,
      latencyP50: latencies.p50,
      latencyP95: latencies.p95,
      latencyP99: latencies.p99,
      testCoverage: 0, // Placeholder - would integrate with test runner
      deployFrequency,
      leadTime: 0, // Placeholder - would calculate from git/deployment logs
      mttr,
      mttf,
    };

    const compliance = {
      uptime: uptime >= slaTargets.uptime,
      latency: latencies.p95 <= slaTargets.latencyP95,
      errorRate: errorRate <= slaTargets.errorRate,
      testCoverage: metrics.testCoverage >= slaTargets.testCoverage,
    };

    const status =
      Object.values(compliance).every(Boolean) ? 'healthy' :
      uptime >= 99 && errorRate < 1 ? 'degraded' :
      'critical';

    return {
      status,
      metrics,
      targets: slaTargets,
      compliance,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get readiness score (0-100)
   * Composite metric for production readiness
   */
  getReadinessScore(): number {
    const slaStatus = this.getSLAStatus();
    const { metrics, targets } = slaStatus;

    // Weighted scoring
    const uptimeScore = (metrics.uptime / targets.uptime) * 0.4;
    const latencyScore = Math.min(1, targets.latencyP95 / metrics.latencyP95) * 0.2;
    const errorScore = Math.min(1, targets.errorRate / Math.max(0.01, metrics.errorRate)) * 0.2;
    const testScore = (metrics.testCoverage / targets.testCoverage) * 0.2;

    const compositeScore = (uptimeScore + latencyScore + errorScore + testScore) * 100;
    return Math.min(100, Math.max(0, compositeScore));
  }

  /**
   * Generate human-readable SLA report
   */
  generateSLAReport(): string {
    const status = this.getSLAStatus();
    const readinessScore = this.getReadinessScore();

    const lines = [
      `Production Readiness Report`,
      `==========================`,
      ``,
      `Overall Readiness Score: ${readinessScore.toFixed(1)}/100 (${status.status.toUpperCase()})`,
      `Last Updated: ${status.lastUpdated.toISOString()}`,
      ``,
      `SLA Metrics:`,
      `  Uptime: ${status.metrics.uptime.toFixed(2)}% (Target: ${status.targets.uptime}%) ${status.compliance.uptime ? '✓' : '✗'}`,
      `  Availability: ${status.metrics.availability.toFixed(2)}%`,
      `  Error Rate: ${status.metrics.errorRate.toFixed(2)}% (Target: <${status.targets.errorRate}%) ${status.compliance.errorRate ? '✓' : '✗'}`,
      `  Latency P95: ${status.metrics.latencyP95}ms (Target: <${status.targets.latencyP95}ms) ${status.compliance.latency ? '✓' : '✗'}`,
      `  Latency P99: ${status.metrics.latencyP99}ms`,
      `  MTTR: ${status.metrics.mttr.toFixed(1)} minutes`,
      `  MTTF: ${status.metrics.mttf.toFixed(1)} minutes`,
      ``,
      `Deployment Metrics:`,
      `  Deploy Frequency: ${status.metrics.deployFrequency.toFixed(1)} per day`,
      `  Test Coverage: ${status.metrics.testCoverage}% (Target: ${status.targets.testCoverage}%)`,
      ``,
    ];

    return lines.join('\n');
  }
}

// Singleton instance
export const productionReadinessService = new ProductionReadinessService();

// Export for testing
export { ProductionReadinessService };
