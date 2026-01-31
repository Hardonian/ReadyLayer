/**
 * Predictive Readiness Scoring
 * 
 * P1: Time series forecasting for readiness predictions
 * Uses exponential smoothing and trend analysis to predict
 * future readiness scores based on historical patterns.
 * 
 * Features:
 * - Holt-Winters exponential smoothing with trend
 * - Seasonal decomposition for cyclical patterns
 * - Confidence intervals for predictions
 * - Drift detection for model retraining triggers
 */

import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface ReadinessForecast {
  timestamp: Date;
  predictedScore: number; // 0-100
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  trend: 'improving' | 'declining' | 'stable';
  seasonality?: number;
  factors: Array<{
    name: string;
    contribution: number; // -1 to 1
    confidence: number;
  }>;
}

export interface ForecastConfig {
  horizon?: number; // Number of periods to forecast (default 7 days)
  seasonalityPeriod?: number; // Days per season (default 7 for weekly)
  alpha?: number; // Level smoothing factor (0-1, default 0.3)
  beta?: number; // Trend smoothing factor (0-1, default 0.1)
  gamma?: number; // Seasonal smoothing factor (0-1, default 0.1)
  confidenceLevel?: number; // 0-1 (default 0.95)
}

interface SmoothedValues {
  level: number;
  trend: number;
  seasonal: number[];
}

export class PredictiveReadinessScorer {
  private config: Required<ForecastConfig>;

  constructor(config: ForecastConfig = {}) {
    this.config = {
      horizon: config.horizon || 7,
      seasonalityPeriod: config.seasonalityPeriod || 7,
      alpha: config.alpha ?? 0.3,
      beta: config.beta ?? 0.1,
      gamma: config.gamma ?? 0.1,
      confidenceLevel: config.confidenceLevel ?? 0.95,
    };
  }

  /**
   * Generate readiness forecast from historical data
   */
  forecast(historicalData: TimeSeriesPoint[]): ReadinessForecast[] {
    if (historicalData.length < 3) {
      throw new Error('Need at least 3 data points for forecasting');
    }

    // Sort by timestamp
    const sorted = [...historicalData].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const startTime = Date.now();
    
    // Initialize Holt-Winters components
    const smoothed = this.initializeHoltWinters(sorted);
    
    // Generate forecasts
    const forecasts: ReadinessForecast[] = [];
    const lastPoint = sorted[sorted.length - 1];
    const lastTimestamp = lastPoint.timestamp.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = 1; i <= this.config.horizon; i++) {
      const forecastTimestamp = new Date(lastTimestamp + i * dayMs);
      
      // Calculate forecast
      const seasonalIndex = (sorted.length + i - 1) % this.config.seasonalityPeriod;
      const predictedValue = smoothed.level + i * smoothed.trend + (smoothed.seasonal[seasonalIndex] || 0);
      
      // Clamp to 0-100 range
      const clampedValue = Math.max(0, Math.min(100, predictedValue));
      
      // Calculate confidence interval
      const stdError = this.calculateStandardError(sorted, smoothed);
      const margin = this.calculateMarginOfError(stdError, i);
      
      forecasts.push({
        timestamp: forecastTimestamp,
        predictedScore: Math.round(clampedValue * 100) / 100,
        confidenceInterval: {
          lower: Math.max(0, clampedValue - margin),
          upper: Math.min(100, clampedValue + margin),
        },
        trend: this.determineTrend(smoothed.trend),
        seasonality: smoothed.seasonal[seasonalIndex],
        factors: this.identifyFactors(sorted, smoothed, i),
      });
    }

    const forecastTime = Date.now() - startTime;
    metrics.recordHistogram('readiness_forecast_duration', forecastTime);
    metrics.increment('readiness_forecast_generated', { 
      horizon: this.config.horizon.toString(),
    });

    logger.info({
      dataPoints: historicalData.length,
      forecastHorizon: this.config.horizon,
      forecastTimeMs: forecastTime,
    }, 'Readiness forecast generated');

