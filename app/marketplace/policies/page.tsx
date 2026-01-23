'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Container } from '@/components/ui/container'
import { Badge } from '@/components/ui/badge'
import { fadeIn, slideUp } from '@/lib/design/motion'
import { Download, Star, Users, Clock, Search } from 'lucide-react'

interface PolicyTemplate {
  id: string
  name: string
  description: string
  category: string
  rating: number
  downloads: number
  author: string
  updated: string
  tags: string[]
}

const policyTemplates: PolicyTemplate[] = [
  {
    id: 'policy_sec_001',
    name: 'OWASP Top 10 Security Gates',
    description: 'Comprehensive security policy covering OWASP Top 10 vulnerabilities',
    category: 'Security',
    rating: 4.9,
    downloads: 1204,
    author: 'ReadyLayer Team',
    updated: '2026-01-15',
    tags: ['security', 'owasp', 'compliance'],
  },
  {
    id: 'policy_perf_002',
    name: 'Performance Optimization Rules',
    description: 'Rules for detecting performance regressions and anti-patterns',
    category: 'Performance',
    rating: 4.7,
    downloads: 856,
    author: 'Community',
    updated: '2026-01-18',
    tags: ['performance', 'optimization'],
  },
  {
    id: 'policy_test_003',
    name: 'Test Coverage Requirements',
    description: 'Enforce minimum test coverage thresholds for code changes',
    category: 'Testing',
    rating: 4.8,
    downloads: 2341,
    author: 'ReadyLayer Team',
    updated: '2026-01-20',
    tags: ['testing', 'coverage', 'quality'],
  },
  {
    id: 'policy_doc_004',
    name: 'Documentation Sync Policy',
    description: 'Ensure API documentation stays in sync with code changes',
    category: 'Documentation',
    rating: 4.6,
    downloads: 643,
    author: 'Community',
    updated: '2026-01-10',
    tags: ['documentation', 'api', 'sync'],
  },
  {
    id: 'policy_style_005',
    name: 'Code Style & Formatting',
    description: 'Maintain consistent code style across your organization',
    category: 'Style',
    rating: 4.5,
    downloads: 1876,
    author: 'Community',
    updated: '2026-01-12',
    tags: ['style', 'formatting', 'consistency'],
  },
  {
    id: 'policy_ai_006',
    name: 'AI-Generated Code Validation',
    description: 'Special rules for validating AI-assisted code changes',
    category: 'AI Safety',
    rating: 4.9,
    downloads: 2105,
    author: 'ReadyLayer Team',
    updated: '2026-01-19',
    tags: ['ai', 'validation', 'safety'],
  },
]

const categories = ['All', 'Security', 'Performance', 'Testing', 'Documentation', 'Style', 'AI Safety']

export default function PoliciesMarketplacePage() {
  const [selectedCategory, setSelectedCategory] = React.useState('All')
  const [searchQuery, setSearchQuery] = React.useState('')

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const filteredPolicies = policyTemplates.filter((policy) => {
    const matchesCategory = selectedCategory === 'All' || policy.category === selectedCategory
    const matchesSearch =
      searchQuery === '' ||
      policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

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
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">Policy Templates</h1>
            <p className="text-text-muted">
              Discover and use pre-built policies from the community
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            className="relative"
            variants={prefersReducedMotion ? fadeIn : slideUp}
            initial="hidden"
            animate="visible"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search policies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 rounded-lg border border-border-subtle bg-surface-raised focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
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

      {/* Policy List */}
      <section className="py-12 lg:py-16">
        <Container size="lg">
          {filteredPolicies.length > 0 ? (
            <motion.div
              className="space-y-6"
              variants={prefersReducedMotion ? fadeIn : slideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
            >
              {filteredPolicies.map((policy, idx) => (
                <motion.div
                  key={policy.id}
                  className="p-6 rounded-lg border border-border-subtle bg-surface-raised hover:border-accent hover:shadow-lg transition-all duration-200 cursor-pointer group"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  viewport={{ once: true }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold group-hover:text-accent transition-colors">
                          {policy.name}
                        </h3>
                        <Badge variant="secondary">{policy.category}</Badge>
                      </div>
                      <p className="text-text-muted mb-3">{policy.description}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {policy.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-6 text-sm text-text-muted">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-warning fill-warning" />
                          {policy.rating} rating
                        </div>
                        <div className="flex items-center gap-1">
                          <Download className="h-4 w-4" />
                          {policy.downloads.toLocaleString()} downloads
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {policy.author}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Updated {new Date(policy.updated).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 lg:flex-shrink-0">
                      <button className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent-hover transition-colors whitespace-nowrap">
                        Use Policy
                      </button>
                      <button className="px-4 py-2 rounded-lg border border-accent text-accent font-medium hover:bg-accent/10 transition-colors whitespace-nowrap">
                        Learn More
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              className="text-center py-12"
              variants={prefersReducedMotion ? fadeIn : slideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <p className="text-text-muted mb-4">No policies found matching your filters</p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('All')
                }}
                className="text-accent hover:text-accent-hover font-medium"
              >
                Clear filters
              </button>
            </motion.div>
          )}
        </Container>
      </section>

      {/* CTA */}
      <section className="py-12 lg:py-16 bg-surface-muted/50 border-t border-border-subtle">
        <Container size="lg">
          <motion.div
            className="text-center max-w-2xl mx-auto"
            variants={prefersReducedMotion ? fadeIn : slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <h2 className="text-2xl font-bold mb-4">Share Your Policy</h2>
            <p className="text-text-muted mb-6">
              Created a useful policy? Share it with the community and help other teams improve their
              governance.
            </p>
            <a
              href="/help/marketplace-submission"
              className="inline-flex px-6 py-2.5 rounded-lg border border-accent text-accent font-medium hover:bg-accent/10 transition-colors"
            >
              Submit Policy
            </a>
          </motion.div>
        </Container>
      </section>
    </main>
  )
}
