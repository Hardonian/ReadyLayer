'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, TestTube, FileText, GitBranch } from 'lucide-react'
import { fadeIn, staggerContainer, staggerItem } from '@/lib/design/motion'
import { FeatureIllustration } from '@/components/ui/optimized-image'

interface ValueDriver {
  title: string
  description: string
  icon: typeof Shield
  illustration?: string
  illustrationAlt?: string
}

const drivers: ValueDriver[] = [
  {
    title: 'Policy-first governance',
    description: 'Define deterministic governance rules alongside your repo and enforce them consistently.',
    icon: Shield,
    illustration: '/assets/visuals/value-policy.webp',
    illustrationAlt: 'Policy-first governance illustration',
  },
  {
    title: 'Composable checks',
    description: 'Use ReadyLayer checks without replacing your existing tests, linters, or approvals.',
    icon: TestTube,
    illustration: '/assets/visuals/value-composable.webp',
    illustrationAlt: 'Composable checks illustration',
  },
  {
    title: 'Documentation alignment',
    description: 'Keep docs synchronized with code changes and capture artifacts for audits.',
    icon: FileText,
    illustration: '/assets/visuals/value-docs.webp',
    illustrationAlt: 'Documentation alignment illustration',
  },
  {
    title: 'Git + CI integration',
    description: 'Integrate with GitHub, GitLab, or Bitbucket using existing CI pipelines.',
    icon: GitBranch,
    illustration: '/assets/visuals/value-git.webp',
    illustrationAlt: 'Git integration illustration',
  },
]

export function ValueDrivers(): React.JSX.Element {
  const prefersReducedMotion = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  // Feature flag for illustrations
  const enableIllustrations = process.env.NEXT_PUBLIC_ENABLE_VALUE_ILLUSTRATIONS === 'true'

  return (
    <section className="py-16 bg-surface-muted/50">
      <Container size="lg">
        <motion.div
          className="text-center mb-10"
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <motion.h2
            variants={prefersReducedMotion ? fadeIn : staggerItem}
            className="text-3xl font-bold mb-4"
          >
            OSS-first governance for AI-generated code
          </motion.h2>
          <motion.p variants={prefersReducedMotion ? fadeIn : staggerItem} className="text-text-muted">
            ReadyLayer is open-source, model-agnostic, and built to fit into existing workflows.
          </motion.p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-6"
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {drivers.map((driver) => {
            const Icon = driver.icon
            return (
              <motion.div key={driver.title} variants={prefersReducedMotion ? fadeIn : staggerItem}>
                <Card className="h-full">
                  <CardHeader className="space-y-3">
                    {enableIllustrations && driver.illustration ? (
                      <FeatureIllustration
                        src={driver.illustration}
                        alt={driver.illustrationAlt || driver.title}
                        width={240}
                        height={180}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-surface-muted flex items-center justify-center">
                        <Icon className="h-5 w-5 text-accent" />
                      </div>
                    )}
                    <CardTitle>{driver.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-text-muted">{driver.description}</CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </Container>
    </section>
  )
}
