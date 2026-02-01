'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Container } from '@/components/ui/container'
import { Badge } from '@/components/ui/badge'
import { fadeIn, slideUp } from '@/lib/design/motion'
import {
  GitBranch,
  Shield,
  TestTube,
  FileText,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface PipelineNode {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  artifacts?: string[]
}

const pipelineNodes: PipelineNode[] = [
  {
    id: 'submit',
    label: 'PR submitted',
    icon: GitBranch,
  },
  {
    id: 'review',
    label: 'Policy checks run',
    icon: Shield,
    artifacts: ['SARIF'],
  },
  {
    id: 'test',
    label: 'Tests + coverage enforced',
    icon: TestTube,
    artifacts: ['JUnit', 'Coverage'],
  },
  {
    id: 'docs',
    label: 'Docs synchronized',
    icon: FileText,
    artifacts: ['OpenAPI', 'Markdown'],
  },
  {
    id: 'decision',
    label: 'Decision recorded',
    icon: CheckCircle2,
  },
]

export function PipelineStrip(): React.JSX.Element {
  const prefersReducedMotion = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = React.useState(false)
  const [showRightArrow, setShowRightArrow] = React.useState(true)

  const checkScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return

    setShowLeftArrow(container.scrollLeft > 0)
    setShowRightArrow(container.scrollLeft < container.scrollWidth - container.clientWidth - 10)
  }

  React.useEffect(() => {
    checkScroll()
    const container = scrollContainerRef.current
    if (!container) return

    container.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)

    return () => {
      container.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollAmount = 300
    const newScroll = direction === 'left' ? container.scrollLeft - scrollAmount : container.scrollLeft + scrollAmount

    container.scrollTo({
      left: newScroll,
      behavior: 'smooth',
    })
  }

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
          <h2 className="text-3xl font-bold mb-4">PR → diff → checks → decision</h2>
          <p className="text-text-muted">Deterministic governance flow that plugs into Git and CI.</p>
        </motion.div>

        <style>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div className="relative group">
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all duration-200 hidden sm:flex items-center justify-center"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all duration-200 hidden sm:flex items-center justify-center"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          <div
            ref={scrollContainerRef}
            className="overflow-x-auto pb-4 scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
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
                              <Badge key={artifact} variant="outline" className="text-xs px-1.5 py-0">
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
        </div>

        <motion.div
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={prefersReducedMotion ? fadeIn : slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="p-4 rounded-lg border border-border-subtle bg-surface-raised text-center">
            <Eye className="h-6 w-6 text-info mx-auto mb-2" />
            <div className="text-2xl font-bold mb-1">Traceable</div>
            <div className="text-sm text-text-muted">Policy version + decision hash</div>
            <div className="text-xs text-text-muted mt-1">Same inputs, same outcome</div>
          </div>
          <div className="p-4 rounded-lg border border-border-subtle bg-surface-raised text-center">
            <BarChart3 className="h-6 w-6 text-success mx-auto mb-2" />
            <div className="text-2xl font-bold mb-1">Composable</div>
            <div className="text-sm text-text-muted">Git + CI first</div>
            <div className="text-xs text-text-muted mt-1">Integrate with existing workflows</div>
          </div>
          <div className="p-4 rounded-lg border border-border-subtle bg-surface-raised text-center">
            <CheckCircle2 className="h-6 w-6 text-accent mx-auto mb-2" />
            <div className="text-2xl font-bold mb-1">Deterministic</div>
            <div className="text-sm text-text-muted">Governed PRs every time</div>
            <div className="text-xs text-text-muted mt-1">No hidden logic or black boxes</div>
          </div>
        </motion.div>

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
