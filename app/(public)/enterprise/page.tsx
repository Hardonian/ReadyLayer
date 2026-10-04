import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  GitPullRequest,
  Server,
  Shield,
  Users,
} from 'lucide-react'
import { AgentRiskSimulator } from '@/components/enterprise/AgentRiskSimulator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { PRODUCT_CAPABILITIES } from '@/lib/product/capability-catalog'

export const metadata: Metadata = {
  title: 'Enterprise AI Agent Governance',
  description:
    'Evaluate ReadyLayer with a scoped design-partner pilot: deterministic policy gates, signed evidence, self-hosted deployment, and explicit acceptance criteria.',
}

const pilotPhases = [
  {
    phase: '01',
    title: 'Baseline',
    description: 'Select one repository, map protected paths, and capture current agent-driven change risk.',
  },
  {
    phase: '02',
    title: 'Shadow',
    description: 'Run policies without blocking merges, review false positives, and agree on escalation ownership.',
  },
  {
    phase: '03',
    title: 'Enforce',
    description: 'Enable only the gates that met acceptance criteria, with signed and expiring exception paths.',
  },
  {
    phase: '04',
    title: 'Decide',
    description: 'Export the evidence, review measured outcomes, and make an explicit production go/no-go decision.',
  },
] as const

const evaluationCriteria = [
  'Critical protected-path changes are classified consistently.',
  'Every blocking decision names the policy version and evidence source.',
  'Waivers are scoped, signed, attributable, and expire automatically.',
  'The team can export evidence without relying on a vendor-controlled UI.',
] as const

export default function EnterprisePage(): React.JSX.Element {
  const repositoryBackedCapabilities = PRODUCT_CAPABILITIES.filter(
    (capability) => capability.status !== 'design-partner'
  ).slice(0, 4)

  return (
    <main className="min-h-screen py-16 lg:py-24">
      <Container size="lg" className="space-y-24">
        <section className="mx-auto max-w-5xl space-y-8 text-center">
          <Badge variant="outline" className="mx-auto">Design-partner enterprise pilot</Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Put enforceable boundaries around autonomous coding agents.
          </h1>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-text-muted sm:text-xl">
            ReadyLayer adds deterministic policy gates and portable evidence to the delivery workflow you already run.
            Start with one repository, prove the controls in shadow mode, and expand only after explicit acceptance.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="px-8">
              <Link href="/contact">Scope a design-partner pilot</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-8">
              <Link href="/security">Inspect capability evidence</Link>
            </Button>
          </div>
          <div className="grid gap-3 pt-4 text-left sm:grid-cols-3">
            {[
              ['Self-hostable', 'Run the control plane and evidence store in infrastructure you operate.'],
              ['Policy-versioned', 'Bind decisions to the exact rule set that evaluated the change.'],
              ['Exit-friendly', 'Keep source, policy, and evidence formats available outside a managed service.'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-xl border border-border/40 bg-surface/40 p-4">
                <div className="font-semibold text-text-primary">{title}</div>
                <div className="mt-1 text-sm text-text-muted">{description}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <div className="mx-auto max-w-3xl space-y-3 text-center">
            <Badge variant="outline">Interactive evaluation</Badge>
            <h2 className="text-3xl font-bold">See the control decision, not a black-box score</h2>
            <p className="text-text-muted">
              Explore representative agent-risk scenarios and the evidence a reviewer receives before approving a change.
            </p>
          </div>
          <AgentRiskSimulator />
        </section>

        <section className="space-y-10">
          <div className="max-w-3xl space-y-3">
            <Badge variant="outline">Repository-backed capabilities</Badge>
            <h2 className="text-3xl font-bold">Start from inspectable implementation</h2>
            <p className="text-text-muted">
              These capabilities link to source and tests in the public trust center. Beta workflows require validation
              against your repositories, identity model, and delivery topology.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {repositoryBackedCapabilities.map((capability, index) => {
              const icons = [Shield, FileCheck2, GitPullRequest, Server] as const
              const Icon = icons[index] ?? Shield
              return (
                <Card key={capability.id} className="h-full">
                  <CardHeader>
                    <Icon className="h-6 w-6 text-primary" />
                    <CardTitle className="mt-3">{capability.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-text-muted">
                    <p>{capability.summary}</p>
                    <p className="font-medium text-text-primary">{capability.availability}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <Button asChild variant="outline">
            <Link href="/security">View the full evidence matrix <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </section>

        <section className="rounded-2xl border border-border/40 bg-surface/40 p-6 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <Badge variant="outline">Pilot motion</Badge>
              <h2 className="text-3xl font-bold">A reversible path to production</h2>
              <p className="leading-relaxed text-text-muted">
                The pilot is structured to learn before it blocks. Production use is a decision backed by acceptance
                evidence—not a calendar milestone or a sales promise.
              </p>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Users className="h-4 w-4 text-primary" />
                Security, platform, and application owners share the sign-off.
              </div>
            </div>
            <ol className="grid gap-4 sm:grid-cols-2">
              {pilotPhases.map((phase) => (
                <li key={phase.phase} className="rounded-xl border border-border/30 bg-background/60 p-4">
                  <div className="font-mono text-xs text-primary">PHASE {phase.phase}</div>
                  <h3 className="mt-2 font-semibold text-text-primary">{phase.title}</h3>
                  <p className="mt-1 text-sm text-text-muted">{phase.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <Badge variant="outline">Acceptance criteria</Badge>
            <h2 className="text-3xl font-bold">Know what “good” means before the pilot starts</h2>
            <ul className="space-y-3">
              {evaluationCriteria.map((criterion) => (
                <li key={criterion} className="flex gap-3 text-sm text-text-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-success" />
                  <span>{criterion}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle>Commercial and assurance boundary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-text-muted">
              <p>
                Managed hosting, service levels, support windows, data residency, and security obligations are not
                implied by this page. They are scoped during the pilot and become commitments only in an executed order
                form or agreement.
              </p>
              <p>
                ReadyLayer provides technical evidence for your governance program; it does not certify your organization
                against a regulatory or compliance framework.
              </p>
              <Button asChild className="w-full">
                <Link href="/contact">Discuss requirements</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6 border-t border-border/30 pt-16 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Bring one risky workflow. Leave with evidence.</h2>
          <p className="mx-auto max-w-2xl text-text-muted">
            Evaluate the open-source runner first, or scope a design-partner pilot around a repository and control boundary
            that matter to your team.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg"><Link href="/contact">Scope the pilot</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/open-source">Deploy open source</Link></Button>
          </div>
        </section>
      </Container>
    </main>
  )
}
