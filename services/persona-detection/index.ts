/**
 * Persona Detection Service
 * 
 * Detects which persona(s) apply to a repository/user
 * Enables persona-specific rule sets and configurations
 */

import { prisma } from '../../lib/prisma';

export type PersonaType =
  | 'founder'
  | 'enterprise-cto'
  | 'junior-developer'
  | 'opensource-maintainer'
  | 'agency-freelancer'
  | 'startup-cto';

export interface PersonaProfile {
  type: PersonaType;
  confidence: number; // 0-1
  indicators: string[];
  enabledRules: string[];
  config: PersonaConfig;
}

export interface PersonaConfig {
  // Rule severities
  ruleSeverities: Record<string, 'critical' | 'high' | 'medium' | 'low'>;
  // Blocking thresholds
  blockOnCritical: boolean;
  blockOnHigh: boolean;
  blockOnMedium: boolean;
  blockOnLow: boolean;
  // Persona-specific settings
  enableMentorship: boolean; // Junior developer
  enableComplianceTracking: boolean; // Enterprise CTO
  enableBreakingChangeDetection: boolean; // Open source
  enableClientConsistency: boolean; // Agency/Freelancer
  enableScalingChecks: boolean; // Startup CTO
}

export class PersonaDetectionService {
  /**
   * Detect persona(s) for a repository
   */
  async detectPersonas(repositoryId: string): Promise<PersonaProfile[]> {
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
      include: {
        organization: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!repository) {
      return [this.getDefaultPersona()];
    }

    const personas: PersonaProfile[] = [];

    // Detect based on organization/repository characteristics
    const org = repository.organization;

    // Enterprise CTO indicators
    if (this.isEnterprise(org, repository)) {
      personas.push({
        type: 'enterprise-cto',
        confidence: 0.9,
        indicators: ['Large organization', 'Multiple team members', 'Enterprise features'],
        enabledRules: [
          'enterprise.compliance',
          'enterprise.consistency',
          'founder.edge-runtime',
          'founder.auth-patterns',
          'founder.error-handling',
        ],
        config: {
          ruleSeverities: {
            'enterprise.compliance': 'critical',
            'enterprise.consistency': 'medium',
          },
          blockOnCritical: true,
          blockOnHigh: true,
          blockOnMedium: false,
          blockOnLow: false,
          enableMentorship: false,
          enableComplianceTracking: true,
          enableBreakingChangeDetection: false,
          enableClientConsistency: false,
          enableScalingChecks: true,
        },
      });
    }

    // Open Source Maintainer indicators
    if (this.isOpenSource(repository)) {
      personas.push({
        type: 'opensource-maintainer',
        confidence: 0.95,
        indicators: ['Public repository', 'Open source license', 'Community contributions'],
        enabledRules: [
          'opensource.breaking-change',
          'opensource.license',
          'founder.auth-patterns',
          'founder.error-handling',
        ],
        config: {
          ruleSeverities: {
            'opensource.breaking-change': 'critical',
            'opensource.license': 'critical',
          },
          blockOnCritical: true,
          blockOnHigh: true,
          blockOnMedium: false,
          blockOnLow: false,
          enableMentorship: false,
          enableComplianceTracking: false,
          enableBreakingChangeDetection: true,
          enableClientConsistency: false,
          enableScalingChecks: false,
        },
      });
    }

    // Startup CTO indicators
    if (this.isStartup(org, repository)) {
      personas.push({
        type: 'startup-cto',
        confidence: 0.85,
        indicators: ['Small team', 'Fast iteration', 'Production stability critical'],
        enabledRules: [
          'startup.stability',
          'startup.scaling',
          'founder.edge-runtime',
          'founder.auth-patterns',
          'founder.error-handling',
        ],
        config: {
          ruleSeverities: {
            'startup.stability': 'critical',
            'startup.scaling': 'high',
          },
          blockOnCritical: true,
          blockOnHigh: true,
          blockOnMedium: false,
          blockOnLow: false,
          enableMentorship: false,
          enableComplianceTracking: false,
          enableBreakingChangeDetection: false,
          enableClientConsistency: false,
          enableScalingChecks: true,
        },
      });
    }

    // Junior Developer indicators (user-level, not repo-level)
    // Would be detected based on user profile/activity

    // Agency/Freelancer indicators
    if (this.isAgency(repository)) {
      personas.push({
        type: 'agency-freelancer',
        confidence: 0.8,
        indicators: ['Client project patterns', 'Multiple projects', 'Rapid delivery'],
        enabledRules: [
          'agency.consistency',
          'agency.requirements',
          'founder.auth-patterns',
          'founder.error-handling',
        ],
        config: {
          ruleSeverities: {
            'agency.consistency': 'high',
            'agency.requirements': 'high',
          },
          blockOnCritical: true,
          blockOnHigh: true,
          blockOnMedium: false,
          blockOnLow: false,
          enableMentorship: false,
          enableComplianceTracking: false,
          enableBreakingChangeDetection: false,
          enableClientConsistency: true,
          enableScalingChecks: false,
        },
      });
    }

    // Founder (default if no other persona detected)
    if (personas.length === 0) {
      personas.push(this.getDefaultPersona());
    }

    return personas;
  }

