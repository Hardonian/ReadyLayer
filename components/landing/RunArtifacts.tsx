'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Download, Code, BarChart3, TestTube } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { fadeIn, staggerContainer } from '@/lib/design/motion'

interface RunArtifactsProps {
  className?: string
}

const artifactExamples = [
  {
    id: 'sarif',
    name: 'Review Report (SARIF)',
    icon: FileText,
    description: 'Security and quality findings in SARIF format',
    format: 'JSON',
    size: '12.3 KB',
    preview: `{
  "version": "2.1.0",
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema.json",
  "runs": [{
    "tool": {
      "driver": {
        "name": "ReadyLayer Review Guard",
        "version": "1.0.0"
      }
    },
    "results": [{
      "ruleId": "hardcoded-secret",
      "level": "error",
      "message": {
        "text": "Potential API key found in code"
      },
      "locations": [{
        "physicalLocation": {
          "artifactLocation": {
            "uri": "src/auth.ts"
          },
          "region": {
            "startLine": 23
          }
        }
      }]
    }]
  }]
}`,
  },
  {
    id: 'junit',
    name: 'Test Results (JUnit XML)',
    icon: TestTube,
    description: 'Test execution results in JUnit XML format',
    format: 'XML',
    size: '8.7 KB',
    preview: `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="auth.test.ts" tests="5" failures="0" time="1.23">
    <testcase name="should validate email" time="0.12"/>
    <testcase name="should reject invalid email" time="0.08"/>
    <testcase name="should hash password" time="0.15"/>
    <testcase name="should verify password" time="0.11"/>
    <testcase name="should generate token" time="0.22"/>
  </testsuite>
</testsuites>`,
  },
  {
    id: 'coverage',
    name: 'Coverage Report',
    icon: BarChart3,
    description: 'Code coverage delta and metrics',
    format: 'JSON',
    size: '4.2 KB',
    preview: `{
  "coverage": {
    "total": 87,
    "delta": 3,
    "threshold": 80,
    "status": "pass"
  },
  "files": [{
    "path": "src/auth.ts",
    "coverage": 92,
    "delta": 5
  }]
}`,
  },
  {
    id: 'docs',
    name: 'Documentation Diffs',
    icon: Code,
    description: 'Generated documentation changes',
    format: 'Markdown',
    size: '15.8 KB',
    preview: `# API Changes

## Added Endpoints

### POST /api/users
- **Summary**: Create a new user
- **Request Body**: CreateUserDto
- **Response**: 201 User

## Updated Endpoints

### GET /api/users/:id
- **Added**: Pagination support
- **Query Params**: page, limit`,
  },
]

export function RunArtifacts({ className }: RunArtifactsProps) {
  const [selectedArtifact, setSelectedArtifact] = React.useState(() => {
    try {
      return artifactExamples[0]?.id || 'sarif'
    } catch {
      return 'sarif'
    }
  })
  const prefersReducedMotion = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  const artifact = React.useMemo(() => {
    try {
      return artifactExamples.find((a) => a.id === selectedArtifact) || artifactExamples[0] || artifactExamples[0]
    } catch {
      return artifactExamples[0]
    }
  }, [selectedArtifact])
  
  const Icon = artifact?.icon || FileText

  return (
    <motion.section
      className={cn('w-full space-y-6', className)}
      variants={prefersReducedMotion ? fadeIn : staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <FileText className="h-6 w-6" />
          Run Artifacts
        </h2>
        <p className="text-text-muted">
          Every ReadyLayer run produces machine-readable artifacts for compliance, CI/CD integration, and audit trails.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Artifact Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {artifactExamples.map((art) => {
              const ArtIcon = art.icon
              return (
                <button
                  key={art.id}
                  onClick={() => setSelectedArtifact(art.id)}
                  className={cn(
                    'p-3 rounded-md border transition-colors text-left',
                    selectedArtifact === art.id
                      ? 'border-accent bg-accent-muted/20'
                      : 'border-border-subtle bg-surface-raised hover:bg-surface-hover'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ArtIcon className="h-4 w-4" />
                    <span className="text-xs font-semibold">{art.name}</span>
                  </div>
                  <div className="text-xs text-text-muted">
                    {art.format} • {art.size}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                <div>
                  <div className="font-semibold">{artifact.name}</div>
                  <div className="text-xs text-text-muted">{artifact.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {artifact.format}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {artifact.size}
                </Badge>
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-border-subtle bg-surface-muted p-4 overflow-x-auto">
              <pre className="text-xs font-mono text-text-muted whitespace-pre-wrap">
                {artifact.preview}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 rounded-md border border-border-subtle bg-surface-muted">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-accent mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold mb-1">Exportable & Integrable</div>
            <p className="text-sm text-text-muted">
              All artifacts are available via API and can be downloaded from the dashboard. SARIF reports integrate
              with GitHub Security, JUnit XML works with CI/CD systems, and coverage reports feed into your monitoring
              tools.
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
