import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Github, ShieldCheck, ShieldOff, BookOpen } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Open Source',
  description:
    'ReadyLayer is OSS-first governance infrastructure. Run it locally, fork it safely, and audit the source end-to-end.',
}

export default function OpenSourcePage(): React.JSX.Element {
  return (
    <main className="min-h-screen py-12 lg:py-24">
      <Container size="lg" className="space-y-12">
        <div className="space-y-4 text-center">
          <Badge variant="outline" className="mx-auto">OSS-first</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold">Open-source governance infrastructure</h1>
          <p className="text-text-muted text-lg max-w-3xl mx-auto">
            ReadyLayer is an open-source governance framework for AI-generated code. Run it in your own
            infrastructure, inspect the source, and fork without risk.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <ShieldCheck className="h-6 w-6 text-accent" />
              <CardTitle className="mt-3">No phone-home</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-text-muted">
              OSS deployments do not require outbound telemetry. Everything needed to govern PRs runs locally.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <ShieldOff className="h-6 w-6 text-accent" />
              <CardTitle className="mt-3">Fork-safe</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-text-muted">
              Governance rules are versioned in your repo. You can fork without losing your audit trail.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <BookOpen className="h-6 w-6 text-accent" />
              <CardTitle className="mt-3">Documented OSS boundary</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-text-muted">
              ReadyLayer OSS is the source of truth. Hosted services only add convenience, not logic changes.
            </CardContent>
          </Card>
        </div>

        <div id="oss-boundary" className="space-y-4">
          <h2 className="text-2xl font-bold">OSS boundary</h2>
          <p className="text-text-muted">
            The open-source core includes governance rules, deterministic checks, audit artifacts, and the pipeline
            that runs inside your Git + CI environment. Hosted options mirror OSS behavior and do not add hidden logic.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/docs">Get started (OSS)</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/docs">View docs</Link>
          </Button>
          <Button asChild variant="ghost">
            <a href="https://github.com/Hardonian/ReadyLayer" target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4 mr-2" />
              See GitHub
            </a>
          </Button>
        </div>
      </Container>
    </main>
  )
}