  /**
   * Get default persona (founder)
   */
  private getDefaultPersona(): PersonaProfile {
    return {
      type: 'founder',
      confidence: 1.0,
      indicators: ['Default persona'],
      enabledRules: [
        'founder.edge-runtime',
        'founder.type-erosion',
        'founder.unused-imports',
        'founder.auth-patterns',
        'founder.error-handling',
        'founder.large-refactor',
      ],
      config: {
        ruleSeverities: {},
        blockOnCritical: true,
        blockOnHigh: true,
        blockOnMedium: false,
        blockOnLow: false,
        enableMentorship: false,
        enableComplianceTracking: false,
        enableBreakingChangeDetection: false,
        enableClientConsistency: false,
        enableScalingChecks: false,
      },
    };
  }

  /**
   * Check if organization/repository is enterprise
   */
  private isEnterprise(org: any, repo: any): boolean {
    // Check organization size (would need actual data)
    const memberCount = org?.members?.length || 0;
    if (memberCount > 20) {
      return true;
    }

    // Check repository characteristics
    if (repo.name.includes('enterprise') || repo.name.includes('corp')) {
      return true;
    }

    return false;
  }

  /**
   * Check if repository is open source
   */
  private isOpenSource(repo: any): boolean {
    if (!repo.isPrivate) {
      return true; // Public repository
    }

    // Check for open source indicators in name/description
    const name = repo.name.toLowerCase();
    if (name.includes('oss') || name.includes('open-source')) {
      return true;
    }

    return false;
  }

  /**
   * Check if organization/repository is startup
   */
  private isStartup(org: any, repo: any): boolean {
    const memberCount = org?.members?.length || 0;
    if (memberCount > 1 && memberCount < 15) {
      return true; // Small team
    }

    // Check repository name patterns
    const name = repo.name.toLowerCase();
    if (name.includes('mvp') || name.includes('startup') || name.includes('beta')) {
      return true;
    }

    return false;
  }

  /**
   * Check if repository is agency/freelancer project
   */
  private isAgency(repo: any): boolean {
    const name = repo.name.toLowerCase();
    const fullName = repo.fullName.toLowerCase();

    // Check for client project patterns
    if (name.includes('client-') || name.includes('project-') || fullName.includes('agency')) {
      return true;
    }

    return false;
  }

  /**
   * Get persona-specific configuration
   */
  getPersonaConfig(personaType: PersonaType): PersonaConfig {
    const configs: Record<PersonaType, PersonaConfig> = {
      founder: {
        ruleSeverities: {},
        blockOnCritical: true,
        blockOnHigh: true,
        blockOnMedium: false,
        blockOnLow: false,
        enableMentorship: false,
        enableComplianceTracking: false,
        enableBreakingChangeDetection: false,
        enableClientConsistency: false,
        enableScalingChecks: false,
      },
      'enterprise-cto': {
        ruleSeverities: {
          'enterprise.compliance': 'critical',
          'enterprise.consistency': 'medium',
        },
        blockOnCritical: true,
        blockOnHigh: true,
        blockOnMedium: false,
        blockOnLow: false,
        enableMentorship: false,
        enableComplianceTracking: true,
        enableBreakingChangeDetection: false,
        enableClientConsistency: false,
        enableScalingChecks: true,
      },
      'junior-developer': {
        ruleSeverities: {
          'junior.best-practices': 'medium',
          'junior.pre-review': 'high',
        },
        blockOnCritical: true,
        blockOnHigh: false, // Don't block, provide guidance
        blockOnMedium: false,
        blockOnLow: false,
        enableMentorship: true,
        enableComplianceTracking: false,
        enableBreakingChangeDetection: false,
        enableClientConsistency: false,
        enableScalingChecks: false,
      },
      'opensource-maintainer': {
        ruleSeverities: {
          'opensource.breaking-change': 'critical',
          'opensource.license': 'critical',
        },
        blockOnCritical: true,
        blockOnHigh: true,
        blockOnMedium: false,
        blockOnLow: false,
        enableMentorship: false,
        enableComplianceTracking: false,
        enableBreakingChangeDetection: true,
        enableClientConsistency: false,
        enableScalingChecks: false,
      },
      'agency-freelancer': {
        ruleSeverities: {
          'agency.consistency': 'high',
          'agency.requirements': 'high',
        },
        blockOnCritical: true,
        blockOnHigh: true,
        blockOnMedium: false,
        blockOnLow: false,
        enableMentorship: false,
        enableComplianceTracking: false,
        enableBreakingChangeDetection: false,
        enableClientConsistency: true,
        enableScalingChecks: false,
      },
      'startup-cto': {
        ruleSeverities: {
          'startup.stability': 'critical',
          'startup.scaling': 'high',
        },
        blockOnCritical: true,
        blockOnHigh: true,
        blockOnMedium: false,
        blockOnLow: false,
        enableMentorship: false,
        enableComplianceTracking: false,
        enableBreakingChangeDetection: false,
        enableClientConsistency: false,
        enableScalingChecks: true,
      },
    };

    return configs[personaType];
  }
}

export const personaDetectionService = new PersonaDetectionService();
