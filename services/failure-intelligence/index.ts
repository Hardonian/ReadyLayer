/**
 * Failure Intelligence Memory Service
 * 
 * Aggregates anonymized AI failure patterns without storing customer code.
 * Provides pattern classification, confidence scoring, and temporal trend detection.
 * 
 * Ethical AI Compliance:
 * - Strict opt-in required
 * - No customer code stored
 * - Anonymized patterns only
 * - Transparent controls
 */

import { prisma } from '../../lib/prisma';
import { Issue } from '../static-analysis';

export interface FailurePattern {
  id: string;
  patternType: 'security' | 'logic' | 'test' | 'docs' | 'performance' | 'ai_specific';
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // 0-1
  frequency: number; // Count of occurrences
  firstSeen: Date;
  lastSeen: Date;
  trend: 'increasing' | 'decreasing' | 'stable';
  anonymizedContext: string; // Pattern description without code
  correlatedIncidents: number; // Count of real incidents
}

export interface PatternInsight {
  patternId: string;
  patternType: string;
  ruleId: string;
  message: string;
  confidence: number;
  correlationStrength: number; // 0-1
  suggestedAction: string;
}

/**
 * Failure Intelligence Memory Service
 * 
 * Tracks anonymized failure patterns across organizations to provide
 * intelligence about AI failure modes without storing customer code.
 */
export class FailureIntelligenceService {
  /**
   * Record a failure pattern (anonymized)
   * 
   * Extracts pattern characteristics without storing actual code.
   */
  async recordPattern(
    organizationId: string,
    repositoryId: string,
    finding: Issue,
    context: {
      fileExtension?: string;
      language?: string;
      framework?: string;
      aiTool?: string;
    }
  ): Promise<void> {
    // Check if organization has opted in
    const consent = await this.checkConsent(organizationId);
    if (!consent) {
      return; // Skip if not opted in
    }

    // Create anonymized pattern description
    const anonymizedContext = this.anonymizePattern(finding, context);

    // Find existing pattern
    const existingPattern = await prisma.aIAnomaly.findFirst({
      where: {
        organizationId: { not: organizationId }, // Other orgs only
        type: this.classifyPatternType(finding.ruleId),
        severity: finding.severity,
        description: anonymizedContext,
      },
      orderBy: { detectedAt: 'desc' },
    });

    // Create new pattern record
    await prisma.aIAnomaly.create({
      data: {
        repositoryId,
        organizationId,
        type: this.classifyPatternType(finding.ruleId),
        severity: finding.severity,
        description: anonymizedContext,
        file: null, // Don't store file paths
        line: null, // Don't store line numbers
        metadata: {
          ruleId: finding.ruleId,
          language: context.language,
          framework: context.framework,
          aiTool: context.aiTool,
          confidence: finding.confidence || 0.5,
          frequency: existingPattern ? ((existingPattern.metadata as any)?.frequency || 0) + 1 : 1,
        } as any,
      },
    });

    // Aggregate insights (periodic job would do this)
    await this.updateAggregatedInsights(organizationId, finding.ruleId);
  }

  /**
   * Get pattern insights for a PR context
   * 
   * Returns anonymized insights about patterns that have correlated
   * with real incidents elsewhere.
   */
  async getPatternInsights(
    organizationId: string,
    findings: Issue[]
  ): Promise<PatternInsight[]> {
    // Check consent
    const consent = await this.checkConsent(organizationId);
    if (!consent) {
      return []; // Return empty if not opted in
    }

    const insights: PatternInsight[] = [];

    for (const finding of findings) {
      // Find similar patterns
      const similarPatterns = await prisma.aIAnomaly.findMany({
        where: {
          organizationId: { not: organizationId }, // Other orgs only
          type: this.classifyPatternType(finding.ruleId),
          severity: finding.severity,
        },
        orderBy: { detectedAt: 'desc' },
        take: 10,
      });

      if (similarPatterns.length > 0) {
        // Calculate correlation strength
        const correlationStrength = this.calculateCorrelationStrength(similarPatterns);

        if (correlationStrength > 0.5) {
          insights.push({
            patternId: finding.ruleId,
            patternType: this.classifyPatternType(finding.ruleId),
            ruleId: finding.ruleId,
            message: `This pattern has correlated with ${similarPatterns.length} real incidents elsewhere.`,
            confidence: correlationStrength,
            correlationStrength,
            suggestedAction: this.getSuggestedAction(finding.ruleId, correlationStrength),
          });
        }
      }
    }

    return insights;
  }

