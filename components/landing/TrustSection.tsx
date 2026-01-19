'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Container } from '@/components/ui/container'
import { Badge } from '@/components/ui/badge'
import { fadeIn, slideUp } from '@/lib/design/motion'
import { Shield, Award, Users, TrendingUp, Lock, Clock } from 'lucide-react'

interface TrustItem {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

const trustItems: TrustItem[] = [
  {
    icon: Shield,
    title: 'Security & Compliance',
    description: 'SOC 2 Type II, GDPR, CCPA compliant with full encryption and audit logging',
  },
  {
    icon: Award,
    title: 'Auditable Decisions',
    description: 'Every decision includes a cryptographic hash and evidence bundle for verification',
  },
  {
    icon: Users,
    title: 'Trusted by Teams',
    description: 'Used by forward-thinking enterprises and OSS maintainers for governance',
  },
  {
    icon: Lock,
    title: 'Secret Redaction',
    description: 'Automatically detects and redacts API keys, passwords, and PII before LLM analysis',
  },
  {
    icon: Clock,
    title: 'Real-Time Processing',
    description: 'Async-first architecture returns results instantly, background processing continues',
  },
  {
    icon: TrendingUp,
    title: '100% Accuracy Rate',
    description: 'Deterministic evaluation ensures identical inputs produce identical outputs',
  },
]

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function TrustSection() {
  return (
    <section className="py-16 lg:py-24 bg-surface-muted/50">
      <Container size="lg">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          variants={prefersReducedMotion ? fadeIn : slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <Badge className="mb-4 bg-accent/10 text-accent">Trusted by Industry Leaders</Badge>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Built on Trust and Transparency
          </h2>
          <p className="text-lg text-text-muted max-w-2xl mx-auto">
            Enterprise-grade security, compliance, and auditability for AI-generated code
          </p>
        </motion.div>

        {/* Trust Items Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
          variants={prefersReducedMotion ? fadeIn : slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {trustItems.map((item, idx) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                className="p-6 rounded-lg border border-border-subtle bg-surface-raised hover:border-accent hover:shadow-lg transition-all duration-200"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-accent/10 flex-shrink-0">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-2">{item.title}</h3>
                    <p className="text-sm text-text-muted leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Trust Metrics */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-border-subtle"
          variants={prefersReducedMotion ? fadeIn : slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <div className="text-center">
            <div className="text-4xl font-bold text-accent mb-2">99.9%</div>
            <p className="text-sm text-text-muted">Uptime SLA</p>
            <p className="text-xs text-text-subtle mt-1">Enterprise-grade reliability</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-accent mb-2">256-bit</div>
            <p className="text-sm text-text-muted">Encryption</p>
            <p className="text-xs text-text-subtle mt-1">End-to-end data protection</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-accent mb-2">100%</div>
            <p className="text-sm text-text-muted">Auditable</p>
            <p className="text-xs text-text-subtle mt-1">Cryptographic proof of decisions</p>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          className="mt-12 p-8 rounded-lg border border-accent/20 bg-accent/5"
          variants={prefersReducedMotion ? fadeIn : slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-3">Ready to secure your AI-generated code?</h3>
            <p className="text-text-muted mb-6">
              See our security documentation and audit examples to understand how we ensure transparency.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/security"
                className="px-6 py-2.5 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent-hover transition-colors"
              >
                Security & Compliance
              </a>
              <a
                href="/audit-example"
                className="px-6 py-2.5 rounded-lg border border-accent text-accent font-medium hover:bg-accent/10 transition-colors"
              >
                View Audit Example
              </a>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  )
}
