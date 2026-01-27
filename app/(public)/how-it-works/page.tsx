'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fadeIn, staggerContainer, staggerItem } from '@/lib/design/motion'
import { Shield, TestTube, FileText, CheckCircle2, ArrowRight, GitBranch } from 'lucide-react'
import { FailureModes } from '@/components/landing/FailureModes'
import { RunArtifacts } from '@/components/landing/RunArtifacts'

export default function HowItWorksPage(): React.JSX.Element {
  const prefersReducedMotion = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  return (
    <main className="min-h-screen py-12 lg:py-24">
      <Container size="lg" className="space-y-16">
        <motion.div
          className="text-center space-y-4"
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
            <Badge variant="outline" className="mb-4">
              <GitBranch className="h-3.5 w-3.5 mr-1.5" />
              Deterministic pipeline
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              PR → diff → checks → decision
            </h1>
            <p className="text-xl text-text-muted max-w-3xl mx-auto">
              ReadyLayer is a governance framework for AI-generated code. It is model-agnostic, composable with Git + CI,
              and deterministic where it matters.
            </p>
          </motion.div>
        </motion.div>

        <motion.section
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6" />
            Inputs
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">PR diff + repository context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-text-muted">
                  ReadyLayer reads the diff, repository config, and policy rules to determine which governance checks run.
                </p>
                <ul className="space-y-2 text-sm text-text-muted list-disc list-inside">
                  <li>Language + framework detection</li>
                  <li>Policy versions and thresholds</li>
                  <li>Test and coverage expectations</li>
                  <li>Documentation sync rules</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Policy configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-text-muted">
                  Policies are defined alongside the repo, versioned, and applied deterministically.
                </p>
                <div className="mt-4 p-3 rounded-md bg-surface-muted border border-border-subtle">
                  <div className="text-xs font-mono text-text-muted">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">Policy v1.4</Badge>
                      <span>Coverage threshold: 80%</span>
                    </div>
                    <div className="text-xs mt-2">Rules: tests required, docs synced, critical findings block</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.section>

        <motion.section
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Checks
          </h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Guard, Test Engine, Doc Sync</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-md border border-border-subtle bg-surface-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-danger" />
                    <span className="font-semibold text-sm">Review Guard</span>
                  </div>
                  <ul className="text-xs text-text-muted space-y-1">
                    <li>• Security and quality rules</li>
                    <li>• Policy-driven severities</li>
                    <li>• Deterministic outputs</li>
                  </ul>
                </div>
                <div className="p-4 rounded-md border border-border-subtle bg-surface-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <TestTube className="h-4 w-4 text-warning" />
                    <span className="font-semibold text-sm">Test Engine</span>
                  </div>
                  <ul className="text-xs text-text-muted space-y-1">
                    <li>• Test generation and enforcement</li>
                    <li>• Coverage thresholds</li>
                    <li>• CI-native execution</li>
                  </ul>
                </div>
                <div className="p-4 rounded-md border border-border-subtle bg-surface-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-info" />
                    <span className="font-semibold text-sm">Doc Sync</span>
                  </div>
                  <ul className="text-xs text-text-muted space-y-1">
                    <li>• Documentation drift detection</li>
                    <li>• Artifacts attached to the PR</li>
                    <li>• Traceable updates</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        <motion.section
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6" />
            Decision
          </h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deterministic outcomes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-text-muted">
                Decisions are traceable and repeatable. The same diff + policy yields the same decision every time.
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-md border border-border-subtle bg-surface-muted text-sm">
                  <div className="font-semibold">Pass</div>
                  <div className="text-text-muted">No blocking findings, coverage meets policy</div>
                </div>
                <div className="p-3 rounded-md border border-border-subtle bg-surface-muted text-sm">
                  <div className="font-semibold">Block</div>
                  <div className="text-text-muted">Critical finding or policy violation</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        <RunArtifacts />
        <FailureModes />

        <motion.section
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          animate="visible"
          className="text-center"
        >
          <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
            <Button asChild size="lg">
              <Link href="/docs">
                Get started (OSS)
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.section>
      </Container>
    </main>
  )
}
