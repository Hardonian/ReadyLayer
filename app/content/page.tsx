import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen, FileCheck2, GitBranch, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Container } from '@/components/ui/container'

export const metadata: Metadata = {
  title: 'Resources',
  description: 'ReadyLayer evaluation paths, technical guides, release notes, and evidence-backed governance resources.',
}

const resources = [
  {
    title: 'Evidence-led evaluation',
    description: 'Inspect a decision bundle, verify policy provenance, and understand the deployment boundary before connecting a repository.',
    href: '/evaluate',
    label: 'Start evaluation',
    icon: FileCheck2,
  },
  {
    title: 'Trust center',
    description: 'See which capabilities are repository-verified, beta, or limited to a design-partner pilot.',
    href: '/security',
    label: 'Inspect evidence',
    icon: ShieldCheck,
  },
  {
    title: 'Technical documentation',
    description: 'Follow supported setup, API, policy, and self-hosting guidance.',
    href: '/docs',
    label: 'Read the docs',
    icon: BookOpen,
  },
  {
    title: 'Release history',
    description: 'Review shipped changes and use the source history when evaluating behavior.',
    href: '/changelog',
    label: 'View changelog',
    icon: GitBranch,
  },
] as const

const operatorGuides = [
  ['Deployment', 'docs/DEPLOYMENT.md'],
  ['Failure modes', 'docs/FAILURE_MODES.md'],
  ['Incident response', 'docs/runbooks/incident-response.md'],
  ['Rollback', 'docs/runbooks/rollback.md'],
  ['Go-live checklist', 'docs/runbooks/go-live.md'],
] as const

export default function ContentHubPage(): React.JSX.Element {
  return (
    <main className="min-h-screen py-12 lg:py-24">
      <Container size="lg" className="space-y-16">
        <section className="mx-auto max-w-4xl space-y-5 text-center">
          <Badge variant="outline" className="mx-auto">Inspectable resources</Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Evaluate the product from evidence</h1>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-text-muted">
            No anonymous customer logos, invented case studies, or vanity metrics. Start with runnable workflows,
            repository evidence, and explicit operating boundaries.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {resources.map((resource) => {
            const Icon = resource.icon
            return (
              <Card key={resource.href} className="h-full">
                <CardHeader>
                  <Icon className="h-6 w-6 text-primary" />
                  <CardTitle className="mt-3">{resource.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="text-sm leading-relaxed text-text-muted">{resource.description}</p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={resource.href}>{resource.label}<ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="rounded-2xl border border-border/40 bg-surface/40 p-6 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-3">
              <Badge variant="outline">Operator library</Badge>
              <h2 className="text-3xl font-bold">Runbooks, not thought leadership filler</h2>
              <p className="text-sm leading-relaxed text-text-muted">
                These version-controlled guides are reviewed with the code and designed for teams operating ReadyLayer in
                their own environment.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {operatorGuides.map(([label, path]) => (
                <a
                  key={path}
                  href={`https://github.com/Hardonian/ReadyLayer/blob/main/${path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-border/30 bg-background/60 p-4 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {label}<ArrowRight className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-5 text-center">
          <h2 className="text-3xl font-bold">Have real outcome evidence?</h2>
          <p className="mx-auto max-w-2xl text-text-muted">
            ReadyLayer will publish a case study only with named approval, reproducible methodology, and clearly scoped
            measurements. Design partners can opt in after a completed evaluation.
          </p>
          <Button asChild><Link href="/contact">Discuss a design-partner evaluation</Link></Button>
        </section>
      </Container>
    </main>
  )
}
