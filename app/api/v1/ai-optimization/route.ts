/**
 * AI Optimization API
 * 
 * GET /api/v1/ai-optimization - Get AI optimization suggestions and anomaly analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { logger } from '../../../../observability/logging';
import { requireAuth } from '../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../lib/authz';
import { aiAnomalyDetectionService, DeveloperProfile } from '../../../../services/ai-anomaly-detection';

/**
 * GET /api/v1/ai-optimization
 * Get AI optimization suggestions and anomaly analysis
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');
    const organizationId = searchParams.get('organizationId');
    const technicalLevel = searchParams.get('technicalLevel') as DeveloperProfile['technicalLevel'] | null;
    const stack = searchParams.get('stack')?.split(',') || [];
    const llmAccess = searchParams.get('llmAccess')?.split(',') || [];

    // Get user's organization memberships for tenant isolation
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    const userOrgIds = memberships.map((m) => m.organizationId);

    if (userOrgIds.length === 0) {
      return NextResponse.json({
        anomalies: [],
        tokenWaste: null,
        repeatedMistakes: [],
        suggestions: [],
        summary: {
          totalAnomalies: 0,
          totalTokenWaste: 0,
          repeatedMistakeCount: 0,
          suggestionCount: 0,
        },
      });
    }

    // Determine which repository/org to analyze
    let targetRepositoryId: string | undefined;
    let targetOrganizationId: string;

    if (repositoryId) {
      // Verify repository belongs to user's organization
      const repo = await prisma.repository.findUnique({
        where: { id: repositoryId },
        select: { organizationId: true },
      });

      if (!repo || !userOrgIds.includes(repo.organizationId)) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Access denied to repository' } },
          { status: 403 }
        );
      }

      targetRepositoryId = repositoryId;
      targetOrganizationId = repo.organizationId;
    } else if (organizationId) {
      // Verify user belongs to organization
      if (!userOrgIds.includes(organizationId)) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Access denied to organization' } },
          { status: 403 }
        );
      }

      targetOrganizationId = organizationId;
    } else {
      // Default to first organization
      targetOrganizationId = userOrgIds[0];
    }

    // Build developer profile
    const developerProfile: DeveloperProfile | undefined = 
      technicalLevel || stack.length > 0 || llmAccess.length > 0
        ? {
            technicalLevel: technicalLevel || 'intermediate',
            stack: stack.length > 0 ? stack : ['typescript', 'node'],
            llmAccess: llmAccess.length > 0 ? llmAccess : ['openai'],
          }
        : undefined;

    // Run anomaly detection analysis
    const analysis = await aiAnomalyDetectionService.analyzeRepository(
      targetRepositoryId || '',
      targetOrganizationId,
      developerProfile
    );

    // Save suggestions to database for tracking
    if (analysis.suggestions.length > 0) {
      await Promise.all(
        analysis.suggestions.map((suggestion) =>
          prisma.aIOptimizationSuggestion.upsert({
            where: {
              id: suggestion.id,
            },
            update: {
              title: suggestion.title,
              description: suggestion.description,
              steps: suggestion.steps as any,
              estimatedSavings: suggestion.estimatedSavings as any,
            },
            create: {
              id: suggestion.id,
              repositoryId: targetRepositoryId || null,
              organizationId: targetOrganizationId,
              type: suggestion.type,
              difficulty: suggestion.difficulty,
              title: suggestion.title,
              description: suggestion.description,
              impact: suggestion.impact,
              effort: suggestion.effort,
              stack: suggestion.stack || [],
              llmAccess: suggestion.llmAccess || [],
              codeExample: suggestion.codeExample,
              steps: suggestion.steps as any,
              estimatedSavings: suggestion.estimatedSavings as any,
            },
          })
        )
      );
    }

    return NextResponse.json(analysis);
  } catch (error) {
    log.error(error, 'Failed to get AI optimization suggestions');
    return NextResponse.json(
      {
        error: {
          code: 'ANALYSIS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
