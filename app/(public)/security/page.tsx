import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, AlertTriangle, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Security',
  description: 'Security disclosure guidance and non-guarantees for ReadyLayer OSS governance workflows.',
}

export default function SecurityPage(): React.JSX.Element {
  return (
    <main className="min-h-screen py-12 lg:py-24">
      <Container size="lg" className="space-y-12">
        <div className="text-center space-y-4">
          <Badge variant="outline" className="mx-auto">Security disclosure</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold">Security & disclosure</h1>
          <p className="text-text-muted text-lg max-w-3xl mx-auto">
            ReadyLayer is open-source governance infrastructure. We publish security guidance and encourage responsible
            disclosure.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Shield className="h-6 w-6 text-accent" />
              <CardTitle className="mt-3">Disclosure policy</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-text-muted">
              Report vulnerabilities responsibly via the OSS security policy. We review and respond as quickly as possible.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <AlertTriangle className="h-6 w-6 text-accent" />
              <CardTitle className="mt-3">Non-guarantees</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-text-muted">
              ReadyLayer provides deterministic governance checks but does not replace human review, testing, or legal
              compliance. Always validate outputs in your own environment.
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Report a vulnerability</h2>
          <p className="text-text-muted">
            Please use the security policy in the OSS repository for disclosure details.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href="https://github.com/Hardonian/ReadyLayer/blob/main/SECURITY.md" target="_blank" rel="noopener noreferrer">
                View security policy
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="mailto:security@readylayer.io">
                <Mail className="h-4 w-4 mr-2" />
                Email security team
              </a>
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold">What ReadyLayer does not do</h2>
          <ul className="list-disc list-inside text-text-muted space-y-1">
            <li>ReadyLayer is not an AI model.</li>
            <li>ReadyLayer is not a linter, IDE, or test replacement.</li>
            <li>ReadyLayer does not auto-approve PRs.</li>
          </ul>
        </div>

        <div className="text-sm text-text-muted">
          For operational status updates, visit{' '}
          <Link href="/status" className="text-accent hover:underline">/status</Link>.
        </div>
      </Container>
    </main>
  )
}
