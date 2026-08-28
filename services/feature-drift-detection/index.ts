/**
 * Feature Drift Detection
 *
 * P1: Detect when feature distributions change over time
 * Uses statistical tests (KS test, Chi-square, PSI) to detect
 * drift in feature values that may indicate model degradation.
 *
 * Features:
 * - Kolmogorov-Smirnov test for numerical features
 * - Chi-square test for categorical features
 * - Population Stability Index (PSI) for distribution shift
 * - Automatic baseline window selection
 * - Drift severity classification
 */

import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';

export interface FeatureDriftConfig {
  baselineWindow?: number; // Days of baseline data (default 30)
  currentWindow?: number; // Days of current data (default 7)
  psiThreshold?: number; // PSI threshold for drift (default 0.2)
  ksThreshold?: number; // KS test p-value threshold (default 0.05)
  minSampleSize?: number; // Minimum samples for detection (default 100)
}

export interface FeatureDistribution {
  featureName: string;
  featureType: 'numerical' | 'categorical';
  baseline: {
    count: number;
    mean?: number;
    std?: number;
    min?: number;
    max?: number;
    histogram?: Array<{ bin: string; count: number }>;
    categories?: Record<string, number>;
  };
  current: {
    count: number;
    mean?: number;
    std?: number;
    min?: number;
    max?: number;
    histogram?: Array<{ bin: string; count: number }>;
    categories?: Record<string, number>;
  };
}

export interface DriftResult {
  featureName: string;
  driftDetected: boolean;
  driftType: 'none' | 'gradual' | 'sudden' | 'seasonal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metrics: {
    psi?: number; // Population Stability Index
    ksStatistic?: number; // KS test statistic
    ksPValue?: number; // KS test p-value
    chiSquare?: number; // Chi-square statistic
    chiSquarePValue?: number; // Chi-square p-value
    meanDiff?: number; // Mean difference
    stdDiff?: number; // Std difference
  };
  recommendation: string;
}

export class FeatureDriftDetector {
  private config: Required<FeatureDriftConfig>;

  constructor(config: FeatureDriftConfig = {}) {
    this.config = {
      baselineWindow: config.baselineWindow || 30,
      currentWindow: config.currentWindow || 7,
      psiThreshold: config.psiThreshold || 0.2,
      ksThreshold: config.ksThreshold || 0.05,
      minSampleSize: config.minSampleSize || 100,
    };
  }

  /**
   * Detect drift for multiple features
   */
  detectDrift(features: FeatureDistribution[]): DriftResult[] {
    const startTime = Date.now();
    const results: DriftResult[] = [];

    for (const feature of features) {
      const result = this.analyzeFeature(feature);
      results.push(result);
    }

    const driftCount = results.filter(r => r.driftDetected).length;
    const detectionTime = Date.now() - startTime;

    metrics.recordHistogram('drift_detection_duration', detectionTime);
    metrics.increment('drift_features_checked', { count: features.length.toString() });
    metrics.increment('drift_detected', { count: driftCount.toString() });

    logger.info({
      featuresChecked: features.length,
      driftDetected: driftCount,
      detectionTimeMs: detectionTime,
    }, 'Feature drift detection complete');

    return results;
  }

  /**
   * Analyze a single feature for drift
   */
  private analyzeFeature(feature: FeatureDistribution): DriftResult {
    // Check minimum sample size
    if (feature.baseline.count < this.config.minSampleSize ||
        feature.current.count < this.config.minSampleSize / 2) {
      return {
        featureName: feature.featureName,
        driftDetected: false,
        driftType: 'none',
        severity: 'low',
        metrics: {},
        recommendation: 'Insufficient data for drift detection',
      };
    }

    if (feature.featureType === 'numerical') {
      return this.analyzeNumericalFeature(feature);
    } else {
      return this.analyzeCategoricalFeature(feature);
    }
  }

