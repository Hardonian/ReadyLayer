/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
/**
 * Tenant-Scoped Repository Pattern
 *
 * Enforces tenant isolation at the data access layer.
 * All queries MUST include tenantId - no exceptions.
 */

import { prisma } from './prisma';
import {
  TenantContext,
  TenantIsolationError,
  requireTenantContext,
  requireTenantAccess,
} from './tenant-isolation';
import { logger } from '../observability/logging';

const _TENANTED_MODELS = [
  'repository',
  'review',
  'job',
  'governanceRun',
  'policyPack',
  'costTracking',
  'waiver',
  'tokenUsage',
  'modelPerformance',
  'aiAnomaly',
  'aiOptimizationSuggestion',
  'predictiveAlert',
  'trustVerification',
  'readyLayerRun',
  'providerConfig',
  'installation',
  'auditLog',
  'reviewSignal',
  'readinessScoreSnapshot',
  'aiRiskExposureIndex',
] as const;

type TenantedModel = typeof _TENANTED_MODELS[number];

/**
 * Base repository with tenant enforcement
 */
export class TenantScopedRepository<T extends { organizationId: string }> {
  protected model: TenantedModel;
  protected tenantContext: TenantContext;

  constructor(model: TenantedModel, tenantContext: TenantContext) {
    this.model = model;
    this.tenantContext = tenantContext;
  }

  protected enforceTenantScope(operation: string): void {
    requireTenantAccess(
      this.tenantContext,
      this.tenantContext.tenantId,
      operation,
      this.model
    );
  }

  protected addTenantScope(where: Record<string, unknown>): Record<string, unknown> {
    return {
      ...where,
      organizationId: this.tenantContext.tenantId,
    };
  }

  async findUnique(where: { id: string }): Promise<T | null> {
    this.enforceTenantScope('read');

    const result = await (prisma as any)[this.model].findUnique({
      where: {
        ...where,
        organizationId: this.tenantContext.tenantId,
      },
    });

    if (result && result.organizationId !== this.tenantContext.tenantId) {
      logger.error({
        event: 'tenant_isolation_violation',
        operation: 'findUnique',
        model: this.model,
        resourceId: where.id,
        expectedTenant: this.tenantContext.tenantId,
        actualTenant: result.organizationId,
      });

      throw new TenantIsolationError(
        'Cross-tenant access detected in findUnique',
        'findUnique',
        this.model,
        this.tenantContext.tenantId
      );
    }

    return result;
  }

  async findFirst(where: Record<string, unknown>): Promise<T | null> {
    this.enforceTenantScope('read');

    return (prisma as any)[this.model].findFirst({
      where: this.addTenantScope(where),
    });
  }

  async findMany(where: Record<string, unknown> = {}): Promise<T[]> {
    this.enforceTenantScope('read');

    return (prisma as any)[this.model].findMany({
      where: this.addTenantScope(where),
    });
  }

  async create(data: Omit<T, 'id' | 'organizationId'>): Promise<T> {
    this.enforceTenantScope('write');

    return (prisma as any)[this.model].create({
      data: {
        ...data,
        organizationId: this.tenantContext.tenantId,
      },
    });
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    this.enforceTenantScope('write');

    const existing = await this.findUnique({ id });
    if (!existing) {
      throw new Error(`Resource not found: ${id}`);
    }

    return (prisma as any)[this.model].update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    this.enforceTenantScope('delete');

    await (prisma as any)[this.model].delete({
      where: { id },
    });
  }

  async count(where: Record<string, unknown> = {}): Promise<number> {
    this.enforceTenantScope('read');

    return (prisma as any)[this.model].count({
      where: this.addTenantScope(where),
    });
  }
}

/**
 * Repository-specific scoped repositories
 */
export class TenantScopedRepositoryRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('repository', tenantContext);
  }
}

export class TenantScopedReviewRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('review', tenantContext);
  }
}

export class TenantScopedJobRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('job', tenantContext);
  }
}

export class TenantScopedGovernanceRunRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('governanceRun', tenantContext);
  }
}

export class TenantScopedPolicyPackRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('policyPack', tenantContext);
  }
}

export class TenantScopedCostTrackingRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('costTracking', tenantContext);
  }
}

export class TenantScopedWaiverRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('waiver', tenantContext);
  }
}

export class TenantScopedTokenUsageRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('tokenUsage', tenantContext);
  }
}

export class TenantScopedModelPerformanceRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('modelPerformance', tenantContext);
  }
}

export class TenantScopedAIAnomalyRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('aiAnomaly', tenantContext);
  }
}

export class TenantScopedAIOptimizationSuggestionRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('aiOptimizationSuggestion', tenantContext);
  }
}

export class TenantScopedPredictiveAlertRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('predictiveAlert', tenantContext);
  }
}

export class TenantScopedTrustVerificationRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('trustVerification', tenantContext);
  }
}

export class TenantScopedReadyLayerRunRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('readyLayerRun', tenantContext);
  }
}

export class TenantScopedProviderConfigRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('providerConfig', tenantContext);
  }
}

export class TenantScopedInstallationRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('installation', tenantContext);
  }
}

export class TenantScopedAuditLogRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('auditLog', tenantContext);
  }
}

export class TenantScopedReviewSignalRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('reviewSignal', tenantContext);
  }
}

export class TenantScopedReadinessScoreSnapshotRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('readinessScoreSnapshot', tenantContext);
  }
}

export class TenantScopedAIRiskExposureIndexRepository extends TenantScopedRepository<any> {
  constructor(tenantContext: TenantContext) {
    super('aiRiskExposureIndex', tenantContext);
  }
}

/**
 * Factory for creating tenant-scoped repositories
 */
export function createScopedRepository(
  model: TenantedModel,
  tenantContext: TenantContext
): TenantScopedRepository<any> {
  requireTenantContext(tenantContext);

  switch (model) {
    case 'repository':
      return new TenantScopedRepositoryRepository(tenantContext);
    case 'review':
      return new TenantScopedReviewRepository(tenantContext);
    case 'job':
      return new TenantScopedJobRepository(tenantContext);
    case 'governanceRun':
      return new TenantScopedGovernanceRunRepository(tenantContext);
    case 'policyPack':
      return new TenantScopedPolicyPackRepository(tenantContext);
    case 'costTracking':
      return new TenantScopedCostTrackingRepository(tenantContext);
    case 'waiver':
      return new TenantScopedWaiverRepository(tenantContext);
    case 'tokenUsage':
      return new TenantScopedTokenUsageRepository(tenantContext);
    case 'modelPerformance':
      return new TenantScopedModelPerformanceRepository(tenantContext);
    case 'aiAnomaly':
      return new TenantScopedAIAnomalyRepository(tenantContext);
    case 'aiOptimizationSuggestion':
      return new TenantScopedAIOptimizationSuggestionRepository(tenantContext);
    case 'predictiveAlert':
      return new TenantScopedPredictiveAlertRepository(tenantContext);
    case 'trustVerification':
      return new TenantScopedTrustVerificationRepository(tenantContext);
    case 'readyLayerRun':
      return new TenantScopedReadyLayerRunRepository(tenantContext);
    case 'providerConfig':
      return new TenantScopedProviderConfigRepository(tenantContext);
    case 'installation':
      return new TenantScopedInstallationRepository(tenantContext);
    case 'auditLog':
      return new TenantScopedAuditLogRepository(tenantContext);
    case 'reviewSignal':
      return new TenantScopedReviewSignalRepository(tenantContext);
    case 'readinessScoreSnapshot':
      return new TenantScopedReadinessScoreSnapshotRepository(tenantContext);
    case 'aiRiskExposureIndex':
      return new TenantScopedAIRiskExposureIndexRepository(tenantContext);
    default:
      throw new Error(`Unknown tenant-scoped model: ${model}`);
  }
}
