/**
 * Demo Mode Pipeline Service
 *
 * Executes the full ReadyLayer pipeline against deterministic fixtures
 * without requiring external credentials. Demonstrates:
 * - Review Guard: Security, performance, and quality scans
 * - Test Engine: Unit test generation and coverage analysis
 * - Doc Sync: OpenAPI spec and documentation updates
 */

import { sandboxFiles, sandboxPRMetadata } from '../../content/demo/sandboxFixtures';
import { startHotPathTracker } from '../../observability/hot-path';

export interface DemoFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  file: string;
  line: number;
  checkId: string;
  checkName: string;
}

export interface DemoCheckResult {
  id: string;
  name: string;
  category: 'review-guard' | 'test-engine' | 'doc-sync';
  status: 'success' | 'failure' | 'error';
  duration: number;
  findings?: DemoFinding[];
  metrics?: {
    findingsCount?: number;
    testsGenerated?: number;
    coverageDelta?: number;
    docsUpdated?: number;
  };
  artifacts?: DemoArtifact[];
  error?: string;
}

export interface DemoArtifact {
  type: 'openapi' | 'readme' | 'changelog' | 'test';
  summary: string;
  content: string;
  diff?: string;
}

export interface DemoPipelineResult {
  runId: string;
  timestamp: string;
  pr: {
    number: number;
    sha: string;
    title: string;
  };
  checks: DemoCheckResult[];
  decision: {
    status: 'ready' | 'blocked';
    reason?: string;
  };
  artifacts: DemoArtifact[];
}

const DEMO_RUN_ID = process.env.DEMO_RUN_ID ?? `demo_${sandboxPRMetadata.prSha}`;

/**
 * Frozen timestamp for deterministic demo results.
 * Every demo run produces the same timestamp so assertions and snapshots are stable.
 */
export const DEMO_FROZEN_TIMESTAMP = '2024-01-15T10:30:00.000Z';
export const DEMO_FROZEN_DATE = '2024-01-15';

function generateDeterministicFindingId(checkId: string, index: number): string {
  return `${checkId}_finding_${index}`;
}

function createFinding(
  checkId: string,
  checkName: string,
  id: string,
  severity: DemoFinding['severity'],
  title: string,
  description: string,
  file: string,
  line: number
): DemoFinding {
  return {
    id,
    severity,
    title,
    description,
    file,
    line,
    checkId,
    checkName,
  };
}

function analyzeCodeForSecurity(filePath: string, content: string): DemoFinding[] {
  const findings: DemoFinding[] = [];

  if (filePath.endsWith('auth.ts')) {
    if (content.includes('FAKE_STRIPE_KEY')) {
      findings.push(
        createFinding(
          'rg-security',
          'Review Guard - Security scan',
          generateDeterministicFindingId('rg-security', 0),
          'high',
          'Hardcoded secret detected',
          'Potential API key found in code. Use environment variables instead.',
          filePath,
          10
        )
      );
    }

    const hasSqlInjection = content.includes("SELECT * FROM users WHERE username = '${username}'");
    if (hasSqlInjection) {
      findings.push(
        createFinding(
          'rg-security',
          'Review Guard - Security scan',
          generateDeterministicFindingId('rg-security', 1),
          'critical',
          'SQL injection vulnerability detected',
          'User input is concatenated directly into SQL query. Use parameterized queries.',
          filePath,
          14
        )
      );
    }
  }

  if (filePath.endsWith('validation.ts')) {
    if (content.includes('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/')) {
      findings.push(
        createFinding(
          'rg-quality',
          'Review Guard - Quality scan',
          generateDeterministicFindingId('rg-quality', 0),
          'critical',
          'Unsafe regex backtracking detected',
          'Regular expression may cause ReDoS vulnerability. Consider using a library or limiting input length.',
          filePath,
          12
        )
      );
    }
  }

  return findings;
}

