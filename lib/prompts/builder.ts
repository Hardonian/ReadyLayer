/**
 * Prompt Builder - Compose layered prompts for LLM requests
 *
 * P2: Centralized prompt composition with versioning and validation
 * Reference: PROMPT_ARCHITECTURE.md - RECOMMENDED ARCHITECTURE
 */

import { getSystemPrompt, PROMPT_VERSION } from './v1/system';
import {
  reviewGuardPrompts,
  testEnginePrompts,
  docSyncPrompts,
  governancePrompts,
  ANALYSIS_VERSION,
} from './v1/analysis';

export interface BuiltPrompt {
  system: string;
  user: string;
  metadata: {
    systemVersion: string;
    analysisVersion: string;
    timestamp: string;
  };
}

/**
 * Prompt Builder for Review Guard
 */
export class ReviewGuardPromptBuilder {
  buildAnalyzeFilePrompt(
    file: string,
    content: string,
    evidence?: string
  ): BuiltPrompt {
    return {
      system: getSystemPrompt('security_analyst'),
      user: reviewGuardPrompts.analyzeFile(file, content, evidence),
      metadata: {
        systemVersion: PROMPT_VERSION.version,
        analysisVersion: ANALYSIS_VERSION.version,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Prompt Builder for Test Engine
 */
export class TestEnginePromptBuilder {
  buildGenerateTestsPrompt(
    file: string,
    content: string,
    framework: string
  ): BuiltPrompt {
    return {
      system: getSystemPrompt('test_generator'),
      user: testEnginePrompts.generateTests(file, content, framework),
      metadata: {
        systemVersion: PROMPT_VERSION.version,
        analysisVersion: ANALYSIS_VERSION.version,
        timestamp: new Date().toISOString(),
      },
    };
  }

  buildGenerateIntegrationTestsPrompt(
    files: string[],
    framework: string
  ): BuiltPrompt {
    return {
      system: getSystemPrompt('test_generator'),
      user: testEnginePrompts.generateIntegrationTests(files, framework),
      metadata: {
        systemVersion: PROMPT_VERSION.version,
        analysisVersion: ANALYSIS_VERSION.version,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Prompt Builder for Doc Sync
 */
export class DocSyncPromptBuilder {
  buildEnhanceOpenAPIPrompt(spec: string): BuiltPrompt {
    return {
      system: getSystemPrompt('documentation_enhancer'),
      user: docSyncPrompts.enhanceOpenAPI(spec),
      metadata: {
        systemVersion: PROMPT_VERSION.version,
        analysisVersion: ANALYSIS_VERSION.version,
        timestamp: new Date().toISOString(),
      },
    };
  }

  buildDetectDriftPrompt(code: string, docs: string): BuiltPrompt {
    return {
      system: getSystemPrompt('documentation_enhancer'),
      user: docSyncPrompts.detectDrift(code, docs),
      metadata: {
        systemVersion: PROMPT_VERSION.version,
        analysisVersion: ANALYSIS_VERSION.version,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Prompt Builder for Governance Engine
 */
export class GovernancePromptBuilder {
  buildAnalyzeDiffPrompt(diff: string, intent?: string): BuiltPrompt {
    return {
      system: getSystemPrompt('governance_analyzer'),
      user: governancePrompts.analyzeDiff(diff, intent),
      metadata: {
        systemVersion: PROMPT_VERSION.version,
        analysisVersion: ANALYSIS_VERSION.version,
        timestamp: new Date().toISOString(),
      },
    };
  }

  buildVarianceAnalysisPrompt(
    diff: string,
    model1Results: string,
    model2Results: string
  ): BuiltPrompt {
    return {
      system: getSystemPrompt('governance_analyzer'),
      user: governancePrompts.varianceAnalysis(diff, model1Results, model2Results),
      metadata: {
        systemVersion: PROMPT_VERSION.version,
        analysisVersion: ANALYSIS_VERSION.version,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Export singleton instances
 */
export const reviewGuardPromptBuilder = new ReviewGuardPromptBuilder();
export const testEnginePromptBuilder = new TestEnginePromptBuilder();
export const docSyncPromptBuilder = new DocSyncPromptBuilder();
export const governancePromptBuilder = new GovernancePromptBuilder();

/**
 * Combine system + user prompts for backward compatibility
 * (for services that don't support separate system prompts yet)
 */
export function combinedPrompt(built: BuiltPrompt): string {
  return `${built.system}\n\n---\n\n${built.user}`;
}
