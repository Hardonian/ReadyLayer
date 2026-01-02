'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Container } from '@/components/ui/container'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fadeIn, staggerContainer, staggerItem } from '@/lib/design/motion'
import {
  GitBranch,
  Shield,
  CheckCircle2,
  FileCode,
  Zap,
  FileText,
} from 'lucide-react'

interface ProofCard {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  visual: React.ReactNode
}

const proofCards: ProofCard[] = [
  {
    id: 'pr-checks',
    icon: GitBranch,
    title: 'Runs in PR checks (no new UI)',
    visual: (
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className="text-xs">
          ✓ ReadyLayer
        </Badge>
        <Badge variant="outline" className="text-xs">
          ✓ CI
        </Badge>
      </div>
    ),
  },
  {
    id: 'blocks-risky',
    icon: Shield,
    title: 'Blocks risky AI code before main',
    visual: (
      <div className="mt-2 text-xs font-mono text-danger">
        Merge blocked: 1 critical finding
      </div>
    ),
  },
  {
    id: 'deterministic',
    icon: CheckCircle2,
    title: 'Deterministic gates + audit trail',
    visual: (
      <div className="mt-2 text-xs text-text-muted">
        <div>✓ Review ID: abc123</div>
        <div>✓ Timestamp: 2024-01-15 10:23</div>
      </div>
    ),
  },
  {
    id: 'policy-as-code',
    icon: FileCode,
    title: 'Policy as code (team-wide standards)',
    visual: (
      <div className="mt-2 text-xs font-mono text-text-muted">
        <div>policy.yaml</div>
        <div className="text-accent">rules: [security, performance]</div>
      </div>
    ),
  },
  {
    id: 'works-with',
    icon: Zap,
    title: 'Works with GitHub/GitLab/CI',
    visual: (
      <div className="flex items-center gap-1 mt-2">
        <div className="w-2 h-2 rounded-full bg-success" />
        <span className="text-xs text-text-muted">GitHub Actions</span>
        <div className="w-2 h-2 rounded-full bg-success ml-2" />
        <span className="text-xs text-text-muted">GitLab CI</span>
      </div>
    ),
  },
  {
    id: 'docs-lockstep',
    icon: FileText,
    title: 'Docs stay in lockstep (OpenAPI + README)',
    visual: (
      <div className="mt-2 text-xs text-text-muted">
        <div>✓ openapi.yaml updated</div>
        <div>✓ README.md synced</div>
      </div>
    ),
  },
]

export function ProofGrid() {
  const prefersReducedMotion = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  return (
    <section className="py-16">
      <Container size="lg">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {proofCards.map((card) => {
            const Icon = card.icon
            return (
              <motion.div key={card.id} variants={prefersReducedMotion ? fadeIn : staggerItem}>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 rounded-md bg-accent-muted">
                        <Icon className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-2">{card.title}</h3>
                        {card.visual}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </Container>
    </section>
  )
}
