import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ExternalLink, FlaskConical, Mail, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import {
  CAPABILITY_STATUS_LABELS,
  PRODUCT_CAPABILITIES,
  type CapabilityStatus,
} from '@/lib/product/capability-catalog'

export const metadata: Metadata = {
  title: 'Trust Center',
  description: 'Evidence-backed ReadyLayer capabilities, maturity boundaries, verification commands, and security disclosure guidance.',
}

const statusStyles: Readonly<Record<CapabilityStatus, string>> = {
  verified: 'border-success/30 bg-success/10 text-success',
  beta: 'border-warning/30 bg-warning/10 text-warning',
  'design-partner': 'border-info/30 bg-info/10 text-info',
}

const statusIcons: Readonly<Record<CapabilityStatus, typeof CheckCircle2>> = {
  verified: CheckCircle2,
  beta: FlaskConical,
  'design-partner': AlertTriangle,
}

export default function SecurityPage(): React.JSX.Element {
  return (
    <main className="min-h-screen py-12 lg:py-24">
      <Container size="lg" className="space-y-16">
        <section className="mx-auto max-w-4xl space-y-6 text-center">
          <Badge variant="outline" className="mx-auto">Evidence over adjectives</Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">ReadyLayer Trust Center</h1>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-text-muted">
            Product maturity should be inspectable. This page separates repository-verified capabilities, beta workflows,
            and design-partner commitments—and links every product claim to evidence you can review.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/evaluate">Run an evidence-led evaluation</Link>
            </Button>
            <Button asChild variant="outline">
              <a href="https://github.com/Hardonian/ReadyLayer" target="_blank" rel="noopener noreferrer">
                Inspect the source <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </section>

        <section aria-labelledby="capability-heading" className="space-y-8">
          <div className="max-w-3xl space-y-3">
            <h2 id="capability-heading" className="text-3xl font-bold">Capability evidence matrix</h2>
            <p className="text-text-muted">
              “Verified” means the implementation and its verification path are present in this repository. It does not
              mean a third party has certified the product or that every deployment is production-ready by default.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {PRODUCT_CAPABILITIES.map((capability) => {
              const StatusIcon = statusIcons[capability.status]
              return (
                <Card key={capability.id} className="h-full border-border/40">
                  <CardHeader className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <Badge variant="outline" className={statusStyles[capability.status]}>
                        <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                        {CAPABILITY_STATUS_LABELS[capability.status]}
                      </Badge>
                      <span className="text-xs uppercase tracking-wide text-text-subtle">{capability.category}</span>
                    </div>
                    <CardTitle>{capability.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <p className="text-sm leading-relaxed text-text-muted">{capability.summary}</p>
                    <div className="rounded-lg border border-border/30 bg-surface-muted/40 p-3 text-sm">
                      <div className="font-medium text-text-primary">Availability</div>
                      <div className="mt-1 text-text-muted">{capability.availability}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-text-subtle">Verify</div>
                      <code className="mt-2 block overflow-x-auto rounded-md bg-surface-code px-3 py-2 text-xs text-text-primary">
                        {capability.verification}
                      </code>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {capability.evidence.map((evidence) => (
                        <a
                          key={evidence.path}
                          href={`https://github.com/Hardonian/ReadyLayer/blob/main/${evidence.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md border border-border/40 px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          {evidence.label}
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <ShieldCheck className="h-6 w-6 text-accent" />
              <CardTitle className="mt-3">Responsible disclosure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-text-muted">
              <p>Report suspected vulnerabilities privately. Please do not include production secrets or customer data.</p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="sm">
                  <a href="https://github.com/Hardonian/ReadyLayer/blob/main/SECURITY.md" target="_blank" rel="noopener noreferrer">
                    Security policy
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href="mailto:security@readylayer.io"><Mail className="mr-2 h-4 w-4" />Email security</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <AlertTriangle className="h-6 w-6 text-warning" />
              <CardTitle className="mt-3">Explicit non-guarantees</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-text-muted">
              ReadyLayer supports governance evidence; it does not replace human review, your CI test suite, legal advice,
              or an independent compliance audit. Hosted service levels and support obligations exist only when written in
              an executed agreement.
            </CardContent>
          </Card>
        </section>
      </Container>
    </main>
  )
}
