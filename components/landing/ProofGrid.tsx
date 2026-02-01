'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, FileText, CheckCircle2 } from 'lucide-react'
import { fadeIn, staggerContainer, staggerItem } from '@/lib/design/motion'

const proofs = [
  {
    title: 'Deterministic policy checks',
    description: 'Every run produces the same outcome for the same diff and policy version.',
    icon: Shield,
  },
  {
    title: 'Traceable audit artifacts',
    description: 'Policy hashes, timestamps, and logs are captured for every governed PR.',
    icon: FileText,
  },
  {
    title: 'Composable with Git + CI',
    description: 'ReadyLayer integrates with existing workflows and does not replace tests or approvals.',
    icon: CheckCircle2,
  },
]

export function ProofGrid(): React.JSX.Element {
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
            Governance you can verify
          </motion.h2>
          <motion.p variants={prefersReducedMotion ? fadeIn : staggerItem} className="text-text-muted">
            ReadyLayer provides deterministic outputs, composable workflows, and audit-ready artifacts.
          </motion.p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-6"
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {proofs.map((proof) => {
            const Icon = proof.icon
            return (
              <motion.div key={proof.title} variants={prefersReducedMotion ? fadeIn : staggerItem}>
                <Card className="h-full">
                  <CardHeader className="space-y-3">
                    <div className="h-10 w-10 rounded-lg bg-surface-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-accent" />
                    </div>
                    <CardTitle>{proof.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-text-muted">{proof.description}</CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </Container>
    </section>
  )
}
