'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/ui/container'
import { fadeIn, slideUp, staggerContainer, staggerItem } from '@/lib/design/motion'
import { Shield, TestTube, FileText, Github, Gitlab, Code, Play } from 'lucide-react'
import { InteractivePRDemo } from './InteractivePRDemo'
import { cn } from '@/lib/utils'

interface HeroProofProps {
  user?: { email?: string; user_metadata?: { full_name?: string } } | null
}

const integrationIcons = [
  { name: 'GitHub', icon: Github, color: 'text-[#24292e] dark:text-white' },
  { name: 'GitLab', icon: Gitlab, color: 'text-[#FC6D26]' },
  { name: 'Bitbucket', icon: Code, color: 'text-[#0052CC]' },
]

export function HeroProof({ user }: HeroProofProps) {
  const [demoPlaying, setDemoPlaying] = React.useState(false)
  const demoRef = React.useRef<HTMLDivElement>(null)

  const scrollToDemo = () => {
    demoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => setDemoPlaying(true), 500)
  }

  const prefersReducedMotion = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <Container size="lg" className="relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Value Prop */}
          <motion.div
            className="space-y-8"
            variants={prefersReducedMotion ? fadeIn : staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
              <Badge variant="outline" className="mb-4">
                AI Code Readiness Platform
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Blocks risky AI code
                </span>
                <br />
                <span className="text-text-primary">before it reaches main</span>
              </h1>
              <p className="text-xl text-text-muted max-w-xl">
                Runs in your PR checks. Review Guard → Test Engine → Doc Sync. Deterministic gates with full audit trail.
              </p>
            </motion.div>

            {/* Three Pillars */}
            <motion.div
              className="space-y-4"
              variants={prefersReducedMotion ? fadeIn : staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div
                variants={prefersReducedMotion ? fadeIn : staggerItem}
                className="flex items-start gap-4 p-4 rounded-lg border border-border-subtle bg-surface-raised"
              >
                <div className="p-2 rounded-md bg-info-muted">
                  <Shield className="h-5 w-5 text-info" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold mb-1">Review Guard</div>
                  <div className="text-sm text-text-muted">
                    Security, performance, and quality scans catch AI errors before merge.
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={prefersReducedMotion ? fadeIn : staggerItem}
                className="flex items-start gap-4 p-4 rounded-lg border border-border-subtle bg-surface-raised"
              >
                <div className="p-2 rounded-md bg-success-muted">
                  <TestTube className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold mb-1">Test Engine</div>
                  <div className="text-sm text-text-muted">
                    Auto-generates tests and enforces coverage thresholds.
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={prefersReducedMotion ? fadeIn : staggerItem}
                className="flex items-start gap-4 p-4 rounded-lg border border-border-subtle bg-surface-raised"
              >
                <div className="p-2 rounded-md bg-accent-muted">
                  <FileText className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold mb-1">Doc Sync</div>
                  <div className="text-sm text-text-muted">
                    Keeps OpenAPI specs, READMEs, and changelogs in sync with code.
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Proof Microcopy */}
            <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
              <div className="flex flex-wrap gap-4 text-sm text-text-muted">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Runs on every AI-touched diff
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-info" />
                  Deterministic gates
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Audit trail
                </div>
              </div>
            </motion.div>

            {/* CTA Row */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              variants={prefersReducedMotion ? fadeIn : staggerItem}
            >
              {!user ? (
                <>
                  <Button asChild size="lg" className="flex-1">
                    <Link href="/auth/signin">
                      <Github className="mr-2 h-4 w-4" />
                      Connect GitHub
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={scrollToDemo}
                    className="flex-1"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    See it run
                  </Button>
                </>
              ) : (
                <Button asChild size="lg">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              )}
            </motion.div>

            {/* Works With */}
            <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
              <div className="text-xs text-text-muted mb-2">Works with</div>
              <div className="flex flex-wrap items-center gap-4">
                {integrationIcons.map((integration) => {
                  const Icon = integration.icon
                  return (
                    <div
                      key={integration.name}
                      className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors"
                    >
                      <Icon className={cn('h-5 w-5', integration.color)} />
                      <span className="text-sm font-medium">{integration.name}</span>
                    </div>
                  )
                })}
                <span className="text-sm text-text-muted">+ CI/CD, IDEs, Slack, Jira</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Side - Interactive Demo */}
          <motion.div
            ref={demoRef}
            variants={prefersReducedMotion ? fadeIn : slideUp}
            initial="hidden"
            animate="visible"
            className="lg:sticky lg:top-24"
          >
            <InteractivePRDemo autoPlay={demoPlaying} />
          </motion.div>
        </div>
      </Container>
    </section>
  )
}
