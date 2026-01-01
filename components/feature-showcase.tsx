'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Container } from '@/components/ui/container'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/design/motion'
import { Shield, TestTube, FileText, GitBranch, CheckCircle2, AlertTriangle, MessageSquare } from 'lucide-react'

interface Feature {
  icon: typeof Shield
  title: string
  description: string
  status: 'active' | 'coming-soon'
  metrics?: {
    label: string
    value: string
  }
}

const features: Feature[] = [
  {
    icon: Shield,
    title: 'Review Guard',
    description: 'AI-aware code review that catches context slips, drift, and security risks before they reach production.',
    status: 'active',
    metrics: {
      label: 'Issues Caught',
      value: '1,234',
    },
  },
  {
    icon: TestTube,
    title: 'Test Engine',
    description: 'Automatic test generation for AI-touched files with coverage enforcement and framework detection.',
    status: 'active',
    metrics: {
      label: 'Tests Generated',
      value: '567',
    },
  },
  {
    icon: FileText,
    title: 'Doc Sync',
    description: 'Keeps API documentation in sync with code changes, preventing drift and flagging outdated docs.',
    status: 'active',
    metrics: {
      label: 'Docs Synced',
      value: '890',
    },
  },
]

export function FeatureShowcase() {
  return (
    <section className="py-16 bg-surface-muted/30" aria-labelledby="features-heading">
      <Container size="lg">
        <motion.div
          className="text-center space-y-4 mb-12"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          <h2 id="features-heading" className="text-3xl font-bold">Features in Action</h2>
          <p className="text-lg text-text-muted max-w-2xl mx-auto">
            See how ReadyLayer verifies AI-generated code at every step of your workflow.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={staggerItem}>
              <Card className="glass-strong backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-white/20 dark:border-gray-700/50 h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-3 bg-accent-muted rounded-lg">
                      <feature.icon className="h-6 w-6 text-accent" aria-hidden="true" />
                    </div>
                    {feature.status === 'active' && (
                      <span className="text-xs px-2 py-1 bg-success-muted text-success rounded-full font-semibold">
                        Active
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-muted mb-4">{feature.description}</p>
                  {feature.metrics && (
                    <div className="pt-4 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-muted">{feature.metrics.label}</span>
                        <span className="text-lg font-bold text-text-primary">{feature.metrics.value}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Visual Snapshot */}
        <motion.div
          className="mt-12"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          <Card className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50 overflow-hidden">
            <CardHeader>
              <CardTitle>Live Verification Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Step 1: PR Created */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <GitBranch className="h-5 w-5 text-accent" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1">PR Created</div>
                    <p className="text-sm text-text-muted">
                      Pull request #123 opened with AI-generated code changes
                    </p>
                  </div>
                </div>

                {/* Step 2: Review Guard */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-info-muted flex items-center justify-center">
                      <Shield className="h-5 w-5 text-info" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1">Review Guard Analysis</div>
                    <p className="text-sm text-text-muted mb-2">
                      Analyzing code for context slips, security risks, and AI-specific issues...
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-success" aria-hidden="true" />
                      <span>Security check passed</span>
                      <CheckCircle2 className="h-3 w-3 text-success ml-2" aria-hidden="true" />
                      <span>Type safety verified</span>
                      <AlertTriangle className="h-3 w-3 text-warning ml-2" aria-hidden="true" />
                      <span>2 issues found</span>
                    </div>
                  </div>
                </div>

                {/* Step 3: Test Generation */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-success-muted flex items-center justify-center">
                      <TestTube className="h-5 w-5 text-success" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1">Test Engine</div>
                    <p className="text-sm text-text-muted">
                      Generated 5 unit tests with 85% coverage for modified files
                    </p>
                  </div>
                </div>

                {/* Step 4: Doc Sync */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-warning-muted flex items-center justify-center">
                      <FileText className="h-5 w-5 text-warning" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1">Doc Sync</div>
                    <p className="text-sm text-text-muted">
                      Updated API documentation for 3 modified endpoints
                    </p>
                  </div>
                </div>

                {/* Step 5: PR Comment */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-accent-muted flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-accent" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1">PR Comment Posted</div>
                    <p className="text-sm text-text-muted">
                      Review summary posted to PR with actionable feedback
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </Container>
    </section>
  )
}
