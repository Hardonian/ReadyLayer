'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fadeIn, staggerContainer, staggerItem } from '@/lib/design/motion'
import {
  Shield,
  TestTube,
  FileText,
  Bot,
  BarChart3,
  Eye,
  Database,
  Brain,
  Code2,
  Search,
  FileCode,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'

interface ValueDriver {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  features: string[]
  metrics?: string
}

const valueDrivers: ValueDriver[] = [
  {
    id: 'ai-detection',
    icon: Bot,
    title: 'AI Detection & Analysis',
    description: 'Identifies AI-generated code patterns, context slips, hallucinations, and security risks.',
    features: [
      '100% detection rate on AI-touched diffs',
      'Context slip detection',
      'Hallucination identification',
      'Pattern recognition',
    ],
    metrics: '100% Detection Rate',
  },
  {
    id: 'review-guard',
    icon: Shield,
    title: 'Review Guard',
    description: 'Multi-layered security, performance, and quality scans that catch issues before merge.',
    features: [
      'Security vulnerability scanning',
      'Performance risk detection',
      'Code quality analysis',
      'Deterministic gates',
    ],
    metrics: '3 Checks Per PR',
  },
  {
    id: 'test-engine',
    icon: TestTube,
    title: 'Test Engine',
    description: 'Automatically generates tests, enforces coverage thresholds, and ensures code reliability.',
    features: [
      'Auto-generated unit tests',
      'Coverage enforcement',
      'Test framework integration',
      'Coverage delta tracking',
    ],
    metrics: '+3% Coverage Avg',
  },
  {
    id: 'doc-sync',
    icon: FileText,
    title: 'Doc Sync',
    description: 'Keeps documentation in sync with code changes, preventing drift and outdated docs.',
    features: [
      'OpenAPI spec updates',
      'README synchronization',
      'Changelog generation',
      'API documentation',
    ],
    metrics: '100% Sync Rate',
  },
  {
    id: 'transparency',
    icon: Eye,
    title: 'Full Transparency',
    description: 'Every check is traceable with review IDs, timestamps, and complete audit trails.',
    features: [
      'Review IDs for every check',
      'Timestamp tracking',
      'Evidence bundle export',
      'Complete audit trail',
    ],
    metrics: '100% Traceable',
  },
  {
    id: 'metrics',
    icon: BarChart3,
    title: 'Real-time Metrics',
    description: 'Comprehensive metrics and analytics for findings, coverage, tests, and documentation.',
    features: [
      'Finding counts',
      'Coverage deltas',
      'Test generation stats',
      'Doc update tracking',
    ],
    metrics: 'Real-time Updates',
  },
  {
    id: 'evidence',
    icon: Database,
    title: 'Evidence Bundles',
    description: 'Exportable evidence bundles for compliance, audits, and verification requirements.',
    features: [
      'Review evidence export',
      'Compliance-ready',
      'Audit trail preservation',
      'JSON/SARIF formats',
    ],
    metrics: 'Export Ready',
  },
  {
    id: 'policy',
    icon: FileCode,
    title: 'Policy as Code',
    description: 'Team-wide standards enforced through code-based policies, not manual reviews.',
    features: [
      'YAML-based policies',
      'Team-wide enforcement',
      'Version controlled',
      'Customizable rules',
    ],
    metrics: 'Policy-Driven',
  },
  {
    id: 'self-learning',
    icon: Brain,
    title: 'Self-Learning System',
    description: 'Learns from patterns, identifies repeated mistakes, and suggests optimizations.',
    features: [
      'Pattern detection',
      'Repeated mistake identification',
      'Optimization suggestions',
      'AI usage insights',
    ],
    metrics: 'Continuous Learning',
  },
  {
    id: 'ide-integration',
    icon: Code2,
    title: 'IDE Integration',
    description: 'Works directly in your IDE with VS Code and JetBrains extensions for real-time feedback.',
    features: [
      'VS Code extension',
      'JetBrains plugin',
      'Real-time feedback',
      'Inline annotations',
    ],
    metrics: 'Native Integration',
  },
  {
    id: 'rag',
    icon: Search,
    title: 'RAG-Powered Context',
    description: 'Uses Retrieval Augmented Generation to understand your codebase context and patterns.',
    features: [
      'Codebase context awareness',
      'Pattern matching',
      'Smart suggestions',
      'Context-aware checks',
    ],
    metrics: 'Context-Aware',
  },
  {
    id: 'optimization',
    icon: Sparkles,
    title: 'AI Optimization',
    description: 'Identifies token waste, repeated mistakes, and provides personalized optimization suggestions.',
    features: [
      'Token waste detection',
      'Cost optimization',
      'Repeated mistake analysis',
      'Personalized suggestions',
    ],
    metrics: 'Cost Savings',
  },
]

export function ValueDrivers() {
  const prefersReducedMotion = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  return (
    <section className="py-16 bg-surface-muted/30">
      <Container size="lg">
        <motion.div
          className="text-center mb-12"
          variants={prefersReducedMotion ? fadeIn : staggerItem}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold mb-4">Complete AI Code Readiness Platform</h2>
          <p className="text-lg text-text-muted max-w-3xl mx-auto">
            Every feature designed to detect, verify, and optimize AI-generated code with complete transparency and control.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {valueDrivers.map((driver) => {
            const Icon = driver.icon
            return (
              <motion.div key={driver.id} variants={prefersReducedMotion ? fadeIn : staggerItem}>
                <Card className="h-full hover:shadow-lg transition-shadow border-border-subtle">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-accent-muted">
                        <Icon className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base mb-1">{driver.title}</CardTitle>
                        {driver.metrics && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {driver.metrics}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-text-muted mb-3">{driver.description}</p>
                    <ul className="space-y-1.5">
                      {driver.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-text-muted">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
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
