/**
 * Ecosystem Partnerships & Integrations
 *
 * Showcases joint integrations with GitHub, GitLab, Snyk, Vanta
 * and other ecosystem partners
 */

import { Container } from '@/components/ui/container'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Github,
  GitBranch,
  Shield,
  CheckCircle2,
  Zap,
  ArrowRight,
  ExternalLink,
  Package,
  Lock,
  FileCheck,
  Database,
  Users,
  TrendingUp,
  Award
} from 'lucide-react'
import Link from 'next/link'

export default function PartnershipsPage(): React.JSX.Element {
  return (
    <Container className="py-12">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge variant="secondary" className="mb-4">Ecosystem Integrations</Badge>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Built for Your Stack
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            ReadyLayer integrates seamlessly with your existing tools — GitHub, GitLab, Snyk, Vanta,
            and more. One platform, unified governance.
          </p>
        </div>

        {/* Featured Partnerships */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold text-center">Featured Partnerships</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {featuredPartners.map((partner, index) => (
              <PartnerCard key={index} partner={partner} featured />
            ))}
          </div>
        </section>

        {/* Integration Categories */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold text-center">All Integrations</h2>

          {integrationCategories.map((category, index) => (
            <div key={index} className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                {category.icon}
                <h3 className="text-2xl font-semibold">{category.name}</h3>
                <Badge variant="outline">{category.count} integrations</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {category.integrations.map((integration, i) => (
                  <IntegrationCard key={i} integration={integration} />
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Partnership Program */}
        <section className="bg-gradient-to-r from-primary/10 to-transparent rounded-lg p-8 border border-primary/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <Badge>Technology Partners</Badge>
              <h3 className="text-3xl font-bold">Become a ReadyLayer Partner</h3>
              <p className="text-muted-foreground">
                Join our ecosystem of security, DevOps, and compliance partners. Build joint integrations,
                co-market solutions, and deliver better outcomes for engineering teams.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Joint go-to-market opportunities</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Technical integration support</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Co-branded content & case studies</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Revenue share opportunities</span>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Link href="/partnerships/apply">
                  <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors">
                    Apply to Partner Program
                  </button>
                </Link>
                <Link href="/docs/integrations">
                  <button className="px-6 py-2 border border-border rounded-md font-medium hover:bg-secondary transition-colors">
                    View API Docs
                  </button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {partnerBenefits.map((benefit, i) => (
                <Card key={i} className="bg-card/50">
                  <CardContent className="pt-6 text-center space-y-2">
                    <div className="flex justify-center text-primary">{benefit.icon}</div>
                    <div className="text-2xl font-bold">{benefit.value}</div>
                    <div className="text-sm text-muted-foreground">{benefit.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Integration Request */}
        <section className="text-center space-y-4">
          <h3 className="text-2xl font-bold">Don't see your tool?</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We're always expanding our ecosystem. Request an integration or build your own
            using our open API and webhooks.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/partnerships/request">
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors">
                Request Integration
              </button>
            </Link>
            <Link href="/docs/api-reference">
              <button className="px-6 py-2 border border-border rounded-md font-medium hover:bg-secondary transition-colors inline-flex items-center gap-2">
                API Documentation <ExternalLink className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </section>
      </div>
    </Container>
  )
}

/**
 * Featured partner card
 */
function PartnerCard({ partner, featured }: { partner: Partner; featured?: boolean }) {
  return (
    <Card className={`hover:shadow-lg transition-all ${featured ? 'border-primary' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-secondary/50 rounded-lg">
            {partner.logo}
          </div>
          {partner.verified && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Verified
            </Badge>
          )}
        </div>
        <CardTitle className="text-2xl">{partner.name}</CardTitle>
        <CardDescription>{partner.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Features */}
        <div className="space-y-2">
          <div className="text-sm font-semibold">Key Features:</div>
          <ul className="space-y-1">
            {partner.features.map((feature, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Use Cases */}
        <div className="flex flex-wrap gap-2">
          {partner.useCases.map((useCase, i) => (
            <Badge key={i} variant="outline">{useCase}</Badge>
          ))}
        </div>

        {/* CTA */}
        <div className="flex gap-3 pt-2">
          <Link href={partner.setupLink} className="flex-1">
            <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              Connect {partner.name} <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <Link href={partner.docsLink}>
            <button className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-secondary transition-colors">
              Docs
            </button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Integration card
 */
function IntegrationCard({ integration }: { integration: Integration }) {
  return (
    <Card className="hover:shadow-lg transition-all cursor-pointer">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 bg-secondary/50 rounded-lg">
            {integration.icon}
          </div>
          {integration.status === 'active' && (
            <Badge variant="secondary">Active</Badge>
          )}
          {integration.status === 'beta' && (
            <Badge variant="outline">Beta</Badge>
          )}
        </div>
        <CardTitle className="text-lg">{integration.name}</CardTitle>
        <CardDescription className="text-sm">{integration.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={integration.link}>
          <button className="w-full px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-secondary transition-colors flex items-center justify-center gap-2">
            Learn More <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </CardContent>
    </Card>
  )
}

// Types
interface Partner {
  name: string
  description: string
  logo: React.ReactNode
  verified: boolean
  features: string[]
  useCases: string[]
  setupLink: string
  docsLink: string
}

interface Integration {
  name: string
  description: string
  icon: React.ReactNode
  status: 'active' | 'beta' | 'coming-soon'
  link: string
}

// Data
const featuredPartners: Partner[] = [
  {
    name: 'GitHub',
    description: 'Deep integration with GitHub repos, PRs, and Actions for automated code governance',
    logo: <Github className="w-8 h-8" />,
    verified: true,
    features: [
      'PR status checks and comments',
      'GitHub Actions workflow integration',
      'Repository webhook support',
      'GitHub App installation'
    ],
    useCases: ['Code Review', 'CI/CD', 'Security'],
    setupLink: '/dashboard/repos/connect?provider=github',
    docsLink: '/docs/integrations/github'
  },
  {
    name: 'GitLab',
    description: 'Native GitLab integration for merge request enforcement and pipeline integration',
    logo: <GitBranch className="w-8 h-8" />,
    verified: true,
    features: [
      'Merge request approval rules',
      'GitLab CI/CD integration',
      'Repository mirroring support',
      'Group-level policies'
    ],
    useCases: ['Code Review', 'DevOps', 'Compliance'],
    setupLink: '/dashboard/repos/connect?provider=gitlab',
    docsLink: '/docs/integrations/gitlab'
  },
  {
    name: 'Snyk',
    description: 'Combined security scanning — ReadyLayer governance + Snyk vulnerability detection',
    logo: <Shield className="w-8 h-8" />,
    verified: true,
    features: [
      'Unified security findings',
      'Dependency vulnerability correlation',
      'License compliance checks',
      'Container image scanning'
    ],
    useCases: ['Security', 'Compliance', 'DevSecOps'],
    setupLink: '/integrations/snyk/setup',
    docsLink: '/docs/integrations/snyk'
  },
  {
    name: 'Vanta',
    description: 'Automated compliance evidence generation for SOC 2, ISO 27001, and more',
    logo: <FileCheck className="w-8 h-8" />,
    verified: true,
    features: [
      'Evidence export to Vanta',
      'Continuous compliance monitoring',
      'Automated control testing',
      'Audit trail integration'
    ],
    useCases: ['Compliance', 'Audit', 'SOC 2'],
    setupLink: '/integrations/vanta/setup',
    docsLink: '/docs/integrations/vanta'
  }
]

const integrationCategories = [
  {
    name: 'Version Control',
    icon: <GitBranch className="w-6 h-6 text-primary" />,
    count: 4,
    integrations: [
      {
        name: 'GitHub Enterprise',
        description: 'Self-hosted GitHub with advanced security',
        icon: <Github className="w-5 h-5" />,
        status: 'active' as const,
        link: '/docs/integrations/github-enterprise'
      },
      {
        name: 'Bitbucket',
        description: 'Atlassian Bitbucket Cloud & Data Center',
        icon: <Database className="w-5 h-5" />,
        status: 'active' as const,
        link: '/docs/integrations/bitbucket'
      },
      {
        name: 'Azure DevOps',
        description: 'Microsoft Azure Repos integration',
        icon: <Package className="w-5 h-5" />,
        status: 'beta' as const,
        link: '/docs/integrations/azure-devops'
      }
    ]
  },
  {
    name: 'Security & Compliance',
    icon: <Shield className="w-6 h-6 text-primary" />,
    count: 5,
    integrations: [
      {
        name: 'Wiz',
        description: 'Cloud security posture management',
        icon: <Shield className="w-5 h-5" />,
        status: 'active' as const,
        link: '/docs/integrations/wiz'
      },
      {
        name: 'Drata',
        description: 'Automated compliance platform',
        icon: <FileCheck className="w-5 h-5" />,
        status: 'active' as const,
        link: '/docs/integrations/drata'
      },
      {
        name: 'Lacework',
        description: 'Cloud security automation',
        icon: <Lock className="w-5 h-5" />,
        status: 'beta' as const,
        link: '/docs/integrations/lacework'
      }
    ]
  },
  {
    name: 'CI/CD & DevOps',
    icon: <Zap className="w-6 h-6 text-primary" />,
    count: 4,
    integrations: [
      {
        name: 'Jenkins',
        description: 'Popular open-source automation server',
        icon: <Zap className="w-5 h-5" />,
        status: 'active' as const,
        link: '/docs/integrations/jenkins'
      },
      {
        name: 'CircleCI',
        description: 'Cloud-native CI/CD platform',
        icon: <Zap className="w-5 h-5" />,
        status: 'active' as const,
        link: '/docs/integrations/circleci'
      },
      {
        name: 'ArgoCD',
        description: 'GitOps continuous delivery',
        icon: <GitBranch className="w-5 h-5" />,
        status: 'beta' as const,
        link: '/docs/integrations/argocd'
      }
    ]
  }
]

const partnerBenefits = [
  { icon: <Users className="w-6 h-6" />, value: '500+', label: 'Joint Customers' },
  { icon: <TrendingUp className="w-6 h-6" />, value: '3x', label: 'Avg Deal Size' },
  { icon: <Award className="w-6 h-6" />, value: '95%', label: 'Partner Satisfaction' },
  { icon: <Zap className="w-6 h-6" />, value: '<2wks', label: 'Integration Time' }
]
