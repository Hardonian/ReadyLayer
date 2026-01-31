/**
 * Model Versioning and A/B Testing
 * 
 * P2: Production model versioning with A/B testing framework
 * Supports multiple model versions, traffic splitting, and
 * statistical significance testing for model comparison.
 * 
 * Features:
 * - Semantic model versioning
 * - Traffic splitting with configurable weights
 * - Statistical significance testing
 * - Automatic winner selection
 * - Gradual rollout support
 */

import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';
import { createHash } from 'crypto';

export interface ModelVersion {
  id: string;
  version: string; // Semantic version
  modelType: string;
  artifactUrl: string;
  checksum: string;
  metadata: {
    createdAt: Date;
    trainingDataHash: string;
    metrics: Record<string, number>;
    parameters: Record<string, unknown>;
    framework: string;
    description?: string;
  };
  status: 'draft' | 'staging' | 'production' | 'deprecated' | 'archived';
}

export interface ABTest {
  id: string;
  name: string;
  modelA: string; // Version ID
  modelB: string; // Version ID
  trafficSplit: number; // 0-1, percentage to model B
  status: 'running' | 'paused' | 'completed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  winner?: 'A' | 'B' | 'inconclusive';
  confidenceLevel: number; // 0-1
  minimumSampleSize: number;
  primaryMetric: string;
  secondaryMetrics: string[];
}

export interface ExperimentAssignment {
  userId: string;
  experimentId: string;
  variant: 'A' | 'B';
  assignedAt: Date;
  consistencyHash: string;
}

export interface MetricObservation {
  experimentId: string;
  userId: string;
  variant: 'A' | 'B';
  metricName: string;
  value: number;
  timestamp: Date;
}

export interface StatisticalResult {
  variant: 'A' | 'B';
  sampleSize: number;
  mean: number;
  stdDev: number;
  confidenceInterval: [number, number];
}

export interface ABTestResult {
  experiment: ABTest;
  statistics: {
    A: StatisticalResult;
    B: StatisticalResult;
  };
  comparison: {
    relativeImprovement: number; // Percentage
    pValue: number;
    isSignificant: boolean;
    winner: 'A' | 'B' | 'inconclusive';
    power: number; // Statistical power
  };
  recommendations: string[];
}

export class ModelVersionManager {
  private versions: Map<string, ModelVersion> = new Map();
  private currentProduction: Map<string, string> = new Map(); // modelType -> versionId

  /**
   * Register a new model version
   */
  registerVersion(version: Omit<ModelVersion, 'status'>): ModelVersion {
    const fullVersion: ModelVersion = {
      ...version,
      status: 'draft',
    };

    this.versions.set(version.id, fullVersion);
    
    logger.info({
      versionId: version.id,
      modelType: version.modelType,
      semanticVersion: version.version,
    }, 'Model version registered');

    metrics.increment('model_version_registered');

    return fullVersion;
  }

  /**
   * Promote version to staging
   */
  promoteToStaging(versionId: string): ModelVersion {
    const version = this.versions.get(versionId);
    if (!version) throw new Error(`Version ${versionId} not found`);
    if (version.status !== 'draft') {
      throw new Error(`Cannot promote version from ${version.status} to staging`);
    }

    version.status = 'staging';
    logger.info({ versionId }, 'Model version promoted to staging');
    
    return version;
  }

  /**
   * Promote version to production
   */
  promoteToProduction(versionId: string, rolloutPercentage: number = 100): ModelVersion {
    const version = this.versions.get(versionId);
    if (!version) throw new Error(`Version ${versionId} not found`);
    if (version.status !== 'staging' && version.status !== 'draft') {
      throw new Error(`Cannot promote version from ${version.status} to production`);
    }

    // Deprecate current production version
    const currentProdId = this.currentProduction.get(version.modelType);
    if (currentProdId) {
      const current = this.versions.get(currentProdId);
      if (current) {
        current.status = 'deprecated';
      }
    }

    version.status = 'production';
    this.currentProduction.set(version.modelType, versionId);

    logger.info({
      versionId,
      modelType: version.modelType,
      rolloutPercentage,
    }, 'Model version promoted to production');

    metrics.increment('model_version_promoted');

    return version;
  }

