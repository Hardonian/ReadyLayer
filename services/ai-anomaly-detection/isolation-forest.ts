/**
 * Isolation Forest Anomaly Detection
 *
 * P0: Real Isolation Forest implementation for anomaly detection
 * Based on the algorithm by Liu, Ting, and Zhou (2008)
 *
 * Features:
 * - Binary tree-based isolation of anomalies
 * - Random feature selection and split values
 * - Anomaly score based on average path length
 * - O(n log n) training, O(log n) prediction
 * - No distance or density measures required
 */

import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';

export interface DataPoint {
  id: string;
  features: number[];
  metadata?: Record<string, unknown>;
}

export interface IsolationTree {
  root: TreeNode;
  height: number;
  numSamples: number;
}

interface TreeNode {
  isLeaf: boolean;
  left?: TreeNode;
  right?: TreeNode;
  splitFeature?: number;
  splitValue?: number;
  size?: number;
  height?: number;
}

export interface AnomalyScore {
  id: string;
  score: number; // 0-1, higher = more anomalous
  isAnomaly: boolean;
  pathLength: number;
  expectedPathLength: number;
  metadata?: Record<string, unknown>;
}

export interface IsolationForestConfig {
  numTrees?: number;
  subsampleSize?: number;
  maxTreeHeight?: number;
  anomalyThreshold?: number; // Default 0.5
  randomSeed?: number;
}

class RandomGenerator {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  // Linear congruential generator
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

export class IsolationForest {
  private trees: IsolationTree[] = [];
  private config: Required<IsolationForestConfig>;
  private random: RandomGenerator;
  private numFeatures: number = 0;
  private isTrained: boolean = false;

  constructor(config: IsolationForestConfig = {}) {
    this.config = {
      numTrees: config.numTrees || 100,
      subsampleSize: config.subsampleSize || 256,
      maxTreeHeight: config.maxTreeHeight || Math.ceil(Math.log2(config.subsampleSize || 256)),
      anomalyThreshold: config.anomalyThreshold || 0.5,
      randomSeed: config.randomSeed || Date.now(),
    };
    this.random = new RandomGenerator(this.config.randomSeed);
  }

  /**
   * Train the isolation forest on normal data
   */
  train(data: DataPoint[]): void {
    if (data.length === 0) {
      throw new Error('Cannot train on empty dataset');
    }

    this.numFeatures = data[0].features.length;
    if (this.numFeatures === 0) {
      throw new Error('Data points must have at least one feature');
    }

    // Validate all data points have same number of features
    for (const point of data) {
      if (point.features.length !== this.numFeatures) {
        throw new Error(`Data point ${point.id} has ${point.features.length} features, expected ${this.numFeatures}`);
      }
    }

    logger.info({
      numSamples: data.length,
      numFeatures: this.numFeatures,
      numTrees: this.config.numTrees,
      subsampleSize: this.config.subsampleSize,
    }, 'Training Isolation Forest');

    this.trees = [];
    const startTime = Date.now();

    // Build trees on random subsamples
    for (let i = 0; i < this.config.numTrees; i++) {
      // Create random subsample
      const subsample = this.createSubsample(data);

      // Build tree
      const tree = this.buildTree(subsample, 0);
      this.trees.push(tree);

      if ((i + 1) % 10 === 0) {
        logger.debug({ treeIndex: i + 1 }, 'Built trees');
      }
    }

    this.isTrained = true;
    const trainingTime = Date.now() - startTime;

    metrics.recordHistogram('isolation_forest_train_duration', trainingTime);
    metrics.increment('isolation_forest_trained', { num_trees: this.trees.length.toString() });

    logger.info({
      trainingTimeMs: trainingTime,
      treesBuilt: this.trees.length,
    }, 'Isolation Forest training complete');
  }

  /**
   * Predict anomaly scores for data points
   */
  predict(data: DataPoint[]): AnomalyScore[] {
    if (!this.isTrained) {
      throw new Error('Model must be trained before prediction');
    }

    const startTime = Date.now();
    const scores: AnomalyScore[] = [];

    for (const point of data) {
      if (point.features.length !== this.numFeatures) {
        logger.warn({
          pointId: point.id,
          expected: this.numFeatures,
          actual: point.features.length
        }, 'Feature dimension mismatch');
        continue;
      }

      const pathLengths: number[] = [];

      for (const tree of this.trees) {
        const pathLength = this.traverseTree(point.features, tree.root, 0);
        pathLengths.push(pathLength);
      }

      const avgPathLength = pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length;
      const expectedPathLength = this.c(this.config.subsampleSize);
      const score = Math.pow(2, -avgPathLength / expectedPathLength);

      scores.push({
        id: point.id,
        score,
        isAnomaly: score >= this.config.anomalyThreshold,
        pathLength: avgPathLength,
        expectedPathLength,
        metadata: point.metadata,
      });
    }

    const predictionTime = Date.now() - startTime;
    metrics.recordHistogram('isolation_forest_predict_duration', predictionTime);
    metrics.increment('isolation_forest_predictions', { count: scores.length.toString() });

    return scores;
  }

