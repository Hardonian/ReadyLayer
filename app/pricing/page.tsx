'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fadeIn, staggerContainer, staggerItem } from '@/lib/design/motion'
import {
  Shield,
  TestTube,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Zap,
  Settings,
  Eye,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const tiers = [
  {
    name: 'Starter',
    price: '$49',
    period: '/month',
    description: 'Small teams, early adopters',
    repos: 'Up to 5 private repos',
    features: {
      'Review Guard': {
        enabled: true,
        details: [
          'Basic security and quality rules (hardcoded secrets, SQL injection, XSS)',
          'Inline PR comments',
          'Block on critical/high findings',
          'Warn on medium findings',
        ],
        limitations: ['No custom rules', 'No advanced security scanning'],
      },
      'Test Engine': {
        enabled: true,
        details: [
          'Test generation for AI-touched files',
          'Coverage enforcement (80% threshold, blocks if below)',
          'GitHub Actions integration',
          'Jest support (TypeScript/JavaScript)',
        ],
        limitations: ['Single test framework only', 'No custom test templates'],
      },
      'Doc Sync': {
        enabled: true,
        details: [
          'OpenAPI spec generation',
          'Merge-triggered doc updates',
          'Basic artifact storage (30 days)',
        ],
        limitations: ['No custom doc templates', 'No drift detection alerts'],
      },
      'Enforcement': {
        enabled: true,
        details: [
          'Block PRs with critical/high security findings',
          'Block PRs if coverage drops below threshold',
          'Block PRs if generated tests fail',
        ],
        limitations: ['Cannot customize severity mappings', 'Fixed thresholds'],
      },
      'Artifacts': {
        enabled: true,
        details: ['SARIF reports (30-day retention)', 'JUnit XML (30-day retention)'],
        limitations: ['No custom export formats', 'Limited retention'],
      },
    },
    limits: {
      'PR reviews': '1,000/month',
      'Test generations': '500/month',
      'Doc updates': '100/month',
    },
  },
  {
    name: 'Growth',
    price: '$199',
    period: '/month',
    description: 'Growing teams, multiple projects',
    repos: 'Up to 25 private repos',
    features: {
      'Review Guard': {
        enabled: true,
        details: [
          'All Starter features',
          'Custom rules and thresholds',
          'Advanced security scanning (SAST, dependency CVEs)',
          'Severity-based blocking (configurable)',
          'Rule templates library',
        ],
        limitations: [],
      },
      'Test Engine': {
        enabled: true,
        details: [
          'All Starter features',
          'Multi-framework support (Jest, Mocha, pytest)',
          'Custom test templates',
          'Coverage threshold configuration',
          'Test placement rules',
        ],
        limitations: [],
      },
      'Doc Sync': {
        enabled: true,
        details: [
          'All Starter features',
          'Custom doc templates',
          'Multiple spec formats (OpenAPI, GraphQL)',
          'Artifact publishing',
          'Drift detection alerts',
        ],
        limitations: [],
      },
      'Enforcement': {
        enabled: true,
        details: [
          'All Starter enforcement',
          'Custom severity mappings',
          'Policy-as-code (YAML/JSON)',
          'Per-repo policy configuration',
          'Waiver system for exceptions',
        ],
        limitations: [],
      },
      'Artifacts': {
        enabled: true,
        details: [
          'SARIF reports (90-day retention)',
          'JUnit XML (90-day retention)',
          'Coverage reports (90-day retention)',
          'Custom export formats',
        ],
        limitations: [],
      },
    },
    limits: {
      'PR reviews': '5,000/month',
      'Test generations': '2,500/month',
      'Doc updates': '500/month',
    },
  },
  {
    name: 'Scale',
    price: 'Custom',
    period: '',
    description: 'Enterprise teams, compliance requirements',
    repos: 'Unlimited private repos',
    features: {
      'Review Guard': {
        enabled: true,
        details: [
          'All Growth features',
          'Custom LLM models',
          'Advanced rule engine',
          'Compliance rule sets (SOC2, HIPAA, PCI-DSS)',
          'Risk scoring and prioritization',
        ],
        limitations: [],
      },
      'Test Engine': {
        enabled: true,
        details: [
          'All Growth features',
          'Custom test frameworks',
          'Test orchestration',
          'Coverage analytics and trends',
          'Test performance optimization',
        ],
        limitations: [],
      },
      'Doc Sync': {
        enabled: true,
        details: [
          'All Growth features',
          'Custom doc pipelines',
          'Multi-format publishing',
          'Advanced drift prevention',
          'Documentation analytics',
        ],
        limitations: [],
      },
      'Enforcement': {
        enabled: true,
        details: [
          'All Growth enforcement',
          'Org-level policy inheritance',
          'Advanced waiver workflows',
          'Policy versioning and rollback',
          'Compliance reporting',
        ],
        limitations: [],
      },
      'Artifacts': {
        enabled: true,
        details: [
          'All artifact types (unlimited retention)',
          'Custom retention policies',
          'Automated compliance exports',
          'Integration with SIEM tools',
        ],
        limitations: [],
      },
    },
    limits: {
      'PR reviews': 'Unlimited',
      'Test generations': 'Unlimited',
      'Doc updates': 'Unlimited',
    },
  },
]

export default function PricingPage() {
  const prefersReducedMotion = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  return (
    <main className="min-h-screen py-12 lg:py-24">
      <Container size="lg" className="space-y-16">
        {/* Header */}
        <motion.div
          className="text-center space-y-4"
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              Pricing that maps to real enforcement
            </h1>
            <p className="text-xl text-text-muted max-w-3xl mx-auto">
              Each tier clearly defines what you can block, what checks are active, and what artifacts are retained.
            </p>
          </motion.div>
        </motion.div>

        {/* Tiers */}
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier, idx) => (
            <motion.div
              key={tier.name}
              variants={prefersReducedMotion ? fadeIn : staggerItem}
              initial="hidden"
              animate="visible"
            >
              <Card className={cn('h-full flex flex-col', idx === 1 && 'border-2 border-accent')}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                    {idx === 1 && <Badge variant="default">Popular</Badge>}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{tier.price}</span>
                    <span className="text-text-muted">{tier.period}</span>
                  </div>
                  <p className="text-sm text-text-muted mt-2">{tier.description}</p>
                  <p className="text-sm font-medium mt-1">{tier.repos}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-4">
                  {/* Features */}
                  <div className="space-y-4 flex-1">
                    {Object.entries(tier.features).map(([category, feature]) => {
                      const Icon =
                        category === 'Review Guard'
                          ? Shield
                          : category === 'Test Engine'
                            ? TestTube
                            : category === 'Doc Sync'
                              ? FileText
                              : category === 'Enforcement'
                                ? Settings
                                : BarChart3

                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span className="text-sm font-semibold">{category}</span>
                            {feature.enabled ? (
                              <CheckCircle2 className="h-4 w-4 text-success ml-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-danger ml-auto" />
                            )}
                          </div>
                          {feature.enabled && (
                            <ul className="text-xs text-text-muted space-y-1 ml-6 list-disc">
                              {feature.details.map((detail, i) => (
                                <li key={i}>{detail}</li>
                              ))}
                            </ul>
                          )}
                          {feature.limitations && feature.limitations.length > 0 && (
                            <ul className="text-xs text-text-muted/70 space-y-1 ml-6 list-disc">
                              {feature.limitations.map((limitation, i) => (
                                <li key={i} className="line-through">
                                  {limitation}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Limits */}
                  <div className="pt-4 border-t border-border-subtle">
                    <div className="text-xs font-semibold mb-2">Usage Limits</div>
                    <div className="space-y-1 text-xs text-text-muted">
                      {Object.entries(tier.limits).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span>{key}:</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <Button asChild className="w-full mt-4" variant={idx === 1 ? 'default' : 'outline'}>
                    <Link href="/auth/signin">
                      {tier.name === 'Scale' ? 'Contact Sales' : 'Get Started'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Key Message */}
        <motion.div
          variants={prefersReducedMotion ? fadeIn : staggerItem}
          className="text-center space-y-4"
        >
          <Card className="border-2 border-accent bg-accent-muted/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Eye className="h-5 w-5 text-accent" />
                <span className="font-semibold">What can I block or enforce with this tier?</span>
              </div>
              <p className="text-sm text-text-muted max-w-2xl mx-auto">
                Each tier clearly maps to enforcement capabilities. Starter blocks critical security issues and
                enforces coverage thresholds. Growth adds custom policies and multi-framework support. Scale unlocks
                compliance rule sets and unlimited customization.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </Container>
    </main>
  )
}
