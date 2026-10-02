import { describe, it, expect } from 'vitest';
import { generatePreCommitHookScript, buildDefaultConfig } from '../../cli/readylayer-cli';

describe('ReadyLayer CLI init and init-hooks commands', () => {
  it('generates a valid shell pre-commit hook script with default runner', () => {
    const script = generatePreCommitHookScript();
    expect(script).toContain('#!/bin/sh');
    expect(script).toContain('ReadyLayer Git Pre-Commit Governance Hook');
    expect(script).toContain('npx readylayer scan --staged');
    expect(script).toContain('exit 1');
    expect(script).toContain('exit 0');
  });

  it('generates pre-commit hook with custom runner binary', () => {
    const script = generatePreCommitHookScript('readylayer');
    expect(script).toContain('readylayer scan --staged');
  });

  it('builds default config structure with custom options', () => {
    const config = buildDefaultConfig({
      apiKey: 'rl_test_12345',
      apiUrl: 'https://custom.readylayer.corp',
      repo: 'repo-omega',
      provider: 'ollama',
    });

    expect(config.apiKey).toBe('rl_test_12345');
    expect(config.apiUrl).toBe('https://custom.readylayer.corp');
    expect(config.repositoryId).toBe('repo-omega');
    expect(config.llmProvider?.name).toBe('ollama');
  });
});
