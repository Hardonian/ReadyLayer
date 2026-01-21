import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'

export default function GettingStartedPage() {
  return (
    <main className="min-h-screen py-16 lg:py-20">
      <Container size="lg">
        <div className="max-w-2xl">
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">Getting Started</h1>
          <p className="text-text-muted text-lg mb-8">
            Follow these guides to connect your repositories and start enforcing readiness checks.
          </p>
          <div className="flex flex-col gap-4">
            <Button asChild variant="outline">
              <Link href="/help/getting-started/welcome">Welcome to ReadyLayer</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/help/getting-started/connect-repo">Connect your repository</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/help/getting-started/policies">Understand policies</Link>
            </Button>
          </div>
        </div>
      </Container>
    </main>
  )
}