  /**
   * Get top N anomalies
   */
  getTopAnomalies(data: DataPoint[], n: number = 10): AnomalyScore[] {
    const scores = this.predict(data);
    return scores
      .filter(s => s.isAnomaly)
      .sort((a, b) => b.score - a.score)
      .slice(0, n);
  }

  /**
   * Get model statistics
   */
  getStats(): {
    numTrees: number;
    numFeatures: number;
    subsampleSize: number;
    maxTreeHeight: number;
    isTrained: boolean;
  } {
    return {
      numTrees: this.trees.length,
      numFeatures: this.numFeatures,
      subsampleSize: this.config.subsampleSize,
      maxTreeHeight: this.config.maxTreeHeight,
      isTrained: this.isTrained,
    };
  }

  private createSubsample(data: DataPoint[]): DataPoint[] {
    if (data.length <= this.config.subsampleSize) {
      return [...data];
    }

    const subsample: DataPoint[] = [];
    const used = new Set<number>();

    while (subsample.length < this.config.subsampleSize) {
      const index = this.random.nextInt(0, data.length - 1);
      if (!used.has(index)) {
        used.add(index);
        subsample.push(data[index]);
      }
    }

    return subsample;
  }

  private buildTree(data: DataPoint[], currentHeight: number): IsolationTree {
    // Base case: single node or max height reached
    if (data.length <= 1 || currentHeight >= this.config.maxTreeHeight) {
      return {
        root: {
          isLeaf: true,
          size: data.length,
          height: currentHeight,
        },
        height: currentHeight,
        numSamples: data.length,
      };
    }

    // Randomly select feature
    const splitFeature = this.random.nextInt(0, this.numFeatures - 1);

    // Get min and max for this feature
    const values = data.map(d => d.features[splitFeature]);
    const min = Math.min(...values);
    const max = Math.max(...values);

    // If all values are the same, create leaf
    if (min === max) {
      return {
        root: {
          isLeaf: true,
          size: data.length,
          height: currentHeight,
        },
        height: currentHeight,
        numSamples: data.length,
      };
    }

    // Random split value between min and max
    const splitValue = this.random.nextFloat(min, max);

    // Partition data
    const leftData: DataPoint[] = [];
    const rightData: DataPoint[] = [];

    for (const point of data) {
      if (point.features[splitFeature] < splitValue) {
        leftData.push(point);
      } else {
        rightData.push(point);
      }
    }

    // Handle edge case where all data goes to one side
    if (leftData.length === 0 || rightData.length === 0) {
      return {
        root: {
          isLeaf: true,
          size: data.length,
          height: currentHeight,
        },
        height: currentHeight,
        numSamples: data.length,
      };
    }

    // Recursively build subtrees
    const leftTree = this.buildTree(leftData, currentHeight + 1);
    const rightTree = this.buildTree(rightData, currentHeight + 1);

    return {
      root: {
        isLeaf: false,
        splitFeature,
        splitValue,
        left: leftTree.root,
        right: rightTree.root,
      },
      height: Math.max(leftTree.height, rightTree.height) + 1,
      numSamples: data.length,
    };
  }

  private traverseTree(features: number[], node: TreeNode, currentPathLength: number): number {
    if (node.isLeaf || !node.left || !node.right) {
      // Return path length with adjustment for unterminated paths
      return currentPathLength + this.c(node.size || 0);
    }

    const featureValue = features[node.splitFeature!];

    if (featureValue < node.splitValue!) {
      return this.traverseTree(features, node.left, currentPathLength + 1);
    } else {
      return this.traverseTree(features, node.right, currentPathLength + 1);
    }
  }

  /**
   * c(n) - average path length of unsuccessful search in BST
   */
  private c(n: number): number {
    if (n <= 1) return 0;
    if (n === 2) return 1;

    // 2H(n-1) - (2(n-1)/n)
    // where H(i) is the harmonic number
    return 2 * this.harmonicNumber(n - 1) - (2 * (n - 1) / n);
  }