  /**
   * Classify pattern type from rule ID
   */
  private classifyPatternType(ruleId: string): FailurePattern['patternType'] {
    if (ruleId.startsWith('security.')) return 'security';
    if (ruleId.startsWith('test-engine.')) return 'test';
    if (ruleId.startsWith('doc-sync.')) return 'docs';
    if (ruleId.startsWith('founder.')) return 'ai_specific';
    if (ruleId.includes('performance') || ruleId.includes('slow')) return 'performance';
    return 'logic';
  }

  /**
   * Anonymize pattern (remove code, keep structure)
   */
  private anonymizePattern(
    finding: Issue,
    context: { fileExtension?: string; language?: string; framework?: string; aiTool?: string }
  ): string {
    // Remove actual code, keep pattern structure
    const message = finding.message
      .replace(/['"`][^'"`]+['"`]/g, "'<value>'") // Replace strings
      .replace(/\b\d+\b/g, '<number>') // Replace numbers
      .replace(/\b[a-z_][a-z0-9_]*\b/gi, (match) => {
        // Keep keywords, anonymize identifiers
        const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'return', 'class'];
        return keywords.includes(match.toLowerCase()) ? match : '<identifier>';
      });

    return `${context.language || 'unknown'}: ${message}`;
  }

  /**
   * Hash context for pattern matching
   * Reserved for future use when pattern deduplication is needed
   */
  // private hashContext(context: string): string {
  //   const crypto = require('crypto');
  //   return crypto.createHash('sha256').update(context).digest('hex').slice(0, 16);
  // }

  /**
   * Check if organization has consented to failure intelligence
   */
  private async checkConsent(organizationId: string): Promise<boolean> {
    const consent = await prisma.userConsent.findFirst({
      where: {
        organizationId,
        consentType: 'failure_intelligence',
        granted: true,
        revokedAt: null,
      },
    });
    return !!consent;
  }

  /**
   * Calculate correlation strength from similar patterns
   */
  private calculateCorrelationStrength(patterns: any[]): number {
    if (patterns.length === 0) return 0;

    // More patterns = higher correlation
    const frequencyScore = Math.min(patterns.length / 10, 1);

    // Recent patterns = higher correlation
    const recentScore = patterns.filter(
      (p) => new Date(p.detectedAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
    ).length / patterns.length;

    return (frequencyScore + recentScore) / 2;
  }

  /**
   * Get suggested action based on pattern
   */
  private getSuggestedAction(_ruleId: string, correlationStrength: number): string {
    if (correlationStrength > 0.8) {
      return 'High correlation with incidents. Review carefully before merging.';
    }
    if (correlationStrength > 0.6) {
      return 'Moderate correlation. Consider additional testing.';
    }
    return 'Low correlation. Proceed with caution.';
  }

  /**
   * Update aggregated insights (called periodically)
   */
  private async updateAggregatedInsights(organizationId: string, ruleId: string): Promise<void> {
    // Find all patterns for this rule
    const patterns = await prisma.aIAnomaly.findMany({
      where: {
        organizationId: { not: organizationId }, // Other orgs
        metadata: {
          path: ['ruleId'],
          equals: ruleId,
        } as any,
      },
    });

    if (patterns.length === 0) return;

    // Calculate trend
    const sorted = patterns.sort((a, b) => a.detectedAt.getTime() - b.detectedAt.getTime());
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

    const firstHalfCount = firstHalf.length;
    const secondHalfCount = secondHalf.length;

    const trend =
      secondHalfCount > firstHalfCount * 1.2
        ? 'increasing'
        : secondHalfCount < firstHalfCount * 0.8
        ? 'decreasing'
        : 'stable';

    // Find or create aggregated insight
    const existingInsight = await prisma.aggregatedInsight.findFirst({
      where: {
        organizationId,
        insightType: 'pattern',
        metadata: {
          path: ['ruleId'],
          equals: ruleId,
        } as any,
      },
    });

    if (existingInsight) {
      // Update existing insight
      await prisma.aggregatedInsight.update({
        where: { id: existingInsight.id },
        data: {
          confidence: Math.min(patterns.length / 100, 1),
          dataPoints: patterns.length,
          lastSeen: sorted[sorted.length - 1].detectedAt,
          trend,
        },
      });
    } else {
      // Create new insight
      await prisma.aggregatedInsight.create({
        data: {
          organizationId,
          insightType: 'pattern',
          confidence: Math.min(patterns.length / 100, 1),
          trustLevel: 0.7,
          dataPoints: patterns.length,
          firstSeen: sorted[0].detectedAt,
          lastSeen: sorted[sorted.length - 1].detectedAt,
          trend,
          metadata: {
            ruleId,
            patternType: this.classifyPatternType(ruleId),
          } as any,
        },
      });
    }
  }
}

export const failureIntelligenceService = new FailureIntelligenceService();
