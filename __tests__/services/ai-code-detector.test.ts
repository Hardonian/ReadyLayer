import { describe, it, expect } from 'vitest';
import { aiCodeDetector, staticAnalysisService } from '../../services/static-analysis';
import { CodeParserService } from '../../services/code-parser';

describe('AI-Touched Code Detection Engine', () => {
  const parser = new CodeParserService();

  it('detects phantom and hallucinated library imports', async () => {
    const code = `
import { v4 } from 'lodash-uuid';
import { routeHelper } from 'node:helpers';

export function run() {
  return v4();
}
`;
    const parseResult = await parser.parse('src/runner.ts', code);
    const result = aiCodeDetector.detect(parseResult, 'src/runner.ts', code);

    expect(result.signals.some((s) => s.type === 'hallucinated_import')).toBe(true);
    expect(result.issues.some((i) => i.ruleId === 'ai.hallucinated-imports')).toBe(true);
  });

  it('detects characteristic LLM commentary signatures and high comment density', async () => {
    const code = `
// Helper function to process items
// Ensure that the payload is valid before continuing
// Loop through all items and transform them
export function processItems(items: string[]) {
  // Step 1: Initialize list
  const results: string[] = [];
  // Step 2: Handle error appropriately
  for (const item of items) {
    results.push(item.trim());
  }
  // Return the result
  return results;
}
`;
    const parseResult = await parser.parse('src/process.ts', code);
    const result = aiCodeDetector.detect(parseResult, 'src/process.ts', code);

    expect(result.signals.some((s) => s.type === 'comment_signature')).toBe(true);
    expect(result.issues.some((i) => i.ruleId === 'ai.comment-signatures')).toBe(true);
    expect(result.aiLikelihoodScore).toBeGreaterThanOrEqual(0.40);
  });

  it('detects unpopulated AI template placeholder remnants', async () => {
    const code = `
export const config = {
  apiKey: "YOUR_OPENAI_API_KEY",
  endpoint: "<insert_api_url_here>",
};
`;
    const parseResult = await parser.parse('src/config.ts', code);
    const result = aiCodeDetector.detect(parseResult, 'src/config.ts', code);

    expect(result.signals.some((s) => s.type === 'placeholder_remnant')).toBe(true);
    expect(result.issues.some((i) => i.ruleId === 'ai.placeholder-remnant')).toBe(true);
    expect(result.aiLikelihoodScore).toBeGreaterThanOrEqual(0.70);
    expect(result.isAiTouched).toBe(true);
  });

  it('evaluates cleanly through StaticAnalysisService registered rule', async () => {
    const code = `
// Helper function to calculate sum
import { something } from 'lodash-uuid';

export function calc() {
  return 42;
}
`;
    const issues = await staticAnalysisService.analyze('src/calc.ts', code);
    const aiIssues = issues.filter((i) => i.ruleId.startsWith('ai.'));
    expect(aiIssues.length).toBeGreaterThan(0);
  });
});
