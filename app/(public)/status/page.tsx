import type { Metadata } from 'next'
import Link from 'next/link'
import { Activity, CheckCircle2, Server } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Container } from '@/components/ui/container'

export const metadata: Metadata = {
  title: 'Operational Status',
  description: 'ReadyLayer liveness and readiness probe semantics for self-hosted and pilot deployments.',
}

export default function StatusPage(): React.JSX.Element {
  return (
    <main className="min-h-screen py-12 lg:py-24">
      <Container size="md" className="space-y-12">
        <section className="space-y-4 text-center">
          <Badge variant="outline" className="mx-auto">Deployment-local status</Badge>
          <h1 className="text-4xl font-bold sm:text-5xl">Operational status</h1>
          <p className="mx-auto max-w-2xl text-text-muted">
            ReadyLayer is self-hosted first. The authoritative status is the health and readiness output from the instance
            your team operates. Managed pilot communications follow the incident path agreed with that pilot.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Activity className="h-6 w-6 text-success" />
              <CardTitle className="mt-3">Liveness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-text-muted">
              <p><code>/api/health</code> confirms that the application process can respond. It performs no dependency I/O.</p>
              <Button asChild size="sm" variant="outline"><a href="/api/health">Open liveness response</a></Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Server className="h-6 w-6 text-primary" />
              <CardTitle className="mt-3">Readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-text-muted">
              <p><code>/api/ready</code> reports whether required configuration, storage, schema, and encryption checks are ready.</p>
              <Button asChild size="sm" variant="outline"><a href="/api/ready">Open readiness response</a></Button>
            </CardContent>
          </Card>
        </div>

        <section className="rounded-xl border border-border/40 bg-surface/40 p-6">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-success" />
            <div className="space-y-2">
              <h2 className="font-semibold">Operator guidance</h2>
              <p className="text-sm text-text-muted">
                Use liveness for process restart decisions and readiness for traffic admission. Do not convert a failed
                dependency check into green status to keep a deployment moving.
              </p>
              <Link href="/security" className="text-sm text-primary hover:underline">Review the trust center</Link>
            </div>
          </div>
        </section>
      </Container>
    </main>
  )
}
