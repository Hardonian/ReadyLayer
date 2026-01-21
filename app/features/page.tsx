import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'

export default function FeaturesPage() {
  return (
    <main className="min-h-screen py-16 lg:py-20">
      <Container size="lg">
        <div className="max-w-2xl">
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">Features</h1>
          <p className="text-text-muted text-lg mb-8">
            Explore how ReadyLayer supports different teams with enforcement-first readiness checks.
          </p>
          <div className="flex flex-col gap-4">
            <Button asChild variant="outline">
              <Link href="/features/oss-maintainers">For OSS Maintainers</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/features/startup-ctos">For Startup CTOs</Link>
            </Button>
          </div>
        </div>
      </Container>
    </main>
  )
}
