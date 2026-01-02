'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Container } from '@/components/ui/container'
import { Badge } from '@/components/ui/badge'
import { fadeIn, slideUp } from '@/lib/design/motion'
import { GitBranch, Shield, TestTube, FileText, CheckCircle2, ArrowRight, Bot, BarChart3, Eye } from 'lucide-react'

interface PipelineNode {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  artifacts?: string[]
}

const pipelineNodes: PipelineNode[] = [
  {
    id: 'detect',
    label: 'AI diff detected',
    icon: GitBranch,
  },
  {
    id: 'review',
    label: 'Review Guard gates',
    icon: Shield,
    artifacts: ['SARIF'],
  },
  {
    id: 'test',
    label: 'Tests generated/enforced',
    icon: TestTube,
    artifacts: ['JUnit', 'Coverage'],
  },
  {
    id: 'docs',
    label: 'Docs synced',
    icon: FileText,
    artifacts: ['OpenAPI', 'Markdown'],
  },
  {
    id: 'merge',
    label: 'Merge ready',
    icon: CheckCircle2,
  },
]

export function PipelineStrip() {
  const prefersReducedMotion = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  return (
    <section className="py-16 bg-surface-muted/50">
      <Container size="lg">
        <motion.div
          className="text-center mb-12"
          variants={prefersReducedMotion ? fadeIn : slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <h2 className="text-3xl font-bold mb-4">
            From AI suggestion → safe merge in one pass
          </h2>
        </motion.div>

        <div className="overflow-x-auto pb-8">
          <div className="flex items-center gap-4 min-w-max px-4">
            {pipelineNodes.map((node, idx) => {
              const Icon = node.icon
              const isLast = idx === pipelineNodes.length - 1

              return (
                <React.Fragment key={node.id}>
                  <motion.div
                    className="flex flex-col items-center gap-3 min-w-[140px]"
                    variants={prefersReducedMotion ? fadeIn : slideUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <div className="relative">
                      <div className="p-4 rounded-lg border-2 border-border-strong bg-surface-raised shadow-lg">
                        <Icon className="h-6 w-6 text-accent" />
                      </div>
                      {!prefersReducedMotion && (
                        <motion.div
                          className="absolute inset-0 rounded-lg border-2 border-accent"
                          initial={{ scale: 1, opacity: 0 }}
                          animate={{ scale: 1.1, opacity: [0, 0.5, 0] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: idx * 0.3,
                          }}
                        />
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium mb-1">{node.label}</div>
                      {node.artifacts && (
                        <div className="flex flex-wrap gap-1 justify-center mt-2">
                          {node.artifacts.map((artifact) => (
                            <Badge
                              key={artifact}
                              variant="outline"
                              className="text-xs px-1.5 py-0"
                            >
                              {artifact}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {!isLast && (
                    <motion.div
                      className="flex-shrink-0"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 + 0.2 }}
                    >
                      <ArrowRight className="h-5 w-5 text-text-muted mx-2" />
                    </motion.div>
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Metrics & Transparency Summary */}
        <motion.div
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={prefersReducedMotion ? fadeIn : slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="p-4 rounded-lg border border-border-subtle bg-surface-raised text-center">
            <Bot className="h-6 w-6 text-info mx-auto mb-2" />
            <div className="text-2xl font-bold mb-1">100%</div>
            <div className="text-sm text-text-muted">AI Detection Rate</div>
            <div className="text-xs text-text-muted mt-1">Every AI-touched diff identified</div>
          </div>
          <div className="p-4 rounded-lg border border-border-subtle bg-surface-raised text-center">
            <BarChart3 className="h-6 w-6 text-success mx-auto mb-2" />
            <div className="text-2xl font-bold mb-1">3</div>
            <div className="text-sm text-text-muted">Real-time Metrics</div>
            <div className="text-xs text-text-muted mt-1">Findings, coverage, tests tracked</div>
          </div>
          <div className="p-4 rounded-lg border border-border-subtle bg-surface-raised text-center">
            <Eye className="h-6 w-6 text-accent mx-auto mb-2" />
            <div className="text-2xl font-bold mb-1">100%</div>
            <div className="text-sm text-text-muted">Transparency</div>
            <div className="text-xs text-text-muted mt-1">Every check has review ID & timestamp</div>
          </div>
        </motion.div>

        {/* Artifacts Summary */}
        <motion.div
          className="mt-8 text-center"
          variants={prefersReducedMotion ? fadeIn : slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="text-sm text-text-muted mb-2">Artifacts produced</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {['SARIF', 'JUnit', 'Coverage', 'OpenAPI', 'Markdown docs'].map((artifact) => (
              <Badge key={artifact} variant="secondary" className="text-xs">
                {artifact}
              </Badge>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  )
}
