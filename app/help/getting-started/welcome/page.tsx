'use client'

import React from 'react'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/design/motion'
import { CheckCircle2, ArrowRight, Shield, Zap, GitBranch } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function WelcomePage() {
  const features = [
    {
      title: 'Deterministic Governance',
      description: 'Every check is reproducible, auditable, and defensible. Same inputs always produce same outputs.',
      icon: Shield,
    },
    {
      title: 'Real-time Monitoring',
      description: 'Live situational awareness across all your repositories, PRs, and CI runs.',
      icon: Zap,
    },
    {
      title: 'Multi-Platform Support',
      description: 'Works seamlessly with GitHub, GitLab, and Bitbucket. One platform, all your repos.',
      icon: GitBranch,
    },
  ]

  const steps = [
    {
      number: 1,
      title: 'Connect Your Repository',
      description: 'Link your GitHub, GitLab, or Bitbucket repository to ReadyLayer.',
      href: '/help/getting-started/connect-repo',
    },
    {
      number: 2,
      title: 'Configure Policies',
      description: 'Set up security and quality policies that match your team\'s standards.',
      href: '/help/getting-started/policies',
    },
    {
      number: 3,
      title: 'Run Your First Review',
      description: 'Trigger a review and see ReadyLayer in action on your code.',
      href: '/help/getting-started/first-review',
    },
  ]

  return (
    <Container className="py-8">
      <motion.div className="space-y-8" variants={fadeIn} initial="hidden" animate="visible">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Welcome to ReadyLayer</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            ReadyLayer makes AI-generated code production-ready. We provide deterministic verification,
            automated testing, and comprehensive documentation for every PR, ensuring your codebase stays
            safe, compliant, and maintainable.
          </p>
        </div>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Start Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Start Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {steps.map((step) => (
                <div key={step.number} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {step.number}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{step.title}</h3>
                    <p className="text-muted-foreground mb-3">{step.description}</p>
                    <Link href={step.href}>
                      <Button variant="outline" size="sm">
                        Learn More
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* What Makes ReadyLayer Different */}
        <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
          <CardHeader>
            <CardTitle>What Makes ReadyLayer Different</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Deterministic:</strong> Every decision is reproducible and auditable. Same code,
                  same policy, same result—every time.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Explainable:</strong> Every finding includes evidence, rationale, and remediation
                  steps. No black boxes.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Multi-Platform:</strong> Works seamlessly across GitHub, GitLab, and Bitbucket
                  with platform-native UI.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Enterprise-Ready:</strong> Built for scale with tenant isolation, audit trails,
                  and compliance features.
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="flex justify-center">
          <Link href="/dashboard/repos/connect">
            <Button size="lg">
              Get Started
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </motion.div>
    </Container>
  )
}
