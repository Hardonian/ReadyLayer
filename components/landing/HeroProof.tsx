'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/ui/container'
import { Logo } from '@/components/ui/logo'
import { fadeIn, staggerContainer, staggerItem } from '@/lib/design/motion'
import {
  Shield,
  TestTube,
  FileText,
  Github,
  Gitlab,
  Code,
  Play,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react'
import { InteractivePRDemo } from './InteractivePRDemo'
import { cn } from '@/lib/utils'
import { PUBLIC_NAV_ITEMS } from '@/lib/navigation'

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
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="relative z-10">
        <motion.header
          className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 bg-gradient-to-b from-blue-50 via-indigo-50/80 to-transparent dark:from-gray-900 dark:via-gray-800/80 dark:to-transparent overflow-visible"
          variants={prefersReducedMotion ? fadeIn : fadeIn}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between w-full overflow-visible gap-6">
            <nav className="hidden sm:flex items-center gap-3 md:gap-4 lg:gap-6 flex-1 overflow-visible min-w-0">
              {PUBLIC_NAV_ITEMS.slice(0, 4).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-xs md:text-sm text-text-muted hover:text-text-primary transition-colors font-bold whitespace-nowrap leading-none"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <Link
              href="/"
              className="flex-shrink-0 hover:opacity-80 transition-opacity overflow-visible flex items-center"
              aria-label="ReadyLayer Home"
            >
              <div className="scale-50 origin-center overflow-visible will-change-transform" style={{ height: 'auto', minHeight: 'auto' }}>
                <Logo variant="full" size="sm" />
              </div>
            </Link>
          </div>
        </motion.header>

        <Container size="lg" className="relative py-16 sm:py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div
              className="space-y-8"
              variants={prefersReducedMotion ? fadeIn : staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-6">
                  <Badge variant="outline" className="flex items-center gap-1.5 flex-shrink-0">
                    <Shield className="h-3.5 w-3.5" />
                    Open-source governance
                  </Badge>
                  <Badge variant="info" className="flex items-center gap-1.5 flex-shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Deterministic checks
                  </Badge>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold tracking-tight mb-4 leading-tight">
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Open-source governance
                  </span>
                  <br />
                  <span className="text-text-primary">for AI-generated code</span>
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-text-muted max-w-xl mb-2">
                  ReadyLayer is a composable governance framework for AI-generated code. Integrate with Git and CI, apply deterministic policy checks, and ship traceable decisions.
                </p>
                <p className="text-sm text-text-muted max-w-xl">
                  Get your first governed PR in 10 minutes with OSS-first workflows.{' '}
                  <Link href="/how-it-works" className="text-accent hover:underline font-medium">
                    See how it works →
                  </Link>
                </p>
              </motion.div>

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
                  <div className="p-2 rounded-md bg-info-muted flex-shrink-0">
                    <Shield className="h-5 w-5 text-info" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold mb-1">Review Guard</div>
                    <div className="text-sm text-text-muted">
                      Deterministic security, performance, and quality checks that attach policy versions to every decision.
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  variants={prefersReducedMotion ? fadeIn : staggerItem}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border-subtle bg-surface-raised"
                >
                  <div className="p-2 rounded-md bg-success-muted flex-shrink-0">
                    <TestTube className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold mb-1">Test Engine</div>
                    <div className="text-sm text-text-muted">
                      Deterministic test generation and coverage enforcement that can plug into existing CI workflows.
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  variants={prefersReducedMotion ? fadeIn : staggerItem}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border-subtle bg-surface-raised"
                >
                  <div className="p-2 rounded-md bg-accent-muted flex-shrink-0">
                    <FileText className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold mb-1">Doc Sync</div>
                    <div className="text-sm text-text-muted">
                      Deterministic doc synchronization so governance signals stay aligned with the code that shipped.
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
                <div className="p-4 rounded-lg border border-border-subtle bg-gradient-to-r from-primary/5 to-purple-500/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-semibold">Governance artifacts</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />
                      <span className="text-text-muted">Review decisions with policy hashes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                      <span className="text-text-muted">Failure modes captured on every run</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-info flex-shrink-0" />
                      <span className="text-text-muted">Traceable audit artifacts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                      <span className="text-text-muted">Deterministic outcomes you can verify</span>
                    </div>
                  </div>
                  <div className="text-xs text-text-muted p-2 bg-background/50 rounded border border-primary/20">
                    ReadyLayer is open-source and model-agnostic. It enforces governance without replacing your existing tests or approvals.
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="flex flex-wrap gap-3"
                variants={prefersReducedMotion ? fadeIn : staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
                  <Button asChild size="lg" className="shadow-lg">
                    <Link href="/docs">Get started (OSS)</Link>
                  </Button>
                </motion.div>
                <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/docs">View docs</Link>
                  </Button>
                </motion.div>
                <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
                  <Button asChild variant="ghost" size="lg">
                    <a href="https://github.com/Hardonian/ReadyLayer" target="_blank" rel="noopener noreferrer">
                      See GitHub
                    </a>
                  </Button>
                </motion.div>
              </motion.div>

              <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span>Composable with</span>
                  <div className="flex items-center gap-3">
                    {integrationIcons.map(({ name, icon: Icon, color }) => (
                      <span key={name} className={cn('flex items-center gap-1', color)}>
                        <Icon className="h-3.5 w-3.5" />
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              className="relative"
              variants={prefersReducedMotion ? fadeIn : staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
                <div className="rounded-xl border border-border-subtle bg-surface-raised shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-surface-muted">
                    <div className="text-sm font-medium">Governed PR walkthrough</div>
                    <Button variant="ghost" size="sm" onClick={scrollToDemo} className="text-xs">
                      <Play className="h-3 w-3 mr-1" />
                      Replay
                    </Button>
                  </div>
                  <div ref={demoRef} className="p-4">
                    <InteractivePRDemo autoPlay={demoPlaying} onComplete={() => setDemoPlaying(false)} />
                  </div>
                </div>
              </motion.div>

              <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
                <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-text-muted">
                  <div className="p-3 rounded-lg border border-border-subtle bg-surface-muted">
                    <div className="font-semibold text-text-primary">PR → diff → checks → decision</div>
                    <div>Deterministic pipeline in minutes</div>
                  </div>
                  <div className="p-3 rounded-lg border border-border-subtle bg-surface-muted">
                    <div className="font-semibold text-text-primary">Model-agnostic</div>
                    <div>Use any AI assistant or none</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            className="mt-16 flex flex-col items-center gap-3 text-sm text-text-muted"
            variants={prefersReducedMotion ? fadeIn : staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.button
              variants={prefersReducedMotion ? fadeIn : staggerItem}
              onClick={scrollToDemo}
              className="flex items-center gap-2 hover:text-text transition-colors"
            >
              See the decision flow
              <ChevronDown className="h-4 w-4" />
            </motion.button>
          </motion.div>
        </Container>
      </div>
    </section>
  )
}