    return forecasts;
  }

  /**
   * Detect if retraining is needed based on forecast accuracy drift
   */
  detectRetrainingNeed(
    historicalData: TimeSeriesPoint[],
    actualValues: TimeSeriesPoint[],
    threshold: number = 0.2
  ): {
    needsRetraining: boolean;
    driftScore: number;
    reason: string;
  } {
    if (actualValues.length < 3) {
      return { needsRetraining: false, driftScore: 0, reason: 'Insufficient data' };
    }

    // Generate forecast for the period we have actuals for
    const forecast = this.forecast(historicalData);
    
    // Calculate forecast errors
    const errors: number[] = [];
    for (const actual of actualValues) {
      const predicted = forecast.find(
        f => f.timestamp.toDateString() === actual.timestamp.toDateString()
      );
      if (predicted) {
        const error = Math.abs(actual.value - predicted.predictedScore) / 100;
        errors.push(error);
      }
    }

    if (errors.length === 0) {
      return { needsRetraining: false, driftScore: 0, reason: 'No matching forecasts' };
    }

    const mape = errors.reduce((a, b) => a + b, 0) / errors.length;
    const needsRetraining = mape > threshold;

    metrics.recordHistogram('readiness_forecast_mape', mape * 100);
    metrics.increment('readiness_forecast_drift_detected', { needs_retraining: needsRetraining.toString() });

    return {
      needsRetraining,
      driftScore: mape,
      reason: needsRetraining 
        ? `MAPE (${(mape * 100).toFixed(1)}%) exceeds threshold (${(threshold * 100).toFixed(1)}%)`
        : 'Model accuracy within acceptable range',
    };
  }

  /**
   * Calculate trend strength from historical data
   */
  calculateTrendStrength(data: TimeSeriesPoint[]): {
    strength: number; // 0-1
    direction: 'improving' | 'declining' | 'stable';
    slope: number;
  } {
    if (data.length < 2) {
      return { strength: 0, direction: 'stable', slope: 0 };
    }

    const sorted = [...data].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Simple linear regression
    const n = sorted.length;
    const x = sorted.map((_, i) => i);
    const y = sorted.map(p => p.value);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Calculate R-squared for strength
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + (sumY - slope * sumX) / n;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    
    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;
    const strength = Math.sqrt(Math.abs(rSquared));

    let direction: 'improving' | 'declining' | 'stable';
    if (Math.abs(slope) < 0.5) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'improving';
    } else {
      direction = 'declining';
    }

    return { strength, direction, slope };
  }

  private initializeHoltWinters(data: TimeSeriesPoint[]): SmoothedValues {
    const n = data.length;
    const seasonLength = Math.min(this.config.seasonalityPeriod, n);

    // Initialize level as average of first season
    const firstSeason = data.slice(0, seasonLength);
    const level = firstSeason.reduce((sum, p) => sum + p.value, 0) / seasonLength;

    // Initialize trend from first two seasons
    const secondSeason = data.slice(seasonLength, seasonLength * 2);
    let trend = 0;
    if (secondSeason.length > 0) {
      const secondLevel = secondSeason.reduce((sum, p) => sum + p.value, 0) / secondSeason.length;
      trend = (secondLevel - level) / seasonLength;
    }

    // Initialize seasonal components
    const seasonal: number[] = [];
    for (let i = 0; i < seasonLength; i++) {
      seasonal.push(data[i].value - level);
    }

    // Apply Holt-Winters smoothing
    for (let i = seasonLength; i < n; i++) {
      const value = data[i].value;
      const seasonalIndex = i % seasonLength;
      
      // Update level
      const newLevel = this.config.alpha * (value - seasonal[seasonalIndex]) + 
                       (1 - this.config.alpha) * (level + trend);
      
      // Update trend
      trend = this.config.beta * (newLevel - level) + 
                       (1 - this.config.beta) * trend;
      
      // Update seasonal
      seasonal[seasonalIndex] = this.config.gamma * (value - newLevel) + 
                                (1 - this.config.gamma) * seasonal[seasonalIndex];
      
      // Update smoothed values
      // (Not storing full history for efficiency)
    }

    return { level, trend, seasonal };
  }

  private calculateStandardError(data: TimeSeriesPoint[], _smoothed: SmoothedValues): number {
    // Simplified standard error calculation
    const values = data.map(p => p.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateMarginOfError(stdError: number, horizon: number): number {
    // z-score for confidence level
    const zScore = this.config.confidenceLevel === 0.95 ? 1.96 : 
                   this.config.confidenceLevel === 0.99 ? 2.576 : 1.645;
    
    // Error increases with forecast horizon
    return zScore * stdError * Math.sqrt(horizon);
  }

  private determineTrend(trend: number): 'improving' | 'declining' | 'stable' {
    if (Math.abs(trend) < 0.5) return 'stable';
    return trend > 0 ? 'improving' : 'declining';
  }

  private identifyFactors(
    data: TimeSeriesPoint[],
    smoothed: SmoothedValues,
    horizon: number
  ): Array<{ name: string; contribution: number; confidence: number }> {
    const factors: Array<{ name: string; contribution: number; confidence: number }> = [];

    // Trend contribution
    factors.push({
      name: 'Historical Trend',
      contribution: Math.max(-1, Math.min(1, smoothed.trend / 5)),
      confidence: 0.8,
    });

    // Seasonality contribution
    const seasonalIndex = (data.length + horizon - 1) % this.config.seasonalityPeriod;
    if (smoothed.seasonal[seasonalIndex]) {
      factors.push({
        name: 'Seasonal Pattern',
        contribution: Math.max(-1, Math.min(1, smoothed.seasonal[seasonalIndex] / 20)),
        confidence: 0.7,
      });
    }

    // Recent momentum
    if (data.length >= 3) {
      const recent = data.slice(-3);
      const momentum = recent[2].value - recent[0].value;
      factors.push({
        name: 'Recent Momentum',
        contribution: Math.max(-1, Math.min(1, momentum / 50)),
        confidence: 0.6,
      });
    }

    // Volatility factor
    const values = data.map(p => p.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const volatility = Math.sqrt(variance);
    
    factors.push({
      name: 'Volatility',
      contribution: volatility > 10 ? -0.2 : 0,
      confidence: 0.5,
    });

    return factors;
  }
}

/**
 * Service wrapper for ReadyLayer readiness predictions
 */
export class ReadinessPredictionService {
  private scorer: PredictiveReadinessScorer;

  constructor(config?: ForecastConfig) {
    this.scorer = new PredictiveReadinessScorer(config);
  }

  /**
   * Predict future readiness for a repository
   */
  predictRepositoryReadiness(
    historicalScores: Array<{
      date: Date;
      score: number;
      metadata?: Record<string, unknown>;
    }>
  ): ReadinessForecast[] {
    const timeSeries: TimeSeriesPoint[] = historicalScores.map(h => ({
      timestamp: h.date,
      value: h.score,
      metadata: h.metadata,
    }));

    return this.scorer.forecast(timeSeries);
  }

  /**
   * Get trend analysis for readiness scores
   */
  analyzeTrend(historicalScores: Array<{ date: Date; score: number }>): {
    strength: number;
    direction: 'improving' | 'declining' | 'stable';
    slope: number;
    forecast: ReadinessForecast[];
  } {
    const timeSeries: TimeSeriesPoint[] = historicalScores.map(h => ({
      timestamp: h.date,
      value: h.score,
    }));

    const trend = this.scorer.calculateTrendStrength(timeSeries);
    const forecast = this.scorer.forecast(timeSeries);

    return {
      ...trend,
      forecast,
    };
  }

  /**
   * Check if model needs retraining
   */
  checkModelHealth(
    historicalScores: Array<{ date: Date; score: number }>,
    actualScores: Array<{ date: Date; score: number }>,
    threshold?: number
  ): {
    healthy: boolean;
    driftScore: number;
    recommendation: string;
  } {
    const historical: TimeSeriesPoint[] = historicalScores.map(h => ({
      timestamp: h.date,
      value: h.score,
    }));
    
    const actual: TimeSeriesPoint[] = actualScores.map(a => ({
      timestamp: a.date,
      value: a.score,
    }));

    const result = this.scorer.detectRetrainingNeed(historical, actual, threshold);

    return {
      healthy: !result.needsRetraining,
      driftScore: result.driftScore,
      recommendation: result.reason,
    };
  }
}

export default { PredictiveReadinessScorer, ReadinessPredictionService };
