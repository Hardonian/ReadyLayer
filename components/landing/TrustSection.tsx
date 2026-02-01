'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, FileText, GitBranch } from 'lucide-react'
import { fadeIn, staggerContainer, staggerItem } from '@/lib/design/motion'
import { Button } from '@/components/ui/button'

const trustPillars = [
  {
    title: 'Open-source by default',
    description: 'Run ReadyLayer entirely from the OSS repo with no phone-home requirements.',
    icon: Shield,
  },
  {
    title: 'Transparent governance',
    description: 'Every decision is backed by policy hashes, timestamps, and auditable artifacts.',
    icon: FileText,
  },
  {
    title: 'Composable integrations',
    description: 'Works with Git + CI, staying tool- and model-agnostic.',
    icon: GitBranch,
  },
]

export function TrustSection(): React.JSX.Element {
  const prefersReducedMotion = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  return (
    <section className="py-16">
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
            OSS-first trust signals
          </motion.h2>
          <motion.p variants={prefersReducedMotion ? fadeIn : staggerItem} className="text-text-muted">
            ReadyLayer keeps governance verifiable without adding telemetry or hidden logic.
          </motion.p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-6"
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {trustPillars.map((pillar) => {
            const Icon = pillar.icon
            return (
              <motion.div key={pillar.title} variants={prefersReducedMotion ? fadeIn : staggerItem}>
                <Card className="h-full">
                  <CardHeader className="space-y-3">
                    <div className="h-10 w-10 rounded-lg bg-surface-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-accent" />
                    </div>
                    <CardTitle>{pillar.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-text-muted">{pillar.description}</CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        <motion.div
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
            <Button asChild size="lg">
              <Link href="/open-source">Get started (OSS)</Link>
            </Button>
          </motion.div>
          <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
            <Button asChild variant="outline" size="lg">
              <Link href="/docs">View docs</Link>
            </Button>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  )
}
