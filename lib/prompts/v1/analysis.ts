/**
 * Analysis Prompts - Layer 2: Task-Specific Instructions
 *
 * P2: Task-specific analysis templates for different services
 * Reference: PROMPT_ARCHITECTURE.md - RECOMMENDED ARCHITECTURE
 *
 * Version: 1.0.0
 * Created: 2026-01-17
 */

/**
 * Review Guard Analysis Prompts
 */
export const reviewGuardPrompts = {
  /**
   * Analyze a file for security and quality issues
   */
  analyzeFile: (file: string, content: string, evidence?: string): string => `
Analyze this file for security and quality issues.

File: ${file}
${evidence ? `\nContext from codebase:\n${evidence}` : ''}

Code:
\`\`\`
${content}
\`\`\`

Focus on:
- SQL injection, XSS, CSRF vulnerabilities
- Hardcoded secrets and credentials
- Insecure dependencies and imports
- Authentication and authorization flaws
- Performance anti-patterns
- Resource exhaustion risks

Return findings as JSON array (see system prompt for format).`,
};

/**
 * Test Engine Generation Prompts
 */
export const testEnginePrompts = {
  /**
   * Generate tests for a file
   */
  generateTests: (file: string, content: string, framework: string): string => `
Generate comprehensive tests for this file.

File: ${file}
Framework: ${framework}
Coverage requirement: Minimum 80%

Code to test:
\`\`\`
${content}
\`\`\`

Requirements:
- Cover all public functions and methods
- Include edge cases and error handling
- Test boundary conditions
- Use descriptive test names
- Include setup/teardown if needed

Return complete test file (see system prompt for format).`,

  /**
   * Generate integration tests
   */
  generateIntegrationTests: (files: string[], framework: string): string => `
Generate integration tests for these related files.

Files: ${files.join(', ')}
Framework: ${framework}

Requirements:
- Test interactions between components
- Mock external dependencies
- Validate data flow
- Test error propagation
- Cover critical paths

Return complete test file.`,
};

/**
 * Doc Sync Enhancement Prompts
 */
export const docSyncPrompts = {
  /**
   * Enhance OpenAPI spec
   */
  enhanceOpenAPI: (spec: string): string => `
Enhance this OpenAPI specification with detailed descriptions and examples.

Current spec:
\`\`\`yaml
${spec}
\`\`\`

Enhancements needed:
- Add clear descriptions for all endpoints
- Explain request/response parameters
- Provide realistic examples
- Document error responses
- Add tags and grouping

Return enhanced spec in YAML format.`,

  /**
   * Detect documentation drift
   */
  detectDrift: (code: string, docs: string): string => `
Detect drift between code implementation and documentation.

Implementation:
\`\`\`
${code}
\`\`\`

Documentation:
\`\`\`
${docs}
\`\`\`

Identify:
- Parameters added/removed in code but not docs
- Changed behavior not reflected in docs
- Deprecated features still documented
- Missing error cases

Return drift analysis as JSON.`,
};

/**
 * Governance Analysis Prompts
 */
export const governancePrompts = {
  /**
   * Analyze code diff for governance
   */
  analyzeDiff: (diff: string, intent?: string): string => `
Analyze this code diff for security, quality, and compliance issues.

${intent ? `Intent: ${intent}\n` : ''}
Diff:
\`\`\`
${diff}
\`\`\`

Evaluate:
- Security implications of changes
- Code quality and maintainability
- Compliance with best practices
- Potential breaking changes
- Test coverage impact

Return findings and governance signals (see system prompt for format).`,

  /**
   * Variance analysis across models
   */
  varianceAnalysis: (diff: string, model1Results: string, model2Results: string): string => `
Compare governance findings from multiple models to identify variance.

Diff analyzed:
\`\`\`
${diff}
\`\`\`

Model 1 findings:
${model1Results}

Model 2 findings:
${model2Results}

Analyze:
- Areas of agreement (high confidence)
- Areas of disagreement (review needed)
- Severity variance
- False positive likelihood

Return variance analysis with confidence levels.`,
};

/**
 * Build a complete prompt from system + analysis layers
 */
export function buildLayeredPrompt(
  systemPromptKey: string,
  analysisPromptFn: (...args: unknown[]) => string,
  ...args: unknown[]
): { system: string; user: string } {
   
const { getSystemPrompt } = require('./system') as { getSystemPrompt: (key: string) => string };

  return {
    system: getSystemPrompt(systemPromptKey),
    user: analysisPromptFn(...args) as string,
  };
}

/**
 * Analysis prompt metadata
 */
export const ANALYSIS_VERSION = {
  version: '1.0.0',
  createdAt: '2026-01-17',
  changelog: 'Initial analysis prompt templates',
};
