'use client'

import React, { useState } from 'react'
import { useOrganizationId } from '@/lib/hooks'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle, ErrorState, Skeleton, Button } from '@/components/ui'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/design/motion'
import { CreditCard, CheckCircle2, ArrowRight, Zap, Shield, Rocket } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function BillingPage() {
  const { organizationId, loading } = useOrganizationId()
  const [currentPlan] = useState('starter')

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$49',
      period: '/month',
      description: 'Perfect for small teams getting started',
      features: [
        'Up to 5 repositories',
        '100 runs per month',
        'Basic security policies',
        'Email support',
        'Community access',
      ],
      cta: 'Current Plan',
      highlighted: false,
    },
    {
      id: 'growth',
      name: 'Growth',
      price: '$199',
      period: '/month',
      description: 'For growing teams with advanced needs',
      features: [
        'Up to 25 repositories',
        '1,000 runs per month',
        'Advanced security policies',
        'Priority support (12-24h)',
        'Custom integrations',
        'Advanced analytics',
      ],
      cta: 'Upgrade',
      highlighted: true,
    },
    {
      id: 'scale',
      name: 'Scale',
      price: '$499',
      period: '/month',
      description: 'Enterprise-grade for large organizations',
      features: [
        'Unlimited repositories',
        'Unlimited runs',
        'Custom policy packs',
        'Priority support (4-8h)',
        'Dedicated account manager',
        'SLA guarantee',
        'On-premise option',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ]

  const addons = [
    {
      name: 'Additional Runs',
      description: 'Extra runs beyond your plan limit',
      price: '$0.50 per run',
      icon: Zap,
    },
    {
      name: 'Advanced Security',
      description: 'Enhanced security scanning and compliance',
      price: '+$99/month',
      icon: Shield,
    },
    {
      name: 'Priority Support',
      description: 'Faster response times and dedicated support',
      price: '+$149/month',
      icon: Rocket,
    },
  ]

  if (loading) {
    return (
      <Container className="py-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </Container>
    )
  }

  if (!organizationId) {
    return (
      <Container className="py-8">
        <ErrorState message="Organization ID required." />
      </Container>
    )
  }

  return (
    <Container className="py-8">
      <motion.div className="space-y-8" variants={fadeIn} initial="hidden" animate="visible">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CreditCard className="h-8 w-8" />
            Billing & Subscription
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription, upgrade your plan, and add additional services
          </p>
        </div>

        {/* Current Plan */}
        <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold mb-1">Starter Plan</div>
                <div className="text-muted-foreground">$49/month</div>
                <div className="text-sm text-muted-foreground mt-2">
                  Next billing date: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </div>
              </div>
              <Button variant="outline">Manage Subscription</Button>
            </div>
          </CardContent>
        </Card>

        {/* Upgrade Plans */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Upgrade Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlan
              return (
                <Card
                  key={plan.id}
                  className={plan.highlighted ? 'border-primary border-2' : ''}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle>{plan.name}</CardTitle>
                      {isCurrent && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? 'default' : 'outline'}
                      disabled={isCurrent}
                    >
                      {plan.cta}
                      {!isCurrent && <ArrowRight className="h-4 w-4 ml-2" />}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Add-ons */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Add-ons & Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {addons.map((addon) => {
              const Icon = addon.icon
              return (
                <Card key={addon.name}>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{addon.name}</CardTitle>
                    </div>
                    <div className="text-lg font-semibold">{addon.price}</div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{addon.description}</p>
                    <Button variant="outline" className="w-full" size="sm">
                      Add to Plan
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Usage Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Runs</span>
                <span className="text-sm">45 / 100</span>
              </div>
              <div className="w-full bg-surface-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '45%' }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Repositories</span>
                <span className="text-sm">3 / 5</span>
              </div>
              <div className="w-full bg-surface-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '60%' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  )
}
