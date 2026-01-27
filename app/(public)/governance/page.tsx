import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Users, AlertTriangle, GitBranch } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Governance',
  description:
    'Human-in-the-loop governance for AI-generated code. Deterministic checks, explicit failure modes, and auditable decisions.',
}

export default function GovernancePage(): React.JSX.Element {
  return (
    <main className="min-h-screen py-12 lg:py-24">
      <Container size="lg" className="space-y-12">
        <div className="text-center space-y-4">
          <Badge variant="outline" className="mx-auto">Human-in-the-loop</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold">Governance you can audit</h1>
          <p className="text-text-muted text-lg max-w-3xl mx-auto">
            ReadyLayer is not an auto-approval system. It enforces deterministic checks, records outcomes, and keeps
            humans in control of final merge decisions.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Users className="h-6 w-6 text-accent" />
              <CardTitle className="mt-3">Human-in-the-loop</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-text-muted">
              Policy checks inform reviewers. Humans decide whether to merge, waive, or revise.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CheckCircle2 className="h-6 w-6 text-accent" />
              <CardTitle className="mt-3">Deterministic decisions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-text-muted">
              Same diff + same policy produces the same outcome, making reviews repeatable.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <AlertTriangle className="h-6 w-6 text-accent" />
              <CardTitle className="mt-3">Failure modes documented</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-text-muted">
              Every failure state has a clear fallback. ReadyLayer never blocks PRs due to its own errors.
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6" />
            Governance flow
          </h2>
          <ol className="list-decimal list-inside text-text-muted space-y-2">
            <li>PR opened → diff captured</li>
            <li>Policy checks and test enforcement run in CI</li>
            <li>Artifacts and evidence attached to the PR</li>
            <li>Humans review and decide on merge</li>
          </ol>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/docs">Get started (OSS)</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/how-it-works">View decision flow</Link>
          </Button>
        </div>
      </Container>
    </main>
  )
}
