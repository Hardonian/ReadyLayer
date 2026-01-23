'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/ui/container'
import { Logo } from '@/components/ui/logo'
import { fadeIn, slideUp, staggerContainer, staggerItem } from '@/lib/design/motion'
import { Shield, TestTube, FileText, Github, Gitlab, Code, Play, Bot, BarChart3, Eye, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react'
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
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Header with Logo and Minimalist Menu */}
      <motion.header
        className="absolute top-0 left-0 right-0 z-20 px-4 sm:px-6 lg:px-8 pt-2 pb-6"
        variants={prefersReducedMotion ? fadeIn : fadeIn}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center justify-between max-w-full">
          {/* Minimalist Menu */}
          <nav className="hidden sm:flex items-center gap-4 lg:gap-6 flex-1">
            {PUBLIC_NAV_ITEMS.slice(0, 4).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs sm:text-sm text-text-muted hover:text-text-primary transition-colors font-bold whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Logo - More centered */}
          <Link href="/" className="flex-shrink-0 hover:opacity-80 transition-opacity" aria-label="ReadyLayer Home">
            <div className="scale-50 origin-center">
              <Logo variant="full" size="sm" />
            </div>
          </Link>
        </div>
      </motion.header>

      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <Container size="lg" className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Side - Value Prop */}
          <motion.div
            className="space-y-8"
            variants={prefersReducedMotion ? fadeIn : staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5" />
                  AI Detection Enabled
                </Badge>
                <Badge variant="info" className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Full Transparency
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold tracking-tight mb-4 leading-tight">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  The default authority for
                </span>
                <br />
                <span className="text-text-primary">AI-generated code safety</span>
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-text-muted max-w-xl mb-2">
                Deterministic governance gates. Every decision is hashed, traceable, and defensible in audits.
              </p>
              <p className="text-sm text-text-muted max-w-xl">
                <strong className="text-text-primary">Inevitability Mode:</strong> If it passed ReadyLayer, we can defend it in audits, postmortems, and courtrooms. 
                If ReadyLayer didn&apos;t review it, that absence is visible.{' '}
                <Link href="/how-it-works" className="text-accent hover:underline font-medium">
                  See how it works →
                </Link>
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
                    Deterministic security, performance, and quality scans. Every finding is identified with policy version hash.
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
                    Deterministic test generation with coverage enforcement. Same inputs = same outputs.
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
                    Deterministic drift detection. Blocks PRs when docs fall out of sync.
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Cultural Lock-In Artifacts */}
            <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
              <div className="p-4 rounded-lg border border-border-subtle bg-gradient-to-r from-primary/5 to-purple-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Cultural Lock-In Artifacts</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    <span className="text-text-muted">Merge Confidence Certificates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 text-accent" />
                    <span className="text-text-muted">Readiness Score™</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-info" />
                    <span className="text-text-muted">AI Risk Exposure Index™</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-accent" />
                    <span className="text-text-muted">Hashed Review IDs</span>
                  </div>
                </div>
                <div className="text-xs text-text-muted p-2 bg-background/50 rounded border border-primary/20">
                  <strong className="text-text-primary">The Inevitability Principle:</strong> If ReadyLayer didn&apos;t review it, that absence is visible. 
                  Every certificate proves review. Every score creates accountability.
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-text-muted mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Deterministic execution
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-info" />
                  Policy version hashing
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Immutable evidence bundles
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Ethical AI compliance
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
            <motion.div
              className="flex flex-wrap gap-4 text-sm"
              variants={prefersReducedMotion ? fadeIn : staggerItem}
            >
              <Link href="/how-it-works" className="text-accent hover:underline">
                How it works →
              </Link>
              <Link href="/pricing" className="text-accent hover:underline">
                Pricing →
              </Link>
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

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <button
          onClick={scrollToDemo}
          className="flex flex-col items-center gap-1 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Scroll to demo"
        >
          <span className="text-xs uppercase tracking-widest font-medium">Scroll</span>
          <ChevronDown className="h-5 w-5" />
        </button>
      </motion.div>
    </section>
  )
}
