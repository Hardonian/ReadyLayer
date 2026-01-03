'use client'

import React from 'react'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/design/motion'
import {
  BookOpen,
  MessageCircle,
  Video,
  FileText,
  Zap,
  Shield,
  GitBranch,
  Settings,
  HelpCircle,
  ArrowRight,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HelpPage() {
  const categories = [
    {
      title: 'Getting Started',
      icon: Zap,
      description: 'Quick start guides and onboarding',
      articles: [
        { title: 'Welcome to ReadyLayer', href: '/help/getting-started/welcome' },
        { title: 'Connecting Your Repository', href: '/help/getting-started/connect-repo' },
        { title: 'Your First Review', href: '/help/getting-started/first-review' },
        { title: 'Understanding Policies', href: '/help/getting-started/policies' },
      ],
    },
    {
      title: 'Security & Compliance',
      icon: Shield,
      description: 'Security features and compliance',
      articles: [
        { title: 'Security Best Practices', href: '/help/security/best-practices' },
        { title: 'Policy Configuration', href: '/help/security/policy-config' },
        { title: 'Audit Trails', href: '/help/security/audit-trails' },
        { title: 'Compliance Standards', href: '/help/security/compliance' },
      ],
    },
    {
      title: 'Git Providers',
      icon: GitBranch,
      description: 'GitHub, GitLab, and Bitbucket integration',
      articles: [
        { title: 'GitHub Integration', href: '/help/integrations/github' },
        { title: 'GitLab Integration', href: '/help/integrations/gitlab' },
        { title: 'Bitbucket Integration', href: '/help/integrations/bitbucket' },
        { title: 'Webhook Configuration', href: '/help/integrations/webhooks' },
      ],
    },
    {
      title: 'Dashboard & Analytics',
      icon: Settings,
      description: 'Using the dashboard and analytics',
      articles: [
        { title: 'Dashboard Overview', href: '/help/dashboard/overview' },
        { title: 'Live Ops Console', href: '/help/dashboard/live-ops' },
        { title: 'Metrics & KPIs', href: '/help/dashboard/metrics' },
        { title: 'Custom Reports', href: '/help/dashboard/reports' },
      ],
    },
  ]

  const quickLinks = [
    { title: 'API Documentation', href: '/help/api', icon: FileText },
    { title: 'Video Tutorials', href: '/help/videos', icon: Video },
    { title: 'Contact Support', href: '/help/support', icon: MessageCircle },
    { title: 'Feature Requests', href: '/help/feedback', icon: HelpCircle },
  ]

  return (
    <Container className="py-8">
      <motion.div className="space-y-8" variants={fadeIn} initial="hidden" animate="visible">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <BookOpen className="h-10 w-10" />
            Help Center
          </h1>
          <p className="text-lg text-muted-foreground">
            Everything you need to get the most out of ReadyLayer
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search help articles..."
                className="w-full pl-12 pr-4 py-3 border rounded-lg bg-surface text-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link key={link.href} href={link.href}>
                <Card className="hover:bg-surface-hover transition-colors cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <Icon className="h-8 w-8 text-primary" />
                      <h3 className="font-semibold">{link.title}</h3>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Categories */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Browse by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <Card key={category.title} className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Icon className="h-6 w-6 text-primary" />
                      <div>
                        <CardTitle>{category.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {category.articles.map((article) => (
                        <li key={article.href}>
                          <Link
                            href={article.href}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-muted transition-colors group"
                          >
                            <span className="text-sm">{article.title}</span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Support CTA */}
        <Card className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 border-primary/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-2">Need More Help?</h3>
                <p className="text-muted-foreground">
                  Our support team is here to help. Get in touch or check out our video tutorials.
                </p>
              </div>
              <div className="flex gap-3">
                <Button asChild>
                  <Link href="/help/support">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact Support
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/help/videos">
                    <Video className="h-4 w-4 mr-2" />
                    Watch Videos
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  )
}
