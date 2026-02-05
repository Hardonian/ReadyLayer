'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/ui/container'

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
import { HeroImage } from '@/components/ui/optimized-image'
import { cn } from '@/lib/utils'

interface HeroProofProps {
  user?: { email?: string; user_metadata?: { full_name?: string } } | null
}

const integrationIcons = [
  { name: 'GitHub', icon: Github, color: 'text-[hsl(var(--provider-github))] dark:text-[hsl(var(--provider-github))]' },
  { name: 'GitLab', icon: Gitlab, color: 'text-[hsl(var(--provider-gitlab))]' },
  { name: 'Bitbucket', icon: Code, color: 'text-[hsl(var(--provider-bitbucket))]' },
]

export function HeroProof({ user: _user }: HeroProofProps): React.JSX.Element {
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
      <div className="absolute inset-0 hero-gradient">
        <div className="absolute inset-0 bg-grid"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-success rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        <Container size="lg" className="relative pt-0 sm:pt-0 lg:pt-0 pb-16 sm:pb-20 lg:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div
              className="space-y-6 sm:space-y-8"
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
                 <h1 className="text-3xl sm:text-5xl lg:text-7xl font-display font-bold tracking-tight mb-6 leading-tight">
                   <span className="bg-gradient-to-r from-primary via-accent to-success bg-clip-text text-transparent animate-float">
                     Open-source governance
                   </span>
                   <br />
                   <span className="text-text-primary">for AI-generated code</span>
                 </h1>
                 <p className="text-lg sm:text-xl lg:text-2xl font-body text-text-muted max-w-2xl mb-4">
                   ReadyLayer is a composable governance framework for AI-generated code. Integrate with Git and CI, apply deterministic policy checks, and ship traceable decisions.
                 </p>
                 <p className="text-base font-body text-text-subtle max-w-xl">
                   Get your first governed PR in 10 minutes with OSS-first workflows.{' '}
                   <Link href="/how-it-works" className="text-primary hover:text-primary-dark font-medium transition-colors">
                     See how it works →
                   </Link>
                 </p>
              </motion.div>

              <motion.div
                className="space-y-6"
                variants={prefersReducedMotion ? fadeIn : staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <motion.div
                  variants={prefersReducedMotion ? fadeIn : staggerItem}
                  className="flex items-start gap-4 p-5 rounded-xl border border-border/20 bg-surface-raised shadow-surface-raised transition-all hover:shadow-glow"
                >
                  <div className="p-3 rounded-lg bg-info/10 flex-shrink-0">
                    <Shield className="h-6 w-6 text-info" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-lg mb-2">Review Guard</div>
                    <div className="text-base font-body text-text-muted">
                      Deterministic security, performance, and quality checks that attach policy versions to every decision.
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  variants={prefersReducedMotion ? fadeIn : staggerItem}
                  className="flex items-start gap-4 p-5 rounded-xl border border-border/20 bg-surface-raised shadow-surface-raised transition-all hover:shadow-glow-green"
                >
                  <div className="p-3 rounded-lg bg-success/10 flex-shrink-0">
                    <TestTube className="h-6 w-6 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-lg mb-2">Test Engine</div>
                    <div className="text-base font-body text-text-muted">
                      Deterministic test generation and coverage enforcement that can plug into existing CI workflows.
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  variants={prefersReducedMotion ? fadeIn : staggerItem}
                  className="flex items-start gap-4 p-5 rounded-xl border border-border/20 bg-surface-raised shadow-surface-raised transition-all hover:shadow-glow"
                >
                  <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-lg mb-2">Doc Sync</div>
                    <div className="text-base font-body text-text-muted">
                      Deterministic doc synchronization so governance signals stay aligned with the code that shipped.
                    </div>
                  </div>
                </motion.div>
              </motion.div>

               <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
                 <div className="p-5 rounded-xl border border-border/20 bg-gradient-to-r from-primary/5 to-accent/5 shadow-surface-raised">
                   <div className="flex items-center gap-2 mb-4">
                     <Shield className="h-5 w-5 text-primary flex-shrink-0" />
                     <span className="text-base font-display font-semibold">Governance artifacts</span>
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
                   <Button asChild size="lg" className="shadow-glow hover:shadow-glow-green tap-target">
                     <Link href="/docs">Get started (OSS)</Link>
                   </Button>
                 </motion.div>
                 <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
                   <Button asChild variant="outline" size="lg" className="tap-target">
                     <Link href="/docs">View docs</Link>
                   </Button>
                 </motion.div>
                 <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
                   <Button asChild variant="ghost" size="lg" className="tap-target">
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
              {/* Hero Illustration - Feature flagged via env */}
              {process.env.NEXT_PUBLIC_ENABLE_HERO_IMAGE === 'true' && (
                <motion.div 
                  variants={prefersReducedMotion ? fadeIn : staggerItem}
                  className="mb-6"
                >
                  <HeroImage
                    src="/assets/visuals/hero-governance.webp"
                    alt="ReadyLayer AI code governance visualization"
                    width={800}
                    height={600}
                    priority
                  />
                </motion.div>
              )}
              
              <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
                 <div className="rounded-xl border border-border/20 bg-surface-code overflow-hidden shadow-code-preview">
                   <div className="flex items-center justify-between px-5 py-4 border-b border-border/20 bg-surface-dark">
                     <div className="text-sm font-display font-medium">Governed PR walkthrough</div>
                     <Button variant="ghost" size="sm" onClick={scrollToDemo} className="text-xs tap-target">
                       <Play className="h-3 w-3 mr-1" />
                       Replay
                     </Button>
                   </div>
                   <div ref={demoRef} className="p-4 bg-grid">
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