  /**
   * Analyze numerical feature using KS test and PSI
   */
  private analyzeNumericalFeature(feature: FeatureDistribution): DriftResult {
    const baseline = feature.baseline;
    const current = feature.current;

    // Calculate PSI
    const psi = this.calculatePSI(baseline, current);

    // Estimate KS statistic from distributions
    const ksResult = this.estimateKSStatistic(baseline, current);

    // Calculate mean and std differences
    const meanDiff = current.mean! - baseline.mean!;
    const stdDiff = current.std! - baseline.std!;

    // Determine if drift is detected
    const psiDrift = psi > this.config.psiThreshold;
    const ksDrift = ksResult.pValue < this.config.ksThreshold;
    const driftDetected = psiDrift || ksDrift;

    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (psi > 0.5 || (ksDrift && ksResult.statistic > 0.3)) {
      severity = 'critical';
    } else if (psi > 0.3 || (ksDrift && ksResult.statistic > 0.2)) {
      severity = 'high';
    } else if (psi > this.config.psiThreshold || ksDrift) {
      severity = 'medium';
    }

    // Determine drift type
    const driftType = this.classifyDriftType(psi, ksResult, baseline, current);

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      feature.featureName,
      driftDetected,
      severity,
      psi,
      meanDiff,
      stdDiff
    );

