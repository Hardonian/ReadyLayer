/**
 * Demo Mode Pipeline E2E Tests
 *
 * Tests the complete demo mode pipeline execution including:
 * - Review Guard: Security, performance, and quality scans
 * - Test Engine: Unit test generation
 * - Doc Sync: Documentation updates
 * - Decision record generation
 */

import { describe, it, expect } from 'vitest';
import { demoPipelineService, DEMO_FROZEN_TIMESTAMP, DEMO_FROZEN_DATE } from '@/lib/demo/pipeline';
import { sandboxPRMetadata } from '@/content/demo/sandboxFixtures';

describe('Demo Mode Pipeline', () => {
  describe('executeFullPipeline', () => {
    it('should execute full pipeline and return valid result', async () => {
      const result = await demoPipelineService.executeFullPipeline();

      expect(result).toBeDefined();
      expect(result.runId).toBeDefined();
      expect(result.runId).toContain('demo_');
      expect(result.timestamp).toBeDefined();
      expect(result.pr).toBeDefined();
      expect(result.pr.number).toBe(42);
      expect(result.checks).toBeInstanceOf(Array);
      expect(result.checks.length).toBeGreaterThan(0);
      expect(result.decision).toBeDefined();
    });

    it('should execute Review Guard checks', async () => {
      const result = await demoPipelineService.executeFullPipeline();
      const reviewGuardChecks = result.checks.filter((c) => c.category === 'review-guard');

      expect(reviewGuardChecks.length).toBe(3);

      const securityCheck = reviewGuardChecks.find((c) => c.id === 'rg-security');
      expect(securityCheck).toBeDefined();
      // Security check has findings (SQL injection, hardcoded secrets), so status is 'failure'
      expect(securityCheck?.status).toBe('failure');
      expect(securityCheck?.findings).toBeInstanceOf(Array);
      expect(securityCheck?.metrics?.findingsCount).toBeGreaterThan(0);

      const performanceCheck = reviewGuardChecks.find((c) => c.id === 'rg-performance');
      expect(performanceCheck).toBeDefined();
      expect(performanceCheck?.status).toBe('success');

      const qualityCheck = reviewGuardChecks.find((c) => c.id === 'rg-quality');
      expect(qualityCheck).toBeDefined();
      expect(qualityCheck?.status).toBe('failure');
      expect(qualityCheck?.findings?.length).toBeGreaterThan(0);
    });

    it('should execute Test Engine checks', async () => {
      const result = await demoPipelineService.executeFullPipeline();
      const testEngineChecks = result.checks.filter((c) => c.category === 'test-engine');

      expect(testEngineChecks.length).toBe(2);

      const unitTestCheck = testEngineChecks.find((c) => c.id === 'te-unit');
      expect(unitTestCheck).toBeDefined();
      expect(unitTestCheck?.status).toBe('success');
      expect(unitTestCheck?.metrics?.testsGenerated).toBeGreaterThan(0);
      expect(unitTestCheck?.artifacts).toBeInstanceOf(Array);

      const coverageCheck = testEngineChecks.find((c) => c.id === 'te-coverage');
      expect(coverageCheck).toBeDefined();
      expect(coverageCheck?.metrics?.coverageDelta).toBeDefined();
    });

    it('should execute Doc Sync checks', async () => {
      const result = await demoPipelineService.executeFullPipeline();
      const docSyncChecks = result.checks.filter((c) => c.category === 'doc-sync');

      expect(docSyncChecks.length).toBe(3);

      const openapiCheck = docSyncChecks.find((c) => c.id === 'ds-openapi');
      expect(openapiCheck).toBeDefined();
      expect(openapiCheck?.status).toBe('success');
      expect(openapiCheck?.metrics?.docsUpdated).toBeGreaterThan(0);
      expect(openapiCheck?.artifacts?.some((a) => a.type === 'openapi')).toBe(true);

      const readmeCheck = docSyncChecks.find((c) => c.id === 'ds-readme');
      expect(readmeCheck).toBeDefined();
      expect(readmeCheck?.status).toBe('success');

      const changelogCheck = docSyncChecks.find((c) => c.id === 'ds-changelog');
      expect(changelogCheck).toBeDefined();
      expect(changelogCheck?.status).toBe('success');
    });

    it('should generate correct decision based on findings', async () => {
      const result = await demoPipelineService.executeFullPipeline();

      expect(result.decision.status).toBe('blocked');
      expect(result.decision.reason).toBeDefined();
      expect(result.decision.reason).toContain('Critical findings');
    });

    it('should produce consistent results across runs', async () => {
      const result1 = await demoPipelineService.executeFullPipeline();
      const result2 = await demoPipelineService.executeFullPipeline();

      // Run IDs should be deterministic and consistent across runs
      const expectedRunId = `demo_${sandboxPRMetadata.prSha}`;
      expect(result1.runId).toBe(expectedRunId);
      expect(result2.runId).toBe(expectedRunId);

      // Timestamps should be frozen
      expect(result1.timestamp).toBe(DEMO_FROZEN_TIMESTAMP);
      expect(result2.timestamp).toBe(DEMO_FROZEN_TIMESTAMP);

      // Check that both have the expected structure
      expect(result1.checks.length).toBe(result2.checks.length);
      expect(result1.checks.map((c) => c.id).sort()).toEqual(result2.checks.map((c) => c.id).sort());

      const findingsCount1 = result1.checks.reduce((sum, c) => sum + (c.findings?.length || 0), 0);
      const findingsCount2 = result2.checks.reduce((sum, c) => sum + (c.findings?.length || 0), 0);
      expect(findingsCount1).toBe(findingsCount2);
    });
  });

  describe('executeReviewGuard', () => {
    it('should detect security vulnerabilities', async () => {
      const results = await demoPipelineService.executeReviewGuard();
      const securityCheck = results.find((c) => c.id === 'rg-security');

      expect(securityCheck).toBeDefined();
      expect(securityCheck?.findings?.length).toBeGreaterThan(0);

      const sqlInjectionFinding = securityCheck?.findings?.find(
        (f) => f.title.includes('SQL injection')
      );
      expect(sqlInjectionFinding).toBeDefined();
      expect(sqlInjectionFinding?.severity).toBe('critical');
    });

    it('should detect hardcoded secrets', async () => {
      const results = await demoPipelineService.executeReviewGuard();
      const securityCheck = results.find((c) => c.id === 'rg-security');

      const secretFinding = securityCheck?.findings?.find(
        (f) => f.title.includes('Hardcoded secret')
      );
      expect(secretFinding).toBeDefined();
      expect(secretFinding?.severity).toBe('high');
    });

    it('should detect regex vulnerabilities', async () => {
      const results = await demoPipelineService.executeReviewGuard();
      const qualityCheck = results.find((c) => c.id === 'rg-quality');

      const regexFinding = qualityCheck?.findings?.find(
        (f) => f.title.includes('regex') || f.title.includes('ReDoS')
      );
      expect(regexFinding).toBeDefined();
      expect(regexFinding?.severity).toBe('critical');
    });
  });

  describe('executeTestEngine', () => {
    it('should generate test scaffolds', async () => {
      const results = await demoPipelineService.executeTestEngine();
      const unitTestCheck = results.find((c) => c.id === 'te-unit');

      expect(unitTestCheck).toBeDefined();
      expect(unitTestCheck?.metrics?.testsGenerated).toBeGreaterThan(0);
      expect(unitTestCheck?.artifacts?.length).toBeGreaterThan(0);

      const testArtifact = unitTestCheck?.artifacts?.find((a) => a.type === 'test');
      expect(testArtifact).toBeDefined();
      expect(testArtifact?.content).toContain('describe');
      expect(testArtifact?.content).toContain('it(');
    });
  });

  describe('executeDocSync', () => {
    it('should generate OpenAPI documentation', async () => {
      const results = await demoPipelineService.executeDocSync();
      const openapiCheck = results.find((c) => c.id === 'ds-openapi');

      expect(openapiCheck).toBeDefined();
      expect(openapiCheck?.artifacts?.length).toBeGreaterThan(0);

      const openapiArtifact = openapiCheck?.artifacts?.find((a) => a.type === 'openapi');
      expect(openapiArtifact).toBeDefined();
      expect(openapiArtifact?.content).toContain('openapi:');
      expect(openapiArtifact?.content).toContain('/api/users');
    });

    it('should generate README updates', async () => {
      const results = await demoPipelineService.executeDocSync();
      const readmeCheck = results.find((c) => c.id === 'ds-readme');

      expect(readmeCheck).toBeDefined();
      expect(readmeCheck?.artifacts?.length).toBeGreaterThan(0);

      const readmeArtifact = readmeCheck?.artifacts?.find((a) => a.type === 'readme');
      expect(readmeArtifact).toBeDefined();
      expect(readmeArtifact?.content).toContain('API Documentation');
    });

    it('should generate changelog entries with frozen date', async () => {
      const results = await demoPipelineService.executeDocSync();
      const changelogCheck = results.find((c) => c.id === 'ds-changelog');

      expect(changelogCheck).toBeDefined();
      expect(changelogCheck?.artifacts?.length).toBeGreaterThan(0);

      const changelogArtifact = changelogCheck?.artifacts?.find((a) => a.type === 'changelog');
      expect(changelogArtifact).toBeDefined();
      expect(changelogArtifact?.content).toContain('##');
      expect(changelogArtifact?.content).toContain(`## [1.0.0] - ${DEMO_FROZEN_DATE}`);
    });
  });

  describe('deterministic behavior', () => {
    it('should produce identical findings structure across runs', async () => {
      const [result1, result2] = await Promise.all([
        demoPipelineService.executeFullPipeline(),
        demoPipelineService.executeFullPipeline(),
      ]);

      const findings1 = result1.checks.flatMap((c) => c.findings || []);
      const findings2 = result2.checks.flatMap((c) => c.findings || []);

      expect(findings1.length).toBe(findings2.length);

      const findingTypes1 = findings1.map((f) => ({ severity: f.severity, title: f.title }));
      const findingTypes2 = findings2.map((f) => ({ severity: f.severity, title: f.title }));

      expect(findingTypes1.sort((a, b) => a.title.localeCompare(b.title)))
        .toEqual(findingTypes2.sort((a, b) => a.title.localeCompare(b.title)));
    });
  });
});