function analyzeCodeForPerformance(filePath: string, content: string): DemoFinding[] {
  const findings: DemoFinding[] = [];

  if (filePath.includes('users.ts') && content.includes('SELECT')) {
    if (!content.includes('LIMIT') && !content.includes('.limit(')) {
      findings.push(
        createFinding(
          'rg-performance',
          'Review Guard - Performance scan',
          generateDeterministicFindingId('rg-performance', 0),
          'medium',
          'Missing query pagination',
          'Database queries should include pagination to prevent loading excessive data.',
          filePath,
          8
        )
      );
    }
  }

  return findings;
}

export class DemoPipelineService {
  async executeReviewGuard(): Promise<DemoCheckResult[]> {
    const results: DemoCheckResult[] = [];

    const securityCheck: DemoCheckResult = {
      id: 'rg-security',
      name: 'Review Guard - Security scan',
      category: 'review-guard',
      status: 'success',
      duration: 1,
      findings: [],
      metrics: { findingsCount: 0 },
    };

    const performanceCheck: DemoCheckResult = {
      id: 'rg-performance',
      name: 'Review Guard - Performance scan',
      category: 'review-guard',
      status: 'success',
      duration: 1,
      findings: [],
      metrics: { findingsCount: 0 },
    };

    const qualityCheck: DemoCheckResult = {
      id: 'rg-quality',
      name: 'Review Guard - Quality scan',
      category: 'review-guard',
      status: 'success',
      duration: 1,
      findings: [],
      metrics: { findingsCount: 0 },
    };

    for (const file of sandboxFiles) {
      const securityFindings = analyzeCodeForSecurity(file.path, file.content);
      if (securityFindings.length > 0) {
        securityCheck.findings!.push(...securityFindings);
      }

      const performanceFindings = analyzeCodeForPerformance(file.path, file.content);
      if (performanceFindings.length > 0) {
        performanceCheck.findings!.push(...performanceFindings);
      }

      if (file.path.endsWith('validation.ts') && securityFindings.length > 0) {
        qualityCheck.findings!.push(...securityFindings);
      }
    }

    securityCheck.metrics!.findingsCount = securityCheck.findings!.length;
    if (securityCheck.findings!.length > 0) {
      securityCheck.status = securityCheck.findings!.some((f) => f.severity === 'critical')
        ? 'failure'
        : 'success';
    }
    results.push(securityCheck);

    performanceCheck.metrics!.findingsCount = performanceCheck.findings!.length;
    results.push(performanceCheck);

    qualityCheck.metrics!.findingsCount = qualityCheck.findings!.length;
    if (qualityCheck.findings!.length > 0) {
      qualityCheck.status = 'failure';
    }
    results.push(qualityCheck);

    return results;
  }

  async executeTestEngine(): Promise<DemoCheckResult[]> {
    const results: DemoCheckResult[] = [];

    const unitTestCheck: DemoCheckResult = {
      id: 'te-unit',
      name: 'Test Engine - Unit tests generated',
      category: 'test-engine',
      status: 'success',
      duration: 1,
      metrics: { testsGenerated: 0 },
      artifacts: [],
    };

    const testCount = sandboxFiles.filter(
      (f) => f.path.endsWith('.ts') && !f.path.includes('test')
    ).length;

    unitTestCheck.metrics!.testsGenerated = testCount;
    unitTestCheck.artifacts!.push({
      type: 'test',
      summary: `Generated ${testCount} unit tests`,
      content: `// Auto-generated test scaffolds for sandbox demo
// These tests would execute against the sandbox files

import { describe, it, expect } from 'vitest';

describe('Sandbox Demo Tests', () => {
  describe('auth.ts', () => {
    it('should validate email format', () => {
      // Test email validation
    });

    it('should handle login securely', () => {
      // Test secure authentication
    });
  });

  describe('validation.ts', () => {
    it('should reject invalid emails', () => {
      // Test validation logic
    });
  });
});`,
    });

    results.push(unitTestCheck);

    const coverageCheck: DemoCheckResult = {
      id: 'te-coverage',
      name: 'Test Engine - Coverage analysis',
      category: 'test-engine',
      status: 'success',
      duration: 0,
      metrics: { coverageDelta: 5 },
    };

    results.push(coverageCheck);

    return results;
  }