  /**
   * Deprecate a model version
   */
  deprecateVersion(versionId: string): ModelVersion {
    const version = this.versions.get(versionId);
    if (!version) throw new Error(`Version ${versionId} not found`);

    version.status = 'deprecated';
    
    logger.info({ versionId }, 'Model version deprecated');
    
    return version;
  }

  /**
   * Get version by ID
   */
  getVersion(versionId: string): ModelVersion | undefined {
    return this.versions.get(versionId);
  }

  /**
   * Get current production version for model type
   */
  getProductionVersion(modelType: string): ModelVersion | undefined {
    const versionId = this.currentProduction.get(modelType);
    if (!versionId) return undefined;
    return this.versions.get(versionId);
  }

  /**
   * List all versions for a model type
   */
  listVersions(modelType?: string): ModelVersion[] {
    const allVersions = Array.from(this.versions.values());
    if (modelType) {
      return allVersions.filter(v => v.modelType === modelType);
    }
    return allVersions;
  }

  /**
   * Compare two versions
   */
  compareVersions(versionAId: string, versionBId: string): {
    versionA: ModelVersion;
    versionB: ModelVersion;
    metricDiffs: Array<{
      metric: string;
      A: number;
      B: number;
      diff: number;
      diffPercent: number;
    }>;
  } {
    const versionA = this.versions.get(versionAId);
    const versionB = this.versions.get(versionBId);
    
    if (!versionA) throw new Error(`Version ${versionAId} not found`);
    if (!versionB) throw new Error(`Version ${versionBId} not found`);

    const allMetrics = new Set([
      ...Object.keys(versionA.metadata.metrics),
      ...Object.keys(versionB.metadata.metrics),
    ]);

    const metricDiffs = Array.from(allMetrics).map(metric => {
      const A = versionA.metadata.metrics[metric] || 0;
      const B = versionB.metadata.metrics[metric] || 0;
      const diff = B - A;
      const diffPercent = A !== 0 ? (diff / A) * 100 : 0;

      return {
        metric,
        A,
        B,
        diff,
        diffPercent,
      };
    });

    return {
      versionA,
      versionB,
      metricDiffs,
    };
  }
}

export class ABTestManager {
  private experiments: Map<string, ABTest> = new Map();
  private assignments: Map<string, ExperimentAssignment> = new Map();
  private observations: Map<string, MetricObservation[]> = new Map();

  constructor(private versionManager: ModelVersionManager) {}

  /**
   * Create a new A/B test
   */
  createExperiment(config: Omit<ABTest, 'id' | 'status' | 'startTime'>): ABTest {
    const experiment: ABTest = {
      ...config,
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'running',
      startTime: new Date(),
    };

    // Validate model versions exist
    const modelA = this.versionManager.getVersion(config.modelA);
    const modelB = this.versionManager.getVersion(config.modelB);
    
    if (!modelA) throw new Error(`Model version ${config.modelA} not found`);
    if (!modelB) throw new Error(`Model version ${config.modelB} not found`);

    this.experiments.set(experiment.id, experiment);
    this.observations.set(experiment.id, []);

    logger.info({
      experimentId: experiment.id,
      modelA: config.modelA,
      modelB: config.modelB,
      trafficSplit: config.trafficSplit,
    }, 'A/B test created');

    metrics.increment('ab_test_created');

    return experiment;
  }

  /**
   * Assign user to experiment variant
   */
  assignUser(userId: string, experimentId: string): 'A' | 'B' {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) throw new Error(`Experiment ${experimentId} not found`);
    if (experiment.status !== 'running') {
      // Return control variant if experiment not running
      return 'A';
    }

