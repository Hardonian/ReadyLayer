/**
 * Content Hub - Blog Posts, Case Studies & Compliance Guides
 *
 * Content amplification for ReadyLayer adoption
 */

import { Container } from '@/components/ui/container'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, BookOpen, FileText, Award, Shield, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function ContentHubPage(): React.JSX.Element {
  return (
    <Container className="py-12">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Resources & Content
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Learn how engineering teams use ReadyLayer to enforce code quality,
            prevent security issues, and maintain compliance.
          </p>
        </div>

        {/* Featured Case Studies */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-primary" />
            <h2 className="text-3xl font-bold">Case Studies</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {caseStudies.map((study, index) => (
              <Link key={index} href={`/content/case-studies/${study.slug}`}>
                <Card className="h-full hover:shadow-lg transition-all hover:border-primary cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary">{study.industry}</Badge>
                      <span className="text-xs text-muted-foreground">{study.readTime}</span>
                    </div>
                    <CardTitle className="text-xl">{study.title}</CardTitle>
                    <CardDescription>{study.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        {study.metrics.map((metric, i) => (
                          <div key={i} className="text-center">
                            <div className="text-2xl font-bold text-primary">{metric.value}</div>
                            <div className="text-xs text-muted-foreground">{metric.label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-primary text-sm font-medium">
                        Read case study <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Compliance Guides */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h2 className="text-3xl font-bold">Compliance Guides</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {complianceGuides.map((guide, index) => (
              <Link key={index} href={`/content/compliance/${guide.slug}`}>
                <Card className="h-full hover:shadow-lg transition-all hover:border-primary cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {guide.icon}
                      </div>
                      <Badge>{guide.standard}</Badge>
                    </div>
                    <CardTitle className="text-lg">{guide.title}</CardTitle>
                    <CardDescription className="text-sm">{guide.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        {guide.lastUpdated}
                      </div>
                      <div className="flex items-center gap-2 text-primary text-sm font-medium">
                        View guide <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Blog Posts */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary" />
            <h2 className="text-3xl font-bold">Blog Posts</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {blogPosts.map((post, index) => (
              <Link key={index} href={`/content/blog/${post.slug}`}>
                <Card className="h-full hover:shadow-lg transition-all hover:border-primary cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{post.category}</Badge>
                      <span className="text-xs text-muted-foreground">{post.date}</span>
                    </div>
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                    <CardDescription className="text-sm line-clamp-2">
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                        {post.author.initials}
                      </div>
                      <div className="text-xs">
                        <div className="font-medium">{post.author.name}</div>
                        <div className="text-muted-foreground">{post.readTime}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Newsletter Signup */}
        <section className="bg-gradient-to-r from-primary/10 to-transparent rounded-lg p-8 border border-primary/20">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h3 className="text-2xl font-bold">Stay Updated</h3>
            <p className="text-muted-foreground">
              Get the latest case studies, best practices, and compliance updates delivered to your inbox.
            </p>
            <div className="flex gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-4 py-2 rounded-md border border-border bg-background"
              />
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </section>
      </div>
    </Container>
  )
}

// Case Studies Data
const caseStudies = [
  {
    slug: 'techcorp-security-breach-prevention',
    title: 'How TechCorp Prevented a Security Breach',
    description: 'Learn how ReadyLayer caught hardcoded credentials before they reached production',
    industry: 'SaaS',
    readTime: '5 min read',
    metrics: [
      { value: '100%', label: 'Breach Prevention' },
      { value: '3hrs', label: 'Saved Response Time' },
      { value: '$2M+', label: 'Potential Loss Avoided' }
    ]
  },
  {
    slug: 'dataflow-test-coverage',
    title: 'DataFlow Achieves 90% Test Coverage',
    description: 'From 60% to 90% coverage in 3 months with automated enforcement',
    industry: 'Data Analytics',
    readTime: '4 min read',
    metrics: [
      { value: '+50%', label: 'Coverage Increase' },
      { value: '90%', label: 'Final Coverage' },
      { value: '-75%', label: 'Production Bugs' }
    ]
  },
  {
    slug: 'fintech-soc2-compliance',
    title: 'FinTech Startup Achieves SOC 2 Compliance',
    description: 'How ReadyLayer audit trails accelerated SOC 2 Type II certification',
    industry: 'FinTech',
    readTime: '6 min read',
    metrics: [
      { value: '6 weeks', label: 'To Certification' },
      { value: '100%', label: 'Audit Pass Rate' },
      { value: '0', label: 'Failed Audits' }
    ]
  },
  {
    slug: 'healthtech-hipaa-readiness',
    title: 'HealthTech Co. Maintains HIPAA Compliance',
    description: 'Continuous compliance monitoring and evidence generation for healthcare',
    industry: 'HealthTech',
    readTime: '5 min read',
    metrics: [
      { value: '100%', label: 'HIPAA Compliant' },
      { value: '24/7', label: 'Monitoring' },
      { value: '500+', label: 'PRs Reviewed' }
    ]
  }
]

// Compliance Guides Data
const complianceGuides = [
  {
    slug: 'soc2-readiness',
    title: 'SOC 2 Readiness Guide',
    description: 'Complete guide to achieving SOC 2 Type II certification with automated code governance',
    standard: 'SOC 2',
    icon: <Shield className="w-5 h-5 text-primary" />,
    lastUpdated: 'Updated Jan 2026'
  },
  {
    slug: 'hipaa-compliance',
    title: 'HIPAA Compliance for Developers',
    description: 'Ensure your code meets HIPAA requirements with automated security checks',
    standard: 'HIPAA',
    icon: <FileText className="w-5 h-5 text-primary" />,
    lastUpdated: 'Updated Jan 2026'
  },
  {
    slug: 'gdpr-data-protection',
    title: 'GDPR & Data Protection',
    description: 'Implement privacy-first code practices and maintain GDPR compliance',
    standard: 'GDPR',
    icon: <Shield className="w-5 h-5 text-primary" />,
    lastUpdated: 'Updated Dec 2025'
  },
  {
    slug: 'pci-dss',
    title: 'PCI DSS for Payment Systems',
    description: 'Payment security requirements and automated vulnerability scanning',
    standard: 'PCI DSS',
    icon: <Award className="w-5 h-5 text-primary" />,
    lastUpdated: 'Updated Jan 2026'
  },
  {
    slug: 'iso27001',
    title: 'ISO 27001 Implementation',
    description: 'Information security management and continuous compliance monitoring',
    standard: 'ISO 27001',
    icon: <TrendingUp className="w-5 h-5 text-primary" />,
    lastUpdated: 'Updated Jan 2026'
  },
  {
    slug: 'nist-framework',
    title: 'NIST Cybersecurity Framework',
    description: 'Align your development practices with NIST security standards',
    standard: 'NIST',
    icon: <FileText className="w-5 h-5 text-primary" />,
    lastUpdated: 'Updated Dec 2025'
  }
]

// Blog Posts Data
const blogPosts = [
  {
    slug: 'deterministic-ai-governance',
    title: 'Why Deterministic AI Governance Matters',
    excerpt: 'Learn how deterministic policy evaluation ensures consistent, auditable code review decisions',
    category: 'Technical Deep Dive',
    date: 'Jan 20, 2026',
    author: { name: 'Sarah Chen', initials: 'SC' },
    readTime: '8 min read'
  },
  {
    slug: 'secret-detection-best-practices',
    title: '5 Secret Detection Best Practices',
    excerpt: 'Prevent credentials leaks with automated secret scanning and redaction',
    category: 'Security',
    date: 'Jan 15, 2026',
    author: { name: 'Michael Rodriguez', initials: 'MR' },
    readTime: '6 min read'
  },
  {
    slug: 'test-coverage-enforcement',
    title: 'Enforcing Test Coverage That Actually Works',
    excerpt: 'Move from aspirational coverage targets to enforced quality gates',
    category: 'Best Practices',
    date: 'Jan 10, 2026',
    author: { name: 'Emily Watson', initials: 'EW' },
    readTime: '7 min read'
  },
  {
    slug: 'documentation-drift-prevention',
    title: 'Stop Documentation Drift Before It Starts',
    excerpt: 'Automated API documentation validation catches stale docs in CI/CD',
    category: 'Documentation',
    date: 'Jan 5, 2026',
    author: { name: 'David Kim', initials: 'DK' },
    readTime: '5 min read'
  },
  {
    slug: 'llm-safety-in-code-review',
    title: 'LLM Safety in Code Review: Our Approach',
    excerpt: 'How we prevent sensitive data from reaching LLMs with deterministic redaction',
    category: 'Security',
    date: 'Dec 28, 2025',
    author: { name: 'Sarah Chen', initials: 'SC' },
    readTime: '9 min read'
  },
  {
    slug: 'from-60-to-90-coverage',
    title: 'From 60% to 90% Coverage: A Case Study',
    excerpt: 'Real-world results from teams that enforced coverage with blocking policies',
    category: 'Case Study',
    date: 'Dec 22, 2025',
    author: { name: 'Michael Rodriguez', initials: 'MR' },
    readTime: '6 min read'
  }
]
