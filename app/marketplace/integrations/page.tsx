'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/ui/container'
import { Badge } from '@/components/ui/badge'
import { fadeIn, slideUp } from '@/lib/design/motion'
import { Github, Gitlab, Code, Slack, MessageSquare, Zap, CheckCircle2, ArrowRight } from 'lucide-react'

interface Integration {
  id: string
  name: string
  description: string
  category: string
  icon: React.ComponentType<{ className?: string }>
  status: 'official' | 'community'
  rating: number
  users: number
  features: string[]
}

const integrations: Integration[] = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Native integration with GitHub for PR reviews, status checks, and webhook events',
    category: 'Version Control',
    icon: Github,
    status: 'official',
    rating: 5.0,
    users: 5420,
    features: ['PR Comments', 'Status Checks', 'Webhooks', 'Installation'],
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    description: 'Full GitLab integration with merge requests, pipelines, and CI/CD',
    category: 'Version Control',
    icon: Gitlab,
    status: 'official',
    rating: 4.9,
    users: 2134,
    features: ['Merge Requests', 'CI/CD', 'Webhooks', 'Pipeline Integration'],
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    description: 'Bitbucket Cloud integration for pull requests and Bitbucket Pipelines',
    category: 'Version Control',
    icon: Code,
    status: 'official',
    rating: 4.8,
    users: 1876,
    features: ['Pull Requests', 'Pipelines', 'Webhooks', 'Comments'],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notifications and manage reviews directly from Slack',
    category: 'Communication',
    icon: Slack,
    status: 'official',
    rating: 4.9,
    users: 3542,
    features: ['Notifications', 'Rich Messages', 'Interactive Buttons', 'Threads'],
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Community integration for Discord servers and development teams',
    category: 'Communication',
    icon: MessageSquare,
    status: 'community',
    rating: 4.6,
    users: 892,
    features: ['Notifications', 'Embeds', 'Commands', 'Webhooks'],
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Link ReadyLayer reviews to Jira issues and create tasks automatically',
    category: 'Project Management',
    icon: Zap,
    status: 'official',
    rating: 4.8,
    users: 2765,
    features: ['Issue Creation', 'Links', 'Comments', 'Custom Fields'],
  },
]

const categories = ['All', 'Version Control', 'Communication', 'Project Management']

export default function IntegrationsMarketplacePage() {
  const [selectedCategory, setSelectedCategory] = React.useState('All')

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const filteredIntegrations = integrations.filter(
    (integration) => selectedCategory === 'All' || integration.category === selectedCategory
  )

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="py-12 lg:py-16 bg-surface-muted/50 border-b border-border-subtle">
        <Container size="lg">
          <motion.div
            className="mb-8"
            variants={prefersReducedMotion ? fadeIn : slideUp}
            initial="hidden"
            animate="visible"
          >
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">Integrations</h1>
            <p className="text-text-muted">
              Connect ReadyLayer with your favorite tools and platforms
            </p>
          </motion.div>
        </Container>
      </section>

      {/* Filters */}
      <section className="py-6 border-b border-border-subtle">
        <Container size="lg">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  selectedCategory === category
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border-subtle text-text-muted hover:border-accent hover:text-accent'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </Container>
      </section>

      {/* Integrations Grid */}
      <section className="py-12 lg:py-16">
        <Container size="lg">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={prefersReducedMotion ? fadeIn : slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            {filteredIntegrations.map((integration, idx) => {
              const Icon = integration.icon
              return (
                <motion.div
                  key={integration.id}
                  className="p-6 rounded-lg border border-border-subtle bg-surface-raised hover:border-accent hover:shadow-lg transition-all duration-200 flex flex-col h-full"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-lg bg-accent/10 flex-shrink-0">
                      <Icon className="h-6 w-6 text-accent" />
                    </div>
                    <Badge
                      variant={integration.status === 'official' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {integration.status === 'official' ? '✓ Official' : 'Community'}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-semibold mb-2">{integration.name}</h3>
                  <p className="text-text-muted text-sm mb-4 flex-grow">{integration.description}</p>

                  <div className="mb-4 pb-4 border-t border-border-subtle pt-4">
                    <div className="flex items-center justify-between mb-3 text-sm">
                      <span className="text-text-muted">Category</span>
                      <Badge variant="outline" className="text-xs">
                        {integration.category}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">{integration.users.toLocaleString()} users</span>
                      <div className="flex items-center gap-1">
                        <span className="text-accent">★</span>
                        <span className="font-medium">{integration.rating}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                      Features
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {integration.features.map((feature) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-border-subtle">
                    <button className="flex-1 px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium text-sm hover:bg-accent-hover transition-colors">
                      Connect
                    </button>
                    <button className="flex-1 px-4 py-2 rounded-lg border border-border-subtle font-medium text-sm hover:border-accent hover:text-accent transition-colors">
                      Learn More
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </Container>
      </section>

      {/* Featured Integrations Highlight */}
      <section className="py-12 lg:py-16 bg-surface-muted/50">
        <Container size="lg">
          <motion.div
            className="text-center mb-12"
            variants={prefersReducedMotion ? fadeIn : slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <h2 className="text-3xl font-bold mb-4">Why Integrations Matter</h2>
            <p className="text-text-muted max-w-2xl mx-auto">
              Connect ReadyLayer to your existing workflow and get insights where you already work
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
            variants={prefersReducedMotion ? fadeIn : slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            {[
              {
                title: 'Seamless Workflow Integration',
                description:
                  'Reviews appear directly in your PR, merge requests, or notifications without context switching',
              },
              {
                title: 'Automated Governance',
                description:
                  'Automatically create tasks, update project management tools, and trigger workflows',
              },
              {
                title: 'Team Alignment',
                description:
                  'Share review results with your entire team through Slack, Discord, or Jira instantly',
              },
              {
                title: 'Custom Integrations',
                description:
                  'Use webhooks and APIs to build your own integrations tailored to your workflow',
              },
            ].map((benefit, idx) => (
              <motion.div
                key={benefit.title}
                className="p-6 rounded-lg border border-border-subtle bg-surface-raised"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                    <p className="text-text-muted text-sm">{benefit.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* Build Your Own */}
      <section className="py-12 lg:py-16">
        <Container size="lg">
          <motion.div
            className="text-center max-w-2xl mx-auto p-8 rounded-lg border border-accent/20 bg-accent/5"
            variants={prefersReducedMotion ? fadeIn : slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <h2 className="text-2xl font-bold mb-4">Build Your Own Integration</h2>
            <p className="text-text-muted mb-6">
              Use our comprehensive API and webhook system to build custom integrations for your unique
              workflow.
            </p>
            <a
              href="/docs/api-reference"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent-hover transition-colors"
            >
              View API Documentation
              <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>
        </Container>
      </section>
    </main>
  )
}
