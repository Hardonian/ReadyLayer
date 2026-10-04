import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, FileCheck2, PlayCircle, SearchCheck, Server } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Container } from '@/components/ui/container'

export const metadata: Metadata = {
  title: 'Evaluate ReadyLayer',
  description: 'A no-claims evaluation path for ReadyLayer: inspect, run, verify, and decide from evidence.',
}

const evaluationSteps = [
  {
    number: '01',
    title: 'Inspect a decision',
    description: 'Start with a deterministic audit example and see exactly which inputs, rules, and artifacts shape an outcome.',
    href: '/audit-example',
    action: 'Open audit example',
    icon: SearchCheck,
  },
  {
    number: '02',
    title: 'Verify policy provenance',
    description: 'Use the public verification flow to check evidence integrity rather than trusting a dashboard badge.',
    href: '/policy-verification',
    action: 'Verify a policy',
    icon: FileCheck2,
  },
  {
    number: '03',
    title: 'Run the sandbox',
    description: 'Sign in and execute the credential-free sandbox against fixed fixtures before connecting a real repository.',
    href: '/dashboard/runs/sandbox',
    action: 'Run sandbox',
    icon: PlayCircle,
  },
  {
    number: '04',
    title: 'Review the operating boundary',
    description: 'Check deployment, health, rollback, and security responsibilities before making a production decision.',
    href: '/security',
    action: 'Open trust center',
    icon: Server,
  },
] as const

export default function EvaluatePage(): React.JSX.Element {
  return (
    <main className="min-h-screen py-12 lg:py-24">
      <Container size="lg" className="space-y-16">
        <section className="mx-auto max-w-4xl space-y-6 text-center">
          <Badge variant="outline" className="mx-auto">Inspect → run → verify → decide</Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Evaluate ReadyLayer without a sales-story shortcut</h1>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-text-muted">
            This path uses deterministic fixtures and public evidence. It makes no promise about how long your evaluation
            will take or what outcome your repository will produce.
          </p>
        </section>

        <ol className="grid gap-6 md:grid-cols-2">
          {evaluationSteps.map((step) => {
            const Icon = step.icon
            return (
              <li key={step.number}>
                <Card className="h-full">
                  <CardHeader className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-primary">STEP {step.number}</span>
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <p className="text-sm leading-relaxed text-text-muted">{step.description}</p>
                    <Button asChild variant="outline" size="sm">
                      <Link href={step.href}>{step.action}<ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ol>

        <section className="rounded-2xl border border-border/40 bg-surface/40 p-6 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-3">
              <Badge variant="outline">Suggested decision record</Badge>
              <h2 className="text-3xl font-bold">Finish with a written go/no-go</h2>
              <p className="text-sm leading-relaxed text-text-muted">
                Record policy precision, failure behavior, operator effort, data handling, integration ownership, and the
                evidence export path. Do not expand rollout until the accountable owners accept those results.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-text-muted">
              {[
                'Which change classes must fail closed?',
                'Who can approve, sign, and expire an exception?',
                'What happens when a provider, queue, or model is unavailable?',
                'Can an auditor reproduce a decision without privileged production access?',
              ].map((question) => (
                <li key={question} className="rounded-lg border border-border/30 bg-background/60 p-3">{question}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg"><Link href="/docs">Read deployment docs</Link></Button>
          <Button asChild size="lg" variant="outline"><Link href="/contact">Scope a pilot</Link></Button>
        </section>
      </Container>
    </main>
  )
}
