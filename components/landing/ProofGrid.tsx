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
  Bot,
  BarChart3,
  Eye,
  Database,
  Brain,
  Code2,
  Search,
} from 'lucide-react'

interface ProofCard {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  visual: React.ReactNode
}

const proofCards: ProofCard[] = [
  {
    id: 'ai-detection',
    icon: Bot,
    title: 'AI detection on every diff',
    visual: (
      <div className="mt-2 space-y-1">
        <Badge variant="info" className="text-xs flex items-center gap-1 w-fit">
          <Bot className="h-3 w-3" />
          AI code detected
        </Badge>
        <div className="text-xs text-text-muted">
          Identifies AI-generated patterns, context slips, and risks
        </div>
      </div>
    ),
  },
  {
    id: 'metrics',
    icon: BarChart3,
    title: 'Real-time metrics & insights',
    visual: (
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-text-muted">Findings:</span>
          <span className="font-semibold">3</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted">Coverage Δ:</span>
          <span className="font-semibold text-success">+3%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted">Tests:</span>
          <span className="font-semibold">12 generated</span>
        </div>
      </div>
    ),
  },
  {
    id: 'transparency',
    icon: Eye,
    title: 'Full transparency every step',
    visual: (
      <div className="mt-2 text-xs text-text-muted space-y-1">
        <div className="flex items-center gap-1">
          <Eye className="h-3 w-3 text-accent" />
          <span>Review ID: rev-abc123</span>
        </div>
        <div>✓ Timestamp: 2024-01-15 10:23</div>
        <div>✓ Audit trail link</div>
      </div>
    ),
  },
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
    title: 'Deterministic gates + signed certificates',
    visual: (
      <div className="mt-2 text-xs text-text-muted">
        <div>✓ Signed Review ID</div>
        <div>✓ Policy version hash</div>
        <div>✓ Merge Confidence Certificate</div>
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
  {
    id: 'evidence',
    icon: Database,
    title: 'Immutable evidence bundles',
    visual: (
      <div className="mt-2 text-xs text-text-muted">
        <div>✓ Signed Review ID</div>
        <div>✓ Policy checksum</div>
        <div>✓ Immutable artifacts</div>
        <div>✓ Defensible in courtrooms</div>
      </div>
    ),
  },
  {
    id: 'policy',
    icon: FileCode,
    title: 'Policy as code enforcement',
    visual: (
      <div className="mt-2 text-xs font-mono text-text-muted">
        <div>policy.yaml</div>
        <div className="text-accent">rules: [security, performance]</div>
        <div className="text-success">✓ Enforced</div>
      </div>
    ),
  },
  {
    id: 'self-learning',
    icon: Brain,
    title: 'Self-learning from patterns',
    visual: (
      <div className="mt-2 text-xs text-text-muted">
        <div>✓ Pattern detection</div>
        <div>✓ Repeated mistakes flagged</div>
        <div>✓ Optimization suggestions</div>
      </div>
    ),
  },
  {
    id: 'ide-integration',
    icon: Code2,
    title: 'IDE integration (VS Code, JetBrains)',
    visual: (
      <div className="flex items-center gap-1 mt-2">
        <div className="w-2 h-2 rounded-full bg-success" />
        <span className="text-xs text-text-muted">VS Code</span>
        <div className="w-2 h-2 rounded-full bg-success ml-2" />
        <span className="text-xs text-text-muted">JetBrains</span>
      </div>
    ),
  },
  {
    id: 'rag-context',
    icon: Search,
    title: 'RAG-powered context awareness',
    visual: (
      <div className="mt-2 text-xs text-text-muted">
        <div>✓ Codebase context</div>
        <div>✓ Pattern matching</div>
        <div>✓ Smart suggestions</div>
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
          className="text-center mb-12"
          variants={prefersReducedMotion ? fadeIn : staggerItem}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold mb-2">Deterministic Governance & Cultural Lock-In</h2>
          <p className="text-lg text-text-muted max-w-2xl mx-auto">
            Every check is deterministic, signed, and defensible. Merge Confidence Certificates, Readiness Scores, and AI Risk Exposure Index make ReadyLayer&apos;s absence visible.
          </p>
        </motion.div>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
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
