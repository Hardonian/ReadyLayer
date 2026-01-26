import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Github, Gitlab, GitBranch, Code } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Integrations',
  description: 'ReadyLayer integrates with Git and CI workflows without replacing your existing tooling.',
}

const integrations = [
  {
    title: 'GitHub',
    description: 'Run governance checks in GitHub Actions and annotate pull requests with results.',
    icon: Github,
  },
  {
    title: 'GitLab',
    description: 'Use GitLab CI pipelines to run ReadyLayer checks and attach artifacts to merge requests.',
    icon: Gitlab,
  },
  {
    title: 'Bitbucket',
    description: 'Integrate with Bitbucket pipelines for deterministic governance in your PR flow.',
    icon: Code,
  },
]

export default function IntegrationsPage() {
  return (
    <main className="min-h-screen py-12 lg:py-24">
      <Container size="lg" className="space-y-12">
        <div className="text-center space-y-4">
          <Badge variant="outline" className="mx-auto">Git + CI first</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold">Integrations</h1>
          <p className="text-text-muted text-lg max-w-3xl mx-auto">
            ReadyLayer is composable with existing Git and CI workflows. Use your current tooling and add governance on top.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {integrations.map((integration) => {
            const Icon = integration.icon
            return (
              <Card key={integration.title}>
                <CardHeader>
                  <Icon className="h-6 w-6 text-accent" />
                  <CardTitle className="mt-3">{integration.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-text-muted">{integration.description}</CardContent>
              </Card>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/docs">Get started (OSS)</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/docs/api-reference">View API reference</Link>
          </Button>
          <Button asChild variant="ghost">
            <a href="https://github.com/Hardonian/ReadyLayer" target="_blank" rel="noopener noreferrer">
              <GitBranch className="h-4 w-4 mr-2" />
              See GitHub
            </a>
          </Button>
        </div>
      </Container>
    </main>
  )
}
