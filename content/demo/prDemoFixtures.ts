/**
 * Demo fixtures for Interactive PR Demo
 * 
 * These are static fixtures that simulate PR check states, findings, and diffs.
 * They are labeled as "Interactive Preview" to make it clear this is a simulation.
 */

export type CheckStatus = 'queued' | 'running' | 'success' | 'failure' | 'cancelled'

export interface PRCheck {
  id: string
  name: string
  status: CheckStatus
  duration?: number // in seconds
  category: 'review-guard' | 'test-engine' | 'doc-sync'
  details?: CheckDetails
  aiDetected?: boolean // Whether AI-generated code was detected
  reviewId?: string // Transparency: review ID for audit trail
  timestamp?: string // When the check ran
  metrics?: {
    findingsCount?: number
    coverageDelta?: number
    testsGenerated?: number
    docsUpdated?: number
  }
}

export interface CheckDetails {
  findings?: Finding[]
  testLog?: string[]
  docChanges?: DocChange[]
}

export interface Finding {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  file: string
  line: number
}

export interface DocChange {
  type: 'openapi' | 'readme' | 'changelog'
  summary: string
  diff?: string
}

export interface CodeDiff {
  file: string
  language: string
  additions: number
  deletions: number
  hunks: DiffHunk[]
}

export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  content: string
  annotations?: Annotation[]
}

export interface Annotation {
  line: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  checkId: string
}

// Demo PR checks timeline
export const demoChecks: PRCheck[] = [
  {
    id: 'rg-security',
    name: 'Review Guard - Security scan',
    status: 'success',
    duration: 12,
    category: 'review-guard',
    aiDetected: true,
    reviewId: 'rev-abc123',
    timestamp: '2024-01-15T10:23:45Z',
    metrics: {
      findingsCount: 2,
    },
    details: {
      findings: [
        {
          id: 'f1',
          severity: 'high',
          title: 'Hardcoded secret detected',
          description: 'Potential API key found in code. Use environment variables instead.',
          file: 'src/auth.ts',
          line: 23,
        },
        {
          id: 'f2',
          severity: 'medium',
          title: 'N+1 query risk',
          description: 'Database query pattern may cause performance issues.',
          file: 'src/users.ts',
          line: 45,
        },
      ],
    },
  },
  {
    id: 'rg-performance',
    name: 'Review Guard - Performance scan',
    status: 'success',
    duration: 8,
    category: 'review-guard',
    aiDetected: true,
    reviewId: 'rev-def456',
    timestamp: '2024-01-15T10:23:53Z',
    metrics: {
      findingsCount: 0,
    },
  },
  {
    id: 'rg-quality',
    name: 'Review Guard - Quality scan',
    status: 'failure',
    duration: 15,
    category: 'review-guard',
    aiDetected: true,
    reviewId: 'rev-ghi789',
    timestamp: '2024-01-15T10:24:01Z',
    metrics: {
      findingsCount: 1,
    },
    details: {
      findings: [
        {
          id: 'f3',
          severity: 'critical',
          title: 'Unsafe regex backtracking',
          description: 'Regular expression may cause ReDoS vulnerability.',
          file: 'src/validation.ts',
          line: 67,
        },
      ],
    },
  },
  {
    id: 'te-unit',
    name: 'Test Engine - Unit tests generated/updated',
    status: 'success',
    duration: 20,
    category: 'test-engine',
    aiDetected: true,
    reviewId: 'rev-jkl012',
    timestamp: '2024-01-15T10:24:16Z',
    metrics: {
      testsGenerated: 3,
    },
    details: {
      testLog: [
        'Generated test: auth.test.ts',
        'Generated test: users.test.ts',
        'Updated test: validation.test.ts',
        'All tests passing (12/12)',
      ],
    },
  },
  {
    id: 'te-coverage',
    name: 'Test Engine - Coverage delta',
    status: 'success',
    duration: 5,
    category: 'test-engine',
    aiDetected: true,
    reviewId: 'rev-mno345',
    timestamp: '2024-01-15T10:24:36Z',
    metrics: {
      coverageDelta: 3,
    },
    details: {
      testLog: [
        'Coverage: 87% (+3%)',
        'Threshold met: ✓',
      ],
    },
  },
  {
    id: 'ds-openapi',
    name: 'Doc Sync - OpenAPI update',
    status: 'success',
    duration: 6,
    category: 'doc-sync',
    aiDetected: true,
    reviewId: 'rev-pqr678',
    timestamp: '2024-01-15T10:24:41Z',
    metrics: {
      docsUpdated: 1,
    },
    details: {
      docChanges: [
        {
          type: 'openapi',
          summary: 'Updated /api/users endpoint schema',
          diff: '+ POST /api/users\n+ Request body: CreateUserDto\n+ Response: 201 User',
        },
      ],
    },
  },
  {
    id: 'ds-readme',
    name: 'Doc Sync - README delta',
    status: 'success',
    duration: 4,
    category: 'doc-sync',
    aiDetected: true,
    reviewId: 'rev-stu901',
    timestamp: '2024-01-15T10:24:47Z',
    metrics: {
      docsUpdated: 1,
    },
    details: {
      docChanges: [
        {
          type: 'readme',
          summary: 'Updated API usage examples',
        },
      ],
    },
  },
  {
    id: 'ds-changelog',
    name: 'Doc Sync - Changelog entry',
    status: 'success',
    duration: 3,
    category: 'doc-sync',
    aiDetected: true,
    reviewId: 'rev-vwx234',
    timestamp: '2024-01-15T10:24:51Z',
    metrics: {
      docsUpdated: 1,
    },
    details: {
      docChanges: [
        {
          type: 'changelog',
          summary: 'Added changelog entry for v1.2.0',
        },
      ],
    },
  },
]

// Demo code diff
export const demoDiff: CodeDiff = {
  file: 'src/validation.ts',
  language: 'typescript',
  additions: 15,
  deletions: 8,
  hunks: [
    {
      oldStart: 60,
      oldLines: 8,
      newStart: 60,
      newLines: 15,
      content: `@@ -60,8 +60,15 @@ export function validateEmail(email: string): boolean {
       if (!email) return false
-      const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/
+      const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/
       return pattern.test(email)
     }
+
+    export function validatePassword(password: string): boolean {
+      if (!password || password.length < 8) return false
+      const hasUpper = /[A-Z]/.test(password)
+      const hasLower = /[a-z]/.test(password)
+      const hasNumber = /[0-9]/.test(password)
+      return hasUpper && hasLower && hasNumber
+    }`,
      annotations: [
        {
          line: 67,
          severity: 'critical',
          message: 'Unsafe regex backtracking detected',
          checkId: 'rg-quality',
        },
      ],
    },
  ],
}

// Demo doc updates
export const demoDocUpdates = {
  openapi: {
    summary: 'OpenAPI spec updated',
    content: `openapi: 3.0.0
info:
  title: User API
  version: 1.2.0
paths:
  /api/users:
    post:
      summary: Create user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserDto'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'`,
  },
  readme: {
    summary: 'README updated',
    content: `## API Usage

### Create User

\`\`\`typescript
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123',
  }),
})
\`\`\``,
  },
}