  /**
   * Harmonic number H(i) = 1 + 1/2 + 1/3 + ... + 1/i
   * Approximated using ln(i) + gamma for large i
   */
  private harmonicNumber(i: number): number {
    if (i <= 0) return 0;

    // Euler-Mascheroni constant
    const gamma = 0.5772156649;

    // Use approximation for large i
    if (i > 100) {
      return Math.log(i) + gamma;
    }

    // Calculate directly for small i
    let sum = 0;
    for (let k = 1; k <= i; k++) {
      sum += 1 / k;
    }
    return sum;
  }
}

/**
 * Feature extraction utilities for converting various data types
 */
export class FeatureExtractor {
  /**
   * Extract numerical features from code metrics
   */
  static fromCodeMetrics(metrics: {
    linesOfCode: number;
    complexity: number;
    issues: number;
    testCoverage: number;
    filesChanged: number;
    reviewTime: number;
  }): number[] {
    return [
      metrics.linesOfCode,
      metrics.complexity,
      metrics.issues,
      metrics.testCoverage,
      metrics.filesChanged,
      metrics.reviewTime,
    ];
  }

  /**
   * Extract features from token usage data
   */
  static fromTokenUsage(usage: {
    totalTokens: number;
    wastePercentage: number;
    requestCount: number;
    avgTokensPerRequest: number;
    cacheHitRate: number;
  }): number[] {
    return [
      Math.log1p(usage.totalTokens), // Log scale for large numbers
      usage.wastePercentage,
      usage.requestCount,
      Math.log1p(usage.avgTokensPerRequest),
      usage.cacheHitRate,
    ];
  }

  /**
   * Extract features from violation patterns
   */
  static fromViolationPattern(pattern: {
    ruleId: string;
    count: number;
    severity: number;
    timeSpan: number;
    fileCount: number;
  }): number[] {
    // Hash ruleId to consistent number
    const ruleHash = this.hashString(pattern.ruleId);

    return [
      ruleHash,
      Math.log1p(pattern.count),
      pattern.severity,
      Math.log1p(pattern.timeSpan),
      pattern.fileCount,
    ];
  }

  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }
}

/**
 * Service wrapper for anomaly detection in ReadyLayer context
 */
export class AnomalyDetectionService {
  private forest: IsolationForest;
  private isTrained: boolean = false;

  constructor(config?: IsolationForestConfig) {
    this.forest = new IsolationForest(config);
  }

  /**
   * Train on historical review data
   */
  trainOnReviewHistory(reviews: Array<{
    id: string;
    metrics: {
      linesOfCode: number;
      complexity: number;
      issues: number;
      testCoverage: number;
      filesChanged: number;
      reviewTime: number;
    };
    metadata?: Record<string, unknown>;
  }>): void {
    const dataPoints: DataPoint[] = reviews.map(review => ({
      id: review.id,
      features: FeatureExtractor.fromCodeMetrics(review.metrics),
      metadata: review.metadata,
    }));

    this.forest.train(dataPoints);
    this.isTrained = true;
  }

  /**
   * Detect anomalies in new reviews
   */
  detectAnomalies(reviews: Array<{
    id: string;
    metrics: {
      linesOfCode: number;
      complexity: number;
      issues: number;
      testCoverage: number;
      filesChanged: number;
      reviewTime: number;
    };
    metadata?: Record<string, unknown>;
  }>): AnomalyScore[] {
    if (!this.isTrained) {
      throw new Error('Model must be trained before anomaly detection');
    }

    const dataPoints: DataPoint[] = reviews.map(review => ({
      id: review.id,
      features: FeatureExtractor.fromCodeMetrics(review.metrics),
      metadata: review.metadata,
    }));

    const scores = this.forest.predict(dataPoints);

    // Log anomalies
    const anomalies = scores.filter(s => s.isAnomaly);
    if (anomalies.length > 0) {
      logger.warn({
        count: anomalies.length,
        topScore: Math.max(...anomalies.map(a => a.score)),
      }, 'Anomalies detected');
    }

    return scores;
  }

  /**
   * Detect token usage anomalies
   */
  detectTokenAnomalies(usageData: Array<{
    id: string;
    totalTokens: number;
    wastePercentage: number;
    requestCount: number;
    avgTokensPerRequest: number;
    cacheHitRate: number;
  }>): AnomalyScore[] {
    if (!this.isTrained) {
      // Train on the data itself if not pre-trained (unsupervised)
      const trainingData = usageData.map(u => ({
        id: u.id,
        features: FeatureExtractor.fromTokenUsage(u),
      }));
      this.forest.train(trainingData);
      this.isTrained = true;
    }

    const dataPoints: DataPoint[] = usageData.map(u => ({
      id: u.id,
      features: FeatureExtractor.fromTokenUsage(u),
    }));

    return this.forest.predict(dataPoints);
  }

  getStats(): ReturnType<IsolationForest['getStats']> {
    return this.forest.getStats();
  }
}

export default { IsolationForest, FeatureExtractor, AnomalyDetectionService };
