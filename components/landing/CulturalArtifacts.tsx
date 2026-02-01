'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, ShieldCheck, BookOpen, CheckCircle2 } from 'lucide-react'
import { fadeIn, staggerContainer, staggerItem } from '@/lib/design/motion'

const artifacts = [
  {
    title: 'Policy decision record',
    description: 'Every governed PR includes the policy version hash and deterministic outcome.',
    icon: ShieldCheck,
  },
  {
    title: 'Evidence bundle',
    description: 'Artifacts capture test logs, diff context, and review metadata for audits.',
    icon: FileText,
  },
  {
    title: 'Documentation sync log',
    description: 'Doc changes are tracked alongside code changes for review transparency.',
    icon: BookOpen,
  },
  {
    title: 'Merge readiness summary',
    description: 'A single, human-readable summary of governance checks and their status.',
    icon: CheckCircle2,
  },
]

export function CulturalArtifacts(): React.JSX.Element {
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
            Governance artifacts that travel with the PR
          </motion.h2>
          <motion.p variants={prefersReducedMotion ? fadeIn : staggerItem} className="text-text-muted">
            ReadyLayer records the evidence you need for audits, reviews, and historical accountability.
          </motion.p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-6"
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {artifacts.map((artifact) => {
            const Icon = artifact.icon
            return (
              <motion.div key={artifact.title} variants={prefersReducedMotion ? fadeIn : staggerItem}>
                <Card className="h-full">
                  <CardHeader className="space-y-3">
                    <div className="h-10 w-10 rounded-lg bg-surface-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-accent" />
                    </div>
                    <CardTitle>{artifact.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-text-muted">{artifact.description}</CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </Container>
    </section>
  )
}
