'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fadeIn, staggerContainer, staggerItem } from '@/lib/design/motion'
import {
  Shield,
  TestTube,
  FileText,
  Bot,
  Code,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Eye,
  GitBranch,
  Settings,
  Zap,
} from 'lucide-react'
import { PolicyPreview } from '@/components/landing/PolicyPreview'
import { FailureModes } from '@/components/landing/FailureModes'
import { RunArtifacts } from '@/components/landing/RunArtifacts'
import { IntegrationConfidence } from '@/components/landing/IntegrationConfidence'

export default function HowItWorksPage() {
  const prefersReducedMotion = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  return (
    <main className="min-h-screen py-12 lg:py-24">
      <Container size="lg" className="space-y-16">
        {/* Header */}
        <motion.div
          className="text-center space-y-4"
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
            <Badge variant="outline" className="mb-4">
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Decision Model
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              How ReadyLayer evaluates your PR
            </h1>
            <p className="text-xl text-text-muted max-w-3xl mx-auto">
              A deterministic, traceable decision model. Same diff + same policy = same outcome.
            </p>
          </motion.div>
        </motion.div>

        {/* Inputs Section */}
        <motion.section
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Code className="h-6 w-6" />
            Inputs
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="h-5 w-5 text-info" />
                  AI-touched diff detection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-text-muted">
                  ReadyLayer analyzes PR diffs to identify AI-generated code patterns:
                </p>
                <ul className="space-y-2 text-sm text-text-muted list-disc list-inside">
                  <li>Heuristic patterns (comment style, variable naming)</li>
                  <li>Code structure analysis (complexity, consistency)</li>
                  <li>Git metadata (commit message patterns, timing)</li>
                  <li>Context window indicators (unusual imports, missing context)</li>
                </ul>
                <div className="mt-4 p-3 rounded-md bg-surface-muted border border-border-subtle">
                  <div className="text-xs font-mono text-text-muted">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="info" className="text-xs">AI Detected</Badge>
                      <span>Confidence: 87%</span>
                    </div>
                    <div className="text-xs mt-2">
                      Triggers: Review Guard, Test Engine, Doc Sync
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-accent" />
                  Repo context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-text-muted">
                  ReadyLayer reads repository configuration to adapt checks:
                </p>
                <ul className="space-y-2 text-sm text-text-muted list-disc list-inside">
                  <li>Language detection (TypeScript, Python, Go, etc.)</li>
                  <li>Framework identification (Next.js, Django, Express)</li>
                  <li>Test framework (Jest, pytest, Mocha)</li>
                  <li>Existing policy configuration</li>
                  <li>Coverage thresholds</li>
                </ul>
                <div className="mt-4 p-3 rounded-md bg-surface-muted border border-border-subtle">
                  <div className="text-xs font-mono text-text-muted">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">TypeScript</Badge>
                      <Badge variant="outline" className="text-xs">Next.js</Badge>
                      <Badge variant="outline" className="text-xs">Jest</Badge>
                    </div>
                    <div className="text-xs mt-2">
                      Coverage threshold: 80%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.section>

        {/* Review Guard Section */}
        <motion.section
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Review Guard
          </h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Security, Performance, Quality Checks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-md border border-border-subtle bg-surface-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-danger" />
                    <span className="font-semibold text-sm">Security</span>
                  </div>
                  <ul className="text-xs text-text-muted space-y-1">
                    <li>• Hardcoded secrets</li>
                    <li>• SQL injection risks</li>
                    <li>• XSS vulnerabilities</li>
                    <li>• Dependency CVEs</li>
                    <li>• Auth bypass patterns</li>
                  </ul>
                </div>
                <div className="p-4 rounded-md border border-border-subtle bg-surface-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-warning" />
                    <span className="font-semibold text-sm">Performance</span>
                  </div>
                  <ul className="text-xs text-text-muted space-y-1">
                    <li>• N+1 query patterns</li>
                    <li>• Missing indexes</li>
                    <li>• Memory leaks</li>
                    <li>• Inefficient loops</li>
                    <li>• Large bundle sizes</li>
                  </ul>
                </div>
                <div className="p-4 rounded-md border border-border-subtle bg-surface-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="h-4 w-4 text-info" />
                    <span className="font-semibold text-sm">Quality</span>
                  </div>
                  <ul className="text-xs text-text-muted space-y-1">
                    <li>• ReDoS vulnerabilities</li>
                    <li>• Type safety issues</li>
                    <li>• Error handling gaps</li>
                    <li>• Code complexity</li>
                    <li>• Best practice violations</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-md border-2 border-border-strong bg-surface-raised">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-danger" />
                  <span className="font-semibold">Severity Mapping</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <Badge variant="destructive" className="text-xs">Critical</Badge>
                    <div className="text-text-muted mt-1">Blocks merge</div>
                  </div>
                  <div>
                    <Badge variant="destructive" className="text-xs">High</Badge>
                    <div className="text-text-muted mt-1">Blocks merge</div>
                  </div>
                  <div>
                    <Badge variant="warning" className="text-xs">Medium</Badge>
                    <div className="text-text-muted mt-1">Warns</div>
                  </div>
                  <div>
                    <Badge variant="info" className="text-xs">Low</Badge>
                    <div className="text-text-muted mt-1">Info only</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Test Engine Section */}
        <motion.section
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TestTube className="h-6 w-6" />
            Test Engine
          </h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">When tests are generated and enforced</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-md border border-border-subtle bg-surface-muted">
                  <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">Generation triggers</div>
                    <ul className="text-xs text-text-muted space-y-1 list-disc list-inside">
                      <li>AI-touched files detected in PR</li>
                      <li>New functions or classes added</li>
                      <li>API endpoints modified</li>
                      <li>Critical business logic changed</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-md border border-border-subtle bg-surface-muted">
                  <Shield className="h-5 w-5 text-warning mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">Enforcement rules</div>
                    <ul className="text-xs text-text-muted space-y-1 list-disc list-inside">
                      <li>Coverage must not drop below threshold (default: 80%)</li>
                      <li>All generated tests must pass</li>
                      <li>New code paths must have tests</li>
                      <li>Critical paths require integration tests</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-md border border-border-subtle bg-surface-muted">
                  <XCircle className="h-5 w-5 text-danger mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">What happens if coverage drops</div>
                    <ul className="text-xs text-text-muted space-y-1 list-disc list-inside">
                      <li>PR is blocked with clear error message</li>
                      <li>Coverage delta shown: e.g., &quot;Coverage: 75% (-5%)&quot;</li>
                      <li>Suggestions provided for missing test cases</li>
                      <li>Test generation re-attempted if possible</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Doc Sync Section */}
        <motion.section
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Doc Sync
          </h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What files are updated and when</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-md border border-border-subtle bg-surface-muted">
                  <div className="font-semibold text-sm mb-2">Files updated</div>
                  <ul className="text-xs text-text-muted space-y-1">
                    <li>• OpenAPI specs (API changes)</li>
                    <li>• README.md (usage examples)</li>
                    <li>• CHANGELOG.md (version notes)</li>
                    <li>• Architecture docs (if major changes)</li>
                  </ul>
                </div>
                <div className="p-4 rounded-md border border-border-subtle bg-surface-muted">
                  <div className="font-semibold text-sm mb-2">When docs are skipped</div>
                  <ul className="text-xs text-text-muted space-y-1">
                    <li>• No API changes detected</li>
                    <li>• Only test files modified</li>
                    <li>• Documentation-only PRs</li>
                    <li>• User explicitly disabled</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Gating Logic Section */}
        <motion.section
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Gating Logic
          </h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pass / Warn / Block Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 rounded-md border-2 border-success bg-success-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="font-semibold">PASS</span>
                  </div>
                  <ul className="text-sm text-text-muted space-y-1 list-disc list-inside">
                    <li>All Review Guard checks pass (no critical/high findings)</li>
                    <li>Test coverage meets or exceeds threshold</li>
                    <li>All generated tests pass</li>
                    <li>Doc Sync completes successfully (or skipped)</li>
                  </ul>
                </div>

                <div className="p-4 rounded-md border-2 border-warning bg-warning-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <span className="font-semibold">WARN</span>
                  </div>
                  <ul className="text-sm text-text-muted space-y-1 list-disc list-inside">
                    <li>Medium-severity findings present (non-blocking)</li>
                    <li>Coverage threshold met but close to limit</li>
                    <li>Doc generation warnings (non-critical)</li>
                    <li>Performance suggestions (optimization opportunities)</li>
                  </ul>
                </div>

                <div className="p-4 rounded-md border-2 border-danger bg-danger-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-danger" />
                    <span className="font-semibold">BLOCK</span>
                  </div>
                  <ul className="text-sm text-text-muted space-y-1 list-disc list-inside">
                    <li>Critical or high-severity security findings</li>
                    <li>Test coverage below threshold</li>
                    <li>Generated tests failing</li>
                    <li>Policy violations (configurable per repo)</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-md border border-border-subtle bg-surface-muted">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-accent" />
                  <span className="font-semibold text-sm">Deterministic behavior</span>
                </div>
                <p className="text-xs text-text-muted">
                  Same diff + same policy configuration = same outcome. All decisions are logged with review IDs for full traceability.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Policy Preview */}
        <motion.section
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Policy as Code
          </h2>
          <div className="prose prose-sm max-w-none">
            <p className="text-text-muted">
              Policies are defined in YAML/JSON and enforced deterministically. Toggle policies on/off to see how they affect PR outcomes.
            </p>
          </div>
          <PolicyPreview />
        </motion.section>

        {/* Failure Modes */}
        <FailureModes />

        {/* Run Artifacts */}
        <RunArtifacts />

        {/* Integration Confidence */}
        <IntegrationConfidence />

        {/* CTA */}
        <motion.div
          variants={prefersReducedMotion ? fadeIn : staggerItem}
          className="text-center space-y-4"
        >
          <Button asChild size="lg">
            <Link href="/">
              <ArrowRight className="mr-2 h-4 w-4" />
              See it in action
            </Link>
          </Button>
          <p className="text-sm text-text-muted">
            Or{' '}
            <Link href="/dashboard/repos/connect" className="text-accent hover:underline">
              connect a repository
            </Link>{' '}
            to try ReadyLayer
          </p>
        </motion.div>
      </Container>
    </main>
  )
}