    return {
      featureName: feature.featureName,
      driftDetected,
      driftType,
      severity,
      metrics: {
        psi,
        ksStatistic: ksResult.statistic,
        ksPValue: ksResult.pValue,
        meanDiff,
        stdDiff,
      },
      recommendation,
    };
  }

  /**
   * Analyze categorical feature using Chi-square test
   */
  private analyzeCategoricalFeature(feature: FeatureDistribution): DriftResult {
    const baseline = feature.baseline.categories || {};
    const current = feature.current.categories || {};

    // Calculate Chi-square statistic
    const chiSquareResult = this.calculateChiSquare(baseline, current);

    // Calculate PSI for categorical (category distribution shift)
    const psi = this.calculateCategoricalPSI(baseline, current);

    const driftDetected = chiSquareResult.pValue < this.config.ksThreshold || psi > this.config.psiThreshold;

    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (psi > 0.5 || chiSquareResult.pValue < 0.01) {
      severity = 'critical';
    } else if (psi > 0.3 || chiSquareResult.pValue < 0.03) {
      severity = 'high';
    } else if (psi > this.config.psiThreshold || chiSquareResult.pValue < this.config.ksThreshold) {
      severity = 'medium';
    }

    const driftType = this.classifyCategoricalDrift(baseline, current, psi);

    return {
      featureName: feature.featureName,
      driftDetected,
      driftType,
      severity,
      metrics: {
        psi,
        chiSquare: chiSquareResult.statistic,
        chiSquarePValue: chiSquareResult.pValue,
      },
      recommendation: this.generateCategoricalRecommendation(
        feature.featureName,
        driftDetected,
        severity,
        baseline,
        current
      ),
    };
  }

  /**
   * Calculate Population Stability Index (PSI)
   */
  private calculatePSI(baseline: FeatureDistribution['baseline'], current: FeatureDistribution['current']): number {
    if (!baseline.histogram || !current.histogram) {
      // Fallback: use mean/std comparison
      return this.calculatePSIFromStats(baseline, current);
    }

    let psi = 0;
    const baselineTotal = baseline.count;
    const currentTotal = current.count;

    // Create unified bins
    const allBins = new Set([
      ...baseline.histogram.map(h => h.bin),
      ...current.histogram.map(h => h.bin),
    ]);

    for (const bin of allBins) {
      const baselineCount = baseline.histogram.find(h => h.bin === bin)?.count || 0;
      const currentCount = current.histogram.find(h => h.bin === bin)?.count || 0;

      const baselinePct = baselineCount / baselineTotal;
      const currentPct = currentCount / currentTotal;

      if (baselinePct > 0) {
        // PSI = sum((Actual% - Expected%) * ln(Actual% / Expected%))
        psi += (currentPct - baselinePct) * Math.log((currentPct + 0.0001) / (baselinePct + 0.0001));
      }
    }

    return Math.abs(psi);
  }

  /**
   * Fallback PSI calculation from mean/std when histogram not available
   */
  private calculatePSIFromStats(
    baseline: FeatureDistribution['baseline'],
    current: FeatureDistribution['current']
  ): number {
    // Simplified PSI using mean difference relative to std
    const meanDiff = Math.abs(current.mean! - baseline.mean!);
    const pooledStd = Math.sqrt((baseline.std! ** 2 + current.std! ** 2) / 2);

    if (pooledStd === 0) return 0;

    const standardizedDiff = meanDiff / pooledStd;

    // Approximate PSI from standardized difference
    if (standardizedDiff < 0.1) return 0;
    if (standardizedDiff < 0.5) return 0.05 + standardizedDiff * 0.2;
    if (standardizedDiff < 1.0) return 0.15 + standardizedDiff * 0.15;
    return Math.min(0.5 + standardizedDiff * 0.1, 1.0);
  }

  /**
   * Estimate KS statistic from distribution summaries
   */
  private estimateKSStatistic(
    baseline: FeatureDistribution['baseline'],
    current: FeatureDistribution['current']
  ): { statistic: number; pValue: number } {
    // Simplified KS estimation from mean/std difference
    const meanDiff = Math.abs(current.mean! - baseline.mean!);
    const pooledStd = Math.sqrt((baseline.std! ** 2 + current.std! ** 2) / 2);

    if (pooledStd === 0) return { statistic: 0, pValue: 1 };

    // Approximate KS statistic from standardized mean difference
    const d = Math.min(meanDiff / pooledStd * 0.5, 1);

    // Approximate p-value (simplified)
    const n = Math.min(baseline.count, current.count);
    const lambda = (Math.sqrt(n) + 0.12 + 0.11 / Math.sqrt(n)) * d;
    const pValue = Math.exp(-2 * lambda * lambda);

    return { statistic: d, pValue };
  }

  /**
   * Calculate Chi-square statistic for categorical features
   */
  private calculateChiSquare(
    baseline: Record<string, number>,
    current: Record<string, number>
  ): { statistic: number; pValue: number } {
    const baselineTotal = Object.values(baseline).reduce((a, b) => a + b, 0);
    const currentTotal = Object.values(current).reduce((a, b) => a + b, 0);

    const allCategories = new Set([...Object.keys(baseline), ...Object.keys(current)]);

    let chiSquare = 0;
    const degreesOfFreedom = allCategories.size - 1;

    for (const category of allCategories) {
      const observed = current[category] || 0;
      const expected = (baseline[category] || 0) / baselineTotal * currentTotal;

      if (expected > 0) {
        chiSquare += Math.pow(observed - expected, 2) / expected;
      }
    }

    // Approximate p-value using chi-square distribution
    // For simplicity, using a rough approximation
    const pValue = degreesOfFreedom > 0
      ? Math.exp(-chiSquare / (2 * degreesOfFreedom))
      : 1;

    return { statistic: chiSquare, pValue };
  }

  /**
   * Calculate PSI for categorical features
   */
  private calculateCategoricalPSI(
    baseline: Record<string, number>,
    current: Record<string, number>
  ): number {
    const baselineTotal = Object.values(baseline).reduce((a, b) => a + b, 0);
    const currentTotal = Object.values(current).reduce((a, b) => a + b, 0);

    const allCategories = new Set([...Object.keys(baseline), ...Object.keys(current)]);

    let psi = 0;

    for (const category of allCategories) {
      const baselinePct = (baseline[category] || 0) / baselineTotal;
      const currentPct = (current[category] || 0) / currentTotal;

      if (baselinePct > 0) {
        psi += (currentPct - baselinePct) * Math.log((currentPct + 0.0001) / (baselinePct + 0.0001));
      }
    }

    return Math.abs(psi);
  }

  /**
   * Classify the type of drift for numerical features
   */
  private classifyDriftType(
    psi: number,
    ksResult: { statistic: number; pValue: number },
    baseline: FeatureDistribution['baseline'],
    current: FeatureDistribution['current']
  ): 'none' | 'gradual' | 'sudden' | 'seasonal' {
    if (psi < this.config.psiThreshold && ksResult.pValue >= this.config.ksThreshold) {
      return 'none';
    }

    const meanShift = Math.abs(current.mean! - baseline.mean!) / (baseline.std! || 1);
    const stdChange = Math.abs(current.std! - baseline.std!) / (baseline.std! || 1);

    // Sudden: Large immediate shift
    if (meanShift > 2 || stdChange > 1) {
      return 'sudden';
    }

    // Seasonal: Pattern in recent data suggests cyclical behavior
    if (meanShift > 0.5 && meanShift < 1.5 && stdChange < 0.5) {
      return 'seasonal';
    }

    // Gradual: Slow shift over time
    return 'gradual';
  }

  /**
   * Classify drift type for categorical features
   */
  private classifyCategoricalDrift(
    baseline: Record<string, number>,
    current: Record<string, number>,
    psi: number
  ): 'none' | 'gradual' | 'sudden' | 'seasonal' {
    if (psi < this.config.psiThreshold) {
      return 'none';
    }

    const baselineCategories = Object.keys(baseline).length;
    const newCategories = Object.keys(current).filter(c => !baseline[c]).length;
    const disappearedCategories = Object.keys(baseline).filter(c => !current[c]).length;

    // Sudden: Many new or disappeared categories
    if (newCategories > baselineCategories * 0.3 || disappearedCategories > baselineCategories * 0.3) {
      return 'sudden';
    }

    return 'gradual';
  }

  /**
   * Generate recommendation for numerical drift
   */
  private generateRecommendation(
    featureName: string,
    driftDetected: boolean,
    severity: string,
    psi: number,
    meanDiff: number,
    stdDiff: number
  ): string {
    if (!driftDetected) {
      return `No significant drift detected for ${featureName}. Continue monitoring.`;
    }

    const recommendations: string[] = [];

    if (psi > this.config.psiThreshold) {
      recommendations.push(`PSI of ${psi.toFixed(3)} indicates distribution shift`);
    }

    if (Math.abs(meanDiff) > 0.1) {
      recommendations.push(`Mean shifted by ${meanDiff.toFixed(3)}`);
    }

    if (Math.abs(stdDiff) > 0.05) {
      recommendations.push(`Variance changed by ${stdDiff.toFixed(3)}`);
    }

    const action = severity === 'critical'
      ? 'Immediate model retraining recommended'
      : severity === 'high'
      ? 'Schedule model retraining soon'
      : 'Monitor closely and consider retraining';

    return `${recommendations.join(', ')}. ${action}.`;
  }

  /**
   * Generate recommendation for categorical drift
   */
  private generateCategoricalRecommendation(
    featureName: string,
    driftDetected: boolean,
    severity: string,
    baseline: Record<string, number>,
    current: Record<string, number>
  ): string {
    if (!driftDetected) {
      return `No significant drift detected for ${featureName}. Continue monitoring.`;
    }

    const newCategories = Object.keys(current).filter(c => !baseline[c]);
    const disappearedCategories = Object.keys(baseline).filter(c => !current[c]);

    const parts: string[] = [];

    if (newCategories.length > 0) {
      parts.push(`${newCategories.length} new categories detected`);
    }

    if (disappearedCategories.length > 0) {
      parts.push(`${disappearedCategories.length} categories disappeared`);
    }

    const action = severity === 'critical'
      ? 'Update feature encoding and retrain model immediately'
      : severity === 'high'
      ? 'Update feature encoding and schedule retraining'
      : 'Review category mappings and monitor';

    return `${parts.join(', ')}. ${action}.`;
  }

  /**
   * Get overall drift summary
   */
  getDriftSummary(results: DriftResult[]): {
    totalFeatures: number;
    driftDetectedCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    overallHealth: 'healthy' | 'degraded' | 'critical';
  } {
    const driftDetectedCount = results.filter(r => r.driftDetected).length;
    const criticalCount = results.filter(r => r.severity === 'critical').length;
    const highCount = results.filter(r => r.severity === 'high').length;
    const mediumCount = results.filter(r => r.severity === 'medium').length;
    const lowCount = results.filter(r => r.severity === 'low').length;

    let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalCount > 0 || driftDetectedCount > results.length * 0.3) {
      overallHealth = 'critical';
    } else if (highCount > 0 || driftDetectedCount > results.length * 0.1) {
      overallHealth = 'degraded';
    }

    return {
      totalFeatures: results.length,
      driftDetectedCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      overallHealth,
    };
  }
}

export default { FeatureDriftDetector };