    // Check existing assignment
    const assignmentKey = `${userId}:${experimentId}`;
    const existing = this.assignments.get(assignmentKey);
    if (existing) {
      return existing.variant;
    }

    // Deterministic assignment based on hash
    const hash = createHash('sha256')
      .update(`${userId}:${experimentId}`)
      .digest('hex');
    const hashInt = parseInt(hash.substr(0, 8), 16);
    const variant: 'A' | 'B' = (hashInt % 100) < (experiment.trafficSplit * 100) ? 'B' : 'A';

    const assignment: ExperimentAssignment = {
      userId,
      experimentId,
      variant,
      assignedAt: new Date(),
      consistencyHash: hash,
    };

    this.assignments.set(assignmentKey, assignment);

    metrics.increment('ab_test_assignment', { variant });

    return variant;
  }

  /**
   * Record metric observation
   */
  recordObservation(observation: MetricObservation): void {
    const experiment = this.experiments.get(observation.experimentId);
    if (!experiment) return;

    const observations = this.observations.get(observation.experimentId) || [];
    observations.push(observation);
    this.observations.set(observation.experimentId, observations);

    metrics.increment('ab_test_observation');

    // Check if we should auto-complete
    this.checkAutoComplete(experiment);
  }

  /**
   * Get experiment results with statistical analysis
   */
  getResults(experimentId: string): ABTestResult {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) throw new Error(`Experiment ${experimentId} not found`);

    const observations = this.observations.get(experimentId) || [];
    
    // Filter for primary metric
    const primaryObservations = observations.filter(
      o => o.metricName === experiment.primaryMetric
    );

    const observationsA = primaryObservations.filter(o => o.variant === 'A').map(o => o.value);
    const observationsB = primaryObservations.filter(o => o.variant === 'B').map(o => o.value);

    // Calculate statistics
    const statsA = this.calculateStatistics(observationsA, experiment.confidenceLevel);
    const statsB = this.calculateStatistics(observationsB, experiment.confidenceLevel);

    // Perform t-test
    const tTestResult = this.performTTest(observationsA, observationsB);

    // Determine winner
    let winner: 'A' | 'B' | 'inconclusive' = 'inconclusive';
    if (tTestResult.isSignificant) {
      winner = statsB.mean > statsA.mean ? 'B' : 'A';
    }

    const relativeImprovement = statsA.mean !== 0
      ? ((statsB.mean - statsA.mean) / statsA.mean) * 100
      : 0;

    // Calculate statistical power
    const power = this.calculatePower(observationsA, observationsB, experiment.confidenceLevel);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      experiment,
      tTestResult,
      observationsA.length,
      observationsB.length,
      winner
    );

    return {
      experiment,
      statistics: {
        A: statsA,
        B: statsB,
      },
      comparison: {
        relativeImprovement,
        pValue: tTestResult.pValue,
        isSignificant: tTestResult.isSignificant,
        winner,
        power,
      },
      recommendations,
    };
  }

  /**
   * Pause experiment
   */
  pauseExperiment(experimentId: string): ABTest {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) throw new Error(`Experiment ${experimentId} not found`);

    experiment.status = 'paused';
    logger.info({ experimentId }, 'A/B test paused');

    return experiment;
  }

  /**
   * Resume experiment
   */
  resumeExperiment(experimentId: string): ABTest {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) throw new Error(`Experiment ${experimentId} not found`);

    experiment.status = 'running';
    logger.info({ experimentId }, 'A/B test resumed');

    return experiment;
  }

  /**
   * Complete experiment and select winner
   */
  completeExperiment(experimentId: string, winner?: 'A' | 'B' | 'inconclusive'): ABTest {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) throw new Error(`Experiment ${experimentId} not found`);

    experiment.status = 'completed';
    experiment.endTime = new Date();

    if (!winner) {
      // Auto-determine winner from results
      const results = this.getResults(experimentId);
      winner = results.comparison.winner;
    }

    experiment.winner = winner;

    // Promote winning version if B wins
    if (winner === 'B') {
      this.versionManager.promoteToProduction(experiment.modelB);
    }

    logger.info({
      experimentId,
      winner,
      duration: experiment.endTime.getTime() - experiment.startTime.getTime(),
    }, 'A/B test completed');

    metrics.increment('ab_test_completed', { winner: winner || 'inconclusive' });

    return experiment;
  }

  /**
   * Get active experiments
   */
  getActiveExperiments(): ABTest[] {
    return Array.from(this.experiments.values())
      .filter(e => e.status === 'running');
  }

  /**
   * Get experiment by ID
   */
  getExperiment(experimentId: string): ABTest | undefined {
    return this.experiments.get(experimentId);
  }

  private calculateStatistics(values: number[], confidenceLevel: number): StatisticalResult {
    const n = values.length;
    if (n === 0) {
      return {
        variant: 'A',
        sampleSize: 0,
        mean: 0,
        stdDev: 0,
        confidenceInterval: [0, 0],
      };
    }

    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Confidence interval
    const zScore = confidenceLevel === 0.95 ? 1.96 : 
                   confidenceLevel === 0.99 ? 2.576 : 1.645;
    const margin = zScore * (stdDev / Math.sqrt(n));

    return {
      variant: 'A',
      sampleSize: n,
      mean,
      stdDev,
      confidenceInterval: [mean - margin, mean + margin],
    };
  }

  private performTTest(groupA: number[], groupB: number[]): {
    pValue: number;
    isSignificant: boolean;
  } {
    if (groupA.length < 2 || groupB.length < 2) {
      return { pValue: 1, isSignificant: false };
    }

    const meanA = groupA.reduce((a, b) => a + b, 0) / groupA.length;
    const meanB = groupB.reduce((a, b) => a + b, 0) / groupB.length;

    const varA = groupA.reduce((sum, v) => sum + Math.pow(v - meanA, 2), 0) / (groupA.length - 1);
    const varB = groupB.reduce((sum, v) => sum + Math.pow(v - meanB, 2), 0) / (groupB.length - 1);

    // Pooled standard error
    const se = Math.sqrt(varA / groupA.length + varB / groupB.length);
    
    if (se === 0) {
      return { pValue: meanA === meanB ? 1 : 0, isSignificant: meanA !== meanB };
    }

    // t-statistic
    const tStat = (meanB - meanA) / se;

    // Degrees of freedom (Welch-Satterthwaite)
    const df = Math.pow(varA / groupA.length + varB / groupB.length, 2) /
      (Math.pow(varA / groupA.length, 2) / (groupA.length - 1) +
       Math.pow(varB / groupB.length, 2) / (groupB.length - 1));

    // Approximate p-value (two-tailed)
    const pValue = this.approximatePValue(Math.abs(tStat), df);
    
    return {
      pValue,
      isSignificant: pValue < 0.05,
    };
  }

  private approximatePValue(t: number, df: number): number {
    // Simplified approximation using normal distribution for large df
    if (df > 30) {
      return 2 * (1 - this.normalCDF(t));
    }
    
    // For smaller df, use a rough approximation
    return Math.min(1, Math.exp(-0.5 * t * t) * (1 + 0.1 / df));
  }

  private normalCDF(x: number): number {
    // Approximation of standard normal CDF
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1 + sign * y);
  }

  private calculatePower(groupA: number[], groupB: number[], _confidenceLevel: number): number {
    if (groupA.length < 2 || groupB.length < 2) return 0;

    const meanA = groupA.reduce((a, b) => a + b, 0) / groupA.length;
    const meanB = groupB.reduce((a, b) => a + b, 0) / groupB.length;
    const effectSize = Math.abs(meanB - meanA);

    const varA = groupA.reduce((sum, v) => sum + Math.pow(v - meanA, 2), 0) / (groupA.length - 1);
    const varB = groupB.reduce((sum, v) => sum + Math.pow(v - meanB, 2), 0) / (groupB.length - 1);
    const pooledStd = Math.sqrt((varA + varB) / 2);

    if (pooledStd === 0) return effectSize > 0 ? 1 : 0;

    const cohensD = effectSize / pooledStd;
    const avgN = (groupA.length + groupB.length) / 2;

    // Simplified power calculation
    return Math.min(1, Math.sqrt(avgN / 100) * cohensD);
  }

  private checkAutoComplete(experiment: ABTest): void {
    const observations = this.observations.get(experiment.id) || [];
    const primaryObservations = observations.filter(o => o.metricName === experiment.primaryMetric);
    
    const countA = primaryObservations.filter(o => o.variant === 'A').length;
    const countB = primaryObservations.filter(o => o.variant === 'B').length;
    
    // Check minimum sample size
    if (countA >= experiment.minimumSampleSize && countB >= experiment.minimumSampleSize) {
      // Check if we have a significant result
      const results = this.getResults(experiment.id);
      
      if (results.comparison.isSignificant && results.comparison.power > 0.8) {
        logger.info({
          experimentId: experiment.id,
          sampleSizeA: countA,
          sampleSizeB: countB,
          winner: results.comparison.winner,
        }, 'Auto-completing A/B test');
        
        this.completeExperiment(experiment.id);
      }
    }
  }

  private generateRecommendations(
    experiment: ABTest,
    tTestResult: { pValue: number; isSignificant: boolean },
    sampleSizeA: number,
    sampleSizeB: number,
    winner: 'A' | 'B' | 'inconclusive'
  ): string[] {
    const recommendations: string[] = [];

    if (!tTestResult.isSignificant) {
      recommendations.push('Results are not statistically significant. Consider running longer or increasing sample size.');
    }

    if (sampleSizeA < experiment.minimumSampleSize || sampleSizeB < experiment.minimumSampleSize) {
      recommendations.push(`Minimum sample size not reached. Need at least ${experiment.minimumSampleSize} samples per variant.`);
    }

    if (winner === 'B') {
      recommendations.push('Variant B shows significant improvement. Consider rolling out to all traffic.');
    } else if (winner === 'A') {
      recommendations.push('Control variant (A) performs better. Keep current model.');
    } else {
      recommendations.push('No clear winner. Consider testing different variants or metrics.');
    }

    return recommendations;
  }
}

