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

export default function EnterprisePage(): React.JSX.Element {
  return (
    <main className="min-h-screen py-16 lg:py-24">
      <Container size="lg" className="space-y-16">
        <div className="text-center space-y-6">
          <Badge variant="outline" className="mx-auto font-display">Optional hosted service</Badge>
          <h1 className="text-5xl sm:text-6xl font-display font-bold tracking-tight">Enterprise Cloud (optional)</h1>
          <p className="text-text-muted text-xl font-body max-w-4xl mx-auto">
            ReadyLayer OSS is the source of truth. Enterprise Cloud is a managed deployment for teams that want
            hosted convenience without changing governance logic.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="shadow-surface-raised hover:shadow-glow transition-all duration-300 border-border/20">
            <CardHeader>
              <Cloud className="h-8 w-8 text-primary" />
              <CardTitle className="mt-4 font-display text-xl">Hosted infrastructure</CardTitle>
            </CardHeader>
            <CardContent className="text-base font-body text-text-muted">
              Managed infrastructure, upgrades, and monitoring while keeping your governance policies intact.
            </CardContent>
          </Card>
          <Card className="shadow-surface-raised hover:shadow-glow transition-all duration-300 border-border/20">
            <CardHeader>
              <ShieldCheck className="h-8 w-8 text-primary" />
              <CardTitle className="mt-4 font-display text-xl">Same OSS logic</CardTitle>
            </CardHeader>
            <CardContent className="text-base font-body text-text-muted">
              Enterprise Cloud mirrors the OSS decision engine. No hidden logic or extra checks.
            </CardContent>
          </Card>
          <Card className="shadow-surface-raised hover:shadow-glow transition-all duration-300 border-border/20">
            <CardHeader>
              <GitBranch className="h-8 w-8 text-primary" />
              <CardTitle className="mt-4 font-display text-xl">Git + CI first</CardTitle>
            </CardHeader>
            <CardContent className="text-base font-body text-text-muted">
              Works with existing Git workflows and CI pipelines just like OSS deployments.
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-4">
          <Button asChild size="lg" className="shadow-glow tap-target">
            <Link href="/open-source">Get started (OSS)</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="tap-target">
            <Link href="/docs">View docs</Link>
          </Button>
        </div>
      </Container>
    </main>
  )
}
