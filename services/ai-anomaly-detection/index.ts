/**
 * AI Anomaly Detection Service
 * 
 * Detects AI anomalies: drift, context token waste, repeated mistakes
 * Provides optimization suggestions for system prompts and fine-tuning
 * Tailored to developer technical ability and stack
 */

import { prisma } from '../../lib/prisma';
import { selfLearningService } from '../self-learning';
import { predictiveDetectionService } from '../predictive-detection';

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  tokenWaste: TokenWasteAnalysis;
  repeatedMistakes: RepeatedMistake[];
  suggestions: OptimizationSuggestion[];
  predictiveAlerts?: unknown[];
  aggregatedInsights?: unknown[];
  summary: {
    totalAnomalies: number;
    totalTokenWaste: number;
    repeatedMistakeCount: number;
    suggestionCount: number;
    predictiveAlertsCount?: number;
    insightsCount?: number;
  };
}

export interface Anomaly {
  type: 'drift' | 'context_slip' | 'hallucination' | 'token_waste' | 'repeated_mistake';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  file?: string;
  line?: number;
  detectedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface TokenWasteAnalysis {
  totalTokensUsed: number;
  contextTokens: number;
  outputTokens: number;
  wastePercentage: number;
  wasteSources: Array<{
    source: string;
    tokens: number;
    percentage: number;
    suggestion: string;
  }>;
  trends: Array<{
    date: Date;
    tokens: number;
    wastePercentage: number;
  }>;
}

export interface RepeatedMistake {
  ruleId: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  files: string[];
  pattern: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface OptimizationSuggestion {
  id: string;
  type: 'system_prompt' | 'fine_tuning' | 'context_optimization' | 'model_selection';
  difficulty: 'easy' | 'intermediate' | 'advanced';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  stack?: string[]; // e.g., ['react', 'typescript', 'node']
  llmAccess?: string[]; // e.g., ['openai', 'anthropic']
  codeExample?: string;
  steps: string[];
  estimatedSavings?: {
    tokens?: number;
    cost?: number;
    time?: string;
  };
}

export interface DeveloperProfile {
  technicalLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  stack: string[]; // e.g., ['react', 'typescript', 'node', 'python']
  llmAccess: string[]; // e.g., ['openai', 'anthropic', 'self-hosted']
  preferredModel?: string;
}

export class AIAnomalyDetectionService {
  /**
   * Analyze repository for AI anomalies
   */
  async analyzeRepository(
    repositoryId: string,
    organizationId: string,
    developerProfile?: DeveloperProfile
  ): Promise<AnomalyDetectionResult> {
    // Get recent reviews and violations
    const [reviews, violations, costTracking] = await Promise.all([
      prisma.review.findMany({
        where: { repositoryId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          repositoryId: true,
          createdAt: true,
          prNumber: true,
          summary: true,
          isBlocked: true,
          evidenceBundle: true,
        },
      }),
      prisma.violation.findMany({
        where: { repositoryId },
        orderBy: { detectedAt: 'desc' },
        take: 100,
      }),
      prisma.costTracking.findMany({
        where: {
          organizationId,
          service: 'llm',
          date: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    // Detect anomalies - map reviews to expected format
    const anomalies = await this.detectAnomalies(
      reviews.map(r => ({ id: r.id, createdAt: r.createdAt, summary: r.summary, isBlocked: r.isBlocked })),
      violations
    );

    // Analyze token waste
    const tokenWaste = await this.analyzeTokenWaste(costTracking, reviews);

    // Detect repeated mistakes
    const repeatedMistakes = await this.detectRepeatedMistakes(violations);

    // Generate optimization suggestions
    const suggestions = await this.generateSuggestions(
      anomalies,
      tokenWaste,
      repeatedMistakes,
      developerProfile || this.inferDeveloperProfile(reviews, violations)
    );

    // Get predictive alerts with confidence scores
    let predictiveAlerts: any[] = [];
    try {
      predictiveAlerts = await predictiveDetectionService.predictIssues({
        repositoryId,
        organizationId,
        recentActivity: reviews.map((r) => ({
          type: 'review',
          timestamp: r.createdAt,
          metadata: { prNumber: r.prNumber, summary: r.summary },
        })),
      });
    } catch (error) {
      // Don't fail if predictive detection fails
      console.error('Predictive detection failed:', error);
    }

    // Get aggregated insights from self-learning
    let aggregatedInsights: any[] = [];
    try {
      aggregatedInsights = await selfLearningService.generateInsights(
        organizationId
      );
    } catch (error) {
      console.error('Failed to generate insights:', error);
    }

    return {
      anomalies,
      tokenWaste,
      repeatedMistakes,
      suggestions,
      predictiveAlerts,
      aggregatedInsights,
      summary: {
        totalAnomalies: anomalies.length,
        totalTokenWaste: tokenWaste.totalTokensUsed,
        repeatedMistakeCount: repeatedMistakes.length,
        suggestionCount: suggestions.length,
        predictiveAlertsCount: predictiveAlerts.length,
        insightsCount: aggregatedInsights.length,
      },
    };
  }

  /**
   * Detect various types of anomalies
   */
  private async detectAnomalies(
    reviews: Array<{ id: string; createdAt: Date; summary: any; isBlocked: boolean }>,
    violations: Array<{ ruleId: string; detectedAt: Date; file: string; severity: string }>
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // 1. Detect drift (code-doc mismatches) - need repositoryId from context
    // For now, query all docs with drift detected
    const docs = await prisma.doc.findMany({
      where: {
        driftDetected: true,
      },
      take: 10,
    });

    for (const doc of docs) {
      anomalies.push({
        type: 'drift',
        severity: 'high',
        description: `Documentation drift detected: ${doc.format} spec is out of sync with code`,
        detectedAt: doc.updatedAt,
        metadata: { docId: doc.id, format: doc.format },
      });
    }

    // 2. Detect context slips (repeated similar violations)
    const contextSlipPatterns = this.detectContextSlipPatterns(violations);
    anomalies.push(...contextSlipPatterns);

    // 3. Detect hallucinations (unusual patterns in violations)
    const hallucinations = this.detectHallucinations(violations);
    anomalies.push(...hallucinations);

    // 4. Detect token waste from reviews
    const tokenWasteAnomalies = this.detectTokenWasteAnomalies(reviews);
    anomalies.push(...tokenWasteAnomalies);

    return anomalies;
  }

  /**
   * Detect context slip patterns
   */
  private detectContextSlipPatterns(
    violations: Array<{ ruleId: string; detectedAt: Date; file: string; severity: string }>
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const ruleGroups = new Map<string, typeof violations>();

    // Group violations by rule
    for (const violation of violations) {
      if (!ruleGroups.has(violation.ruleId)) {
        ruleGroups.set(violation.ruleId, []);
      }
      ruleGroups.get(violation.ruleId)!.push(violation);
    }

    // Detect patterns where same rule fires frequently
    for (const [ruleId, ruleViolations] of ruleGroups.entries()) {
      if (ruleViolations.length >= 5) {
        const timeSpan = ruleViolations[0].detectedAt.getTime() - 
                         ruleViolations[ruleViolations.length - 1].detectedAt.getTime();
        const days = timeSpan / (1000 * 60 * 60 * 24);
        
        if (days < 7 && ruleViolations.length >= 5) {
          anomalies.push({
            type: 'context_slip',
            severity: 'medium',
            description: `Context slip detected: ${ruleId} triggered ${ruleViolations.length} times in ${Math.round(days)} days`,
            detectedAt: ruleViolations[0].detectedAt,
            metadata: { ruleId, count: ruleViolations.length, timeSpan: days },
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Detect hallucinations (unusual patterns)
   */
  private detectHallucinations(
    violations: Array<{ ruleId: string; detectedAt: Date; file: string; severity: string }>
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Detect unusual file patterns (many violations in same file)
    const fileGroups = new Map<string, typeof violations>();
    for (const violation of violations) {
      if (!fileGroups.has(violation.file)) {
        fileGroups.set(violation.file, []);
      }
      fileGroups.get(violation.file)!.push(violation);
    }

    for (const [file, fileViolations] of fileGroups.entries()) {
      if (fileViolations.length >= 10) {
        anomalies.push({
          type: 'hallucination',
          severity: 'high',
          description: `Potential hallucination: ${fileViolations.length} violations in ${file}`,
          file,
          detectedAt: fileViolations[0].detectedAt,
          metadata: { file, violationCount: fileViolations.length },
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect token waste anomalies
   */
  private detectTokenWasteAnomalies(
    reviews: Array<{ id: string; createdAt: Date; summary: any }>
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Analyze review patterns for token waste indicators
    const largeReviews = reviews.filter(r => {
      const total = r.summary?.total || 0;
      return total > 50; // Many issues might indicate inefficient prompting
    });

    for (const review of largeReviews) {
      anomalies.push({
        type: 'token_waste',
        severity: 'medium',
        description: `Large review detected: ${review.summary?.total || 0} issues found - may indicate inefficient prompting`,
        detectedAt: review.createdAt,
        metadata: { reviewId: review.id, issueCount: review.summary?.total },
      });
    }

    return anomalies;
  }

  /**
   * Analyze token waste
   */
  private async analyzeTokenWaste(
    costTracking: Array<{ date: Date; units: number; metadata: any }>,
    reviews: Array<{ id: string; createdAt: Date }>
  ): Promise<TokenWasteAnalysis> {
    const totalTokensUsed = costTracking.reduce((sum, ct) => sum + ct.units, 0);
    
    // Estimate context vs output tokens (rough approximation)
    const contextTokens = Math.floor(totalTokensUsed * 0.7); // Assume 70% context
    const outputTokens = Math.floor(totalTokensUsed * 0.3); // Assume 30% output

    // Identify waste sources
    const wasteSources: TokenWasteAnalysis['wasteSources'] = [];

    // Check for excessive context
    if (contextTokens > 100000) {
      wasteSources.push({
        source: 'Excessive context in prompts',
        tokens: Math.floor(contextTokens * 0.2), // Estimate 20% waste
        percentage: 20,
        suggestion: 'Consider using RAG or chunking to reduce context size',
      });
    }

    // Check for repeated patterns
    if (reviews.length > 0) {
      const avgTokensPerReview = totalTokensUsed / reviews.length;
      if (avgTokensPerReview > 50000) {
        wasteSources.push({
          source: 'Large prompts per review',
          tokens: Math.floor(avgTokensPerReview * 0.3 * reviews.length),
          percentage: 30,
          suggestion: 'Break down reviews into smaller, focused prompts',
        });
      }
    }

    const wastePercentage = wasteSources.reduce((sum, ws) => sum + ws.percentage, 0) / Math.max(wasteSources.length, 1);

    // Build trends
    const trends = costTracking.map(ct => ({
      date: ct.date,
      tokens: ct.units,
      wastePercentage: wastePercentage, // Simplified
    }));

    return {
      totalTokensUsed,
      contextTokens,
      outputTokens,
      wastePercentage,
      wasteSources,
      trends,
    };
  }

  /**
   * Detect repeated mistakes
   */
  private async detectRepeatedMistakes(
    violations: Array<{ ruleId: string; detectedAt: Date; file: string; severity: string; message: string }>
  ): Promise<RepeatedMistake[]> {
    const mistakes: RepeatedMistake[] = [];
    const ruleGroups = new Map<string, typeof violations>();

    // Group by rule
    for (const violation of violations) {
      if (!ruleGroups.has(violation.ruleId)) {
        ruleGroups.set(violation.ruleId, []);
      }
      ruleGroups.get(violation.ruleId)!.push(violation);
    }

    // Find repeated patterns
    for (const [ruleId, ruleViolations] of ruleGroups.entries()) {
      if (ruleViolations.length >= 3) {
        const files = [...new Set(ruleViolations.map(v => v.file))];
        const severity = ruleViolations[0].severity as RepeatedMistake['severity'];
        
        mistakes.push({
          ruleId,
          count: ruleViolations.length,
          firstSeen: ruleViolations[ruleViolations.length - 1].detectedAt,
          lastSeen: ruleViolations[0].detectedAt,
          files,
          pattern: ruleViolations[0].message,
          suggestion: this.generateMistakeSuggestion(ruleId, ruleViolations.length),
          severity,
        });
      }
    }

    return mistakes.sort((a, b) => b.count - a.count);
  }

  /**
   * Generate suggestion for repeated mistake
   */
  private generateMistakeSuggestion(ruleId: string, count: number): string {
    if (ruleId.includes('sql-injection')) {
      return `This SQL injection pattern has occurred ${count} times. Consider using parameterized queries consistently.`;
    }
    if (ruleId.includes('type-erosion')) {
      return `Type safety issues detected ${count} times. Add stricter TypeScript configuration.`;
    }
    if (ruleId.includes('error-handling')) {
      return `Error handling violations found ${count} times. Establish error handling patterns.`;
    }
    return `This pattern has occurred ${count} times. Consider adding a linting rule or code review checklist item.`;
  }

  /**
   * Generate optimization suggestions
   */
  private async generateSuggestions(
    _anomalies: Anomaly[],
    tokenWaste: TokenWasteAnalysis,
    repeatedMistakes: RepeatedMistake[],
    developerProfile: DeveloperProfile
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    // 1. System prompt suggestions
    if (repeatedMistakes.length > 0) {
      suggestions.push(...this.generateSystemPromptSuggestions(repeatedMistakes, developerProfile));
    }

    // 2. Token waste suggestions
    if (tokenWaste.wastePercentage > 20) {
      suggestions.push(...this.generateTokenWasteSuggestions(tokenWaste, developerProfile));
    }

    // 3. Fine-tuning suggestions
    if (repeatedMistakes.length >= 5) {
      suggestions.push(...this.generateFineTuningSuggestions(repeatedMistakes, developerProfile));
    }

    // 4. Context optimization suggestions
    if (tokenWaste.contextTokens > 100000) {
      suggestions.push(...this.generateContextOptimizationSuggestions(tokenWaste, developerProfile));
    }

    return suggestions;
  }

  /**
   * Generate system prompt suggestions
   */
  private generateSystemPromptSuggestions(
    mistakes: RepeatedMistake[],
    profile: DeveloperProfile
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Easy: Add explicit instructions
    suggestions.push({
      id: 'system-prompt-easy-1',
      type: 'system_prompt',
      difficulty: 'easy',
      title: 'Add Explicit Rule Instructions',
      description: `Add explicit instructions to your system prompt to avoid ${mistakes[0]?.ruleId || 'common mistakes'}`,
      impact: 'medium',
      effort: 'low',
      stack: profile.stack,
      llmAccess: profile.llmAccess,
      codeExample: `// Add to your system prompt:
You must:
- Always use parameterized queries for database operations
- Include proper error handling in all async functions
- Maintain type safety (avoid 'any' types)`,
      steps: [
        'Identify your current system prompt location',
        'Add explicit rules based on repeated mistakes',
        'Test with a few examples',
        'Monitor for improvement',
      ],
      estimatedSavings: {
        tokens: 1000,
        cost: 0.05,
        time: '1 hour',
      },
    });

    // Intermediate: Structured prompt template
    if (profile.technicalLevel !== 'beginner') {
      suggestions.push({
        id: 'system-prompt-intermediate-1',
        type: 'system_prompt',
        difficulty: 'intermediate',
        title: 'Use Structured Prompt Template',
        description: 'Create a structured prompt template with sections for context, rules, and examples',
        impact: 'high',
        effort: 'medium',
        stack: profile.stack,
        llmAccess: profile.llmAccess,
        codeExample: `const systemPrompt = \`
# Code Review Guidelines

## Context
{context}

## Rules
${mistakes.slice(0, 5).map(m => `- ${m.ruleId}: ${m.suggestion}`).join('\\n')}

## Examples
{examples}
\`;`,
        steps: [
          'Create a prompt template structure',
          'Populate with your specific rules',
          'Add examples of correct patterns',
          'Integrate into your review workflow',
        ],
        estimatedSavings: {
          tokens: 5000,
          cost: 0.25,
          time: '4 hours',
        },
      });
    }

    // Advanced: Dynamic prompt generation
    if (profile.technicalLevel === 'advanced' || profile.technicalLevel === 'expert') {
      suggestions.push({
        id: 'system-prompt-advanced-1',
        type: 'system_prompt',
        difficulty: 'advanced',
        title: 'Dynamic Prompt Generation with RAG',
        description: 'Use RAG to dynamically include relevant examples and rules based on code context',
        impact: 'high',
        effort: 'high',
        stack: profile.stack,
        llmAccess: profile.llmAccess,
        codeExample: `// Use RAG to fetch relevant examples
const relevantExamples = await queryRAG({
  query: codeContext,
  topK: 5,
  filters: { type: 'correct_pattern' }
});

const prompt = buildPrompt({
  code: codeContext,
  rules: getRulesForStack(stack),
  examples: relevantExamples,
});`,
        steps: [
          'Set up RAG system for code examples',
          'Create prompt builder function',
          'Integrate with review service',
          'Monitor and refine',
        ],
        estimatedSavings: {
          tokens: 15000,
          cost: 0.75,
          time: '2 days',
        },
      });
    }

    return suggestions;
  }

  /**
   * Generate token waste suggestions
   */
  private generateTokenWasteSuggestions(
    tokenWaste: TokenWasteAnalysis,
    profile: DeveloperProfile
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Easy: Reduce context size
    suggestions.push({
      id: 'token-waste-easy-1',
      type: 'context_optimization',
      difficulty: 'easy',
      title: 'Reduce Context Window Size',
      description: `You're using ${tokenWaste.contextTokens.toLocaleString()} context tokens. Reduce by focusing on relevant code only.`,
      impact: 'medium',
      effort: 'low',
      stack: profile.stack,
      llmAccess: profile.llmAccess,
      steps: [
        'Identify which files are included in context',
        'Remove unrelated files from prompts',
        'Use file-level filtering',
        'Monitor token usage',
      ],
      estimatedSavings: {
        tokens: Math.floor(tokenWaste.contextTokens * 0.2),
        cost: Math.floor(tokenWaste.contextTokens * 0.2) * 0.00001,
      },
    });

    // Intermediate: Implement chunking
    if (profile.technicalLevel !== 'beginner') {
      suggestions.push({
        id: 'token-waste-intermediate-1',
        type: 'context_optimization',
        difficulty: 'intermediate',
        title: 'Implement Code Chunking',
        description: 'Break large code reviews into smaller, focused chunks',
        impact: 'high',
        effort: 'medium',
        stack: profile.stack,
        llmAccess: profile.llmAccess,
        codeExample: `// Chunk files by functionality
const chunks = chunkFiles(files, {
  maxTokens: 10000,
  strategy: 'by_functionality'
});

for (const chunk of chunks) {
  await reviewChunk(chunk);
}`,
        steps: [
          'Implement chunking logic',
          'Group related files together',
          'Review chunks independently',
          'Aggregate results',
        ],
        estimatedSavings: {
          tokens: Math.floor(tokenWaste.totalTokensUsed * 0.3),
          cost: Math.floor(tokenWaste.totalTokensUsed * 0.3) * 0.00001,
        },
      });
    }

    return suggestions;
  }

  /**
   * Generate fine-tuning suggestions
   */
  private generateFineTuningSuggestions(
    mistakes: RepeatedMistake[],
    profile: DeveloperProfile
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Only suggest if they have OpenAI access
    if (!profile.llmAccess.includes('openai') && !profile.llmAccess.includes('anthropic')) {
      return suggestions;
    }

    // Intermediate: Fine-tune for specific patterns
    if (profile.technicalLevel !== 'beginner') {
      suggestions.push({
        id: 'fine-tuning-intermediate-1',
        type: 'fine_tuning',
        difficulty: 'intermediate',
        title: 'Fine-tune Model for Your Codebase Patterns',
        description: `Fine-tune a model to recognize and avoid ${mistakes.length} repeated mistake patterns`,
        impact: 'high',
        effort: 'high',
        stack: profile.stack,
        llmAccess: profile.llmAccess,
        codeExample: `// Prepare training data from mistakes
const trainingData = mistakes.map(m => ({
  input: m.pattern,
  output: generateCorrectPattern(m),
}));

// Fine-tune with OpenAI
const fineTunedModel = await openai.fineTuning.jobs.create({
  training_file: trainingDataFile,
  model: 'gpt-3.5-turbo',
});`,
        steps: [
          'Collect examples of mistakes and corrections',
          'Prepare training dataset',
          'Fine-tune model (OpenAI/Anthropic)',
          'Test fine-tuned model',
          'Deploy and monitor',
        ],
        estimatedSavings: {
          tokens: 20000,
          cost: 1.0,
          time: '1 week',
        },
      });
    }

    // Advanced: Custom fine-tuning pipeline
    if (profile.technicalLevel === 'expert') {
      suggestions.push({
        id: 'fine-tuning-advanced-1',
        type: 'fine_tuning',
        difficulty: 'advanced',
        title: 'Build Continuous Fine-tuning Pipeline',
        description: 'Set up automated fine-tuning pipeline that learns from your codebase patterns',
        impact: 'high',
        effort: 'high',
        stack: profile.stack,
        llmAccess: profile.llmAccess,
        codeExample: `// Automated fine-tuning pipeline
async function continuousFineTuning() {
  const mistakes = await getRecentMistakes();
  const corrections = await generateCorrections(mistakes);
  
  if (mistakes.length > threshold) {
    await fineTuneModel({
      data: prepareTrainingData(mistakes, corrections),
      model: currentModel,
    });
  }
}`,
        steps: [
          'Set up data collection pipeline',
          'Create training data generator',
          'Build fine-tuning automation',
          'Set up monitoring and evaluation',
          'Deploy continuous pipeline',
        ],
        estimatedSavings: {
          tokens: 50000,
          cost: 2.5,
          time: '2 weeks',
        },
      });
    }

    return suggestions;
  }

  /**
   * Generate context optimization suggestions
   */
  private generateContextOptimizationSuggestions(
    tokenWaste: TokenWasteAnalysis,
    profile: DeveloperProfile
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Intermediate: Use RAG for context
    if (profile.technicalLevel !== 'beginner') {
      suggestions.push({
        id: 'context-opt-intermediate-1',
        type: 'context_optimization',
        difficulty: 'intermediate',
        title: 'Implement RAG for Context Retrieval',
        description: 'Use Retrieval-Augmented Generation to fetch only relevant context',
        impact: 'high',
        effort: 'medium',
        stack: profile.stack,
        llmAccess: profile.llmAccess,
        steps: [
          'Set up vector database',
          'Embed codebase into vectors',
          'Query relevant context for each review',
          'Replace full context with retrieved context',
        ],
        estimatedSavings: {
          tokens: Math.floor(tokenWaste.contextTokens * 0.5),
          cost: Math.floor(tokenWaste.contextTokens * 0.5) * 0.00001,
        },
      });
    }

    return suggestions;
  }

  /**
   * Infer developer profile from codebase patterns
   */
  private inferDeveloperProfile(
    _reviews: Array<{ id: string }>,
    violations: Array<{ ruleId: string; severity: string }>
  ): DeveloperProfile {
    // Infer technical level from violation patterns
    const hasTypeIssues = violations.some(v => v.ruleId.includes('type'));
    const hasSecurityIssues = violations.some(v => v.severity === 'critical');
    
    let technicalLevel: DeveloperProfile['technicalLevel'] = 'intermediate';
    if (hasSecurityIssues && hasTypeIssues) {
      technicalLevel = 'beginner';
    } else if (!hasTypeIssues && violations.length < 10) {
      technicalLevel = 'advanced';
    }

    // Default stack and LLM access (would be better to infer from actual code)
    return {
      technicalLevel,
      stack: ['typescript', 'node'], // Default, should be inferred
      llmAccess: ['openai'], // Default, should be inferred from config
    };
  }
}

export const aiAnomalyDetectionService = new AIAnomalyDetectionService();