export class ModelRegistry {
  private versionManager: ModelVersionManager;
  private abTestManager: ABTestManager;

  constructor() {
    this.versionManager = new ModelVersionManager();
    this.abTestManager = new ABTestManager(this.versionManager);
  }

  getVersionManager(): ModelVersionManager {
    return this.versionManager;
  }

  getABTestManager(): ABTestManager {
    return this.abTestManager;
  }

  /**
   * Get model for inference with experiment routing
   */
  getModelForInference(
    modelType: string,
    userId?: string,
    experimentId?: string
  ): { versionId: string; variant?: 'A' | 'B' } {
    // Check if there's an active experiment
    if (experimentId && userId) {
      const experiment = this.abTestManager.getExperiment(experimentId);
      if (experiment && experiment.status === 'running') {
        const variant = this.abTestManager.assignUser(userId, experimentId);
        const versionId = variant === 'A' ? experiment.modelA : experiment.modelB;
        return { versionId, variant };
      }
    }

    // Return production version
    const productionVersion = this.versionManager.getProductionVersion(modelType);
    if (!productionVersion) {
      throw new Error(`No production version found for model type: ${modelType}`);
    }

    return { versionId: productionVersion.id };
  }
}

export default { ModelVersionManager, ABTestManager, ModelRegistry };