  async executeDocSync(): Promise<DemoCheckResult[]> {
    const results: DemoCheckResult[] = [];

    const openapiCheck: DemoCheckResult = {
      id: 'ds-openapi',
      name: 'Doc Sync - OpenAPI specification',
      category: 'doc-sync',
      status: 'success',
      duration: 0,
      metrics: { docsUpdated: 1 },
      artifacts: [
        {
          type: 'openapi',
          summary: 'Updated OpenAPI specification',
          content: `openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
paths:
  /api/users:
    get:
      summary: Get user by ID
      parameters:
        - name: id
          in: query
          schema:
            type: string
      responses:
        '200':
          description: User found
    post:
      summary: Create user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string
                email:
                  type: string
                password:
                  type: string
      responses:
        '201':
          description: User created`,
        },
      ],
    };

    results.push(openapiCheck);

    const readmeCheck: DemoCheckResult = {
      id: 'ds-readme',
      name: 'Doc Sync - README updates',
      category: 'doc-sync',
      status: 'success',
      duration: 0,
      metrics: { docsUpdated: 1 },
      artifacts: [
        {
          type: 'readme',
          summary: 'Updated README documentation',
          content: `## User API Documentation

### Endpoints

#### GET /api/users?id={id}
Retrieve a user by ID.

\`\`\`typescript
const response = await fetch('/api/users?id=user-123');
const user = await response.json();
\`\`\`

#### POST /api/users
Create a new user.

\`\`\`typescript
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'johndoe',
    email: 'john@example.com',
    password: 'SecurePass123',
  }),
});
\`\`\``,
        },
      ],
    };

    results.push(readmeCheck);

    const changelogCheck: DemoCheckResult = {
      id: 'ds-changelog',
      name: 'Doc Sync - Changelog entry',
      category: 'doc-sync',
      status: 'success',
      duration: 0,
      metrics: { docsUpdated: 1 },
      artifacts: [
        {
          type: 'changelog',
          summary: 'Added changelog entry',
          content: `## [1.0.0] - ${DEMO_FROZEN_DATE}

### Added
- Initial sandbox demo implementation
- User authentication endpoints
- Input validation utilities
- OpenAPI specification
- Unit test scaffolds

### Security
- SQL injection vulnerabilities documented
- Hardcoded secrets flagged
- ReDoS patterns identified`,
        },
      ],
    };

    results.push(changelogCheck);

    return results;
  }

  async executeFullPipeline(): Promise<DemoPipelineResult> {
    const tracker = startHotPathTracker({
      requestId: DEMO_RUN_ID,
      route: '/api/demo',
      operation: 'demo_pipeline',
    });

    try {
      const [reviewGuardResults, testEngineResults, docSyncResults] = await Promise.all([
        this.executeReviewGuard(),
        this.executeTestEngine(),
        this.executeDocSync(),
      ]);

      const allChecks = [...reviewGuardResults, ...testEngineResults, ...docSyncResults];
      const allArtifacts = [
        ...(testEngineResults.flatMap((r) => r.artifacts || []) as DemoArtifact[]),
        ...(docSyncResults.flatMap((r) => r.artifacts || []) as DemoArtifact[]),
      ];

      const criticalFailures = reviewGuardResults.filter(
        (r) => r.status === 'failure' && r.findings?.some((f) => f.severity === 'critical')
      );

      const decision: DemoPipelineResult['decision'] =
        criticalFailures.length > 0
          ? {
              status: 'blocked',
              reason: `Critical findings must be resolved before merging. Run again after fixing security issues.`,
            }
          : { status: 'ready' };

      tracker.finish('ok', { checks: allChecks.length, artifacts: allArtifacts.length });

      return {
        runId: DEMO_RUN_ID,
        timestamp: DEMO_FROZEN_TIMESTAMP,
        pr: {
          number: sandboxPRMetadata.prNumber,
          sha: sandboxPRMetadata.prSha,
          title: sandboxPRMetadata.prTitle,
        },
        checks: allChecks,
        decision,
        artifacts: allArtifacts,
      };
    } catch (error) {
      tracker.finish('error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export const demoPipelineService = new DemoPipelineService();
