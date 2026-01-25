import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Cloud, ShieldCheck, GitBranch } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Enterprise',
  description:
    'Optional hosted ReadyLayer service for teams that want managed infrastructure without changing governance logic.',
}

export default function EnterprisePage() {
  return (
    <main className="min-h-screen py-12 lg:py-24">
      <Container size="lg" className="space-y-12">
        <div className="text-center space-y-4">
          <Badge variant="outline" className="mx-auto">Optional hosted service</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold">Enterprise Cloud (optional)</h1>
          <p className="text-text-muted text-lg max-w-3xl mx-auto">
            ReadyLayer OSS is the source of truth. Enterprise Cloud is a managed deployment for teams that want
            hosted convenience without changing governance logic.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Cloud className="h-6 w-6 text-accent" />
              <CardTitle className="mt-3">Hosted infrastructure</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-text-muted">
              Managed infrastructure, upgrades, and monitoring while keeping your governance policies intact.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <ShieldCheck className="h-6 w-6 text-accent" />
              <CardTitle className="mt-3">Same OSS logic</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-text-muted">
              Enterprise Cloud mirrors the OSS decision engine. No hidden logic or extra checks.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <GitBranch className="h-6 w-6 text-accent" />
              <CardTitle className="mt-3">Git + CI first</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-text-muted">
              Works with existing Git workflows and CI pipelines just like OSS deployments.
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/open-source">Get started (OSS)</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/docs">View docs</Link>
          </Button>
        </div>
      </Container>
    </main>
  )
}
