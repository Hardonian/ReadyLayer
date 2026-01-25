import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/ui/container'
import { Footer } from '@/components/layout/footer'
import { PUBLIC_NAV_ITEMS } from '@/lib/navigation'

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-muted/95 backdrop-blur supports-[backdrop-filter]:bg-surface-muted/60">
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" className="flex items-center flex-shrink-0" aria-label="ReadyLayer Home">
              <picture>
                <source srcSet="/logo-header.webp" type="image/webp" />
                <Image
                  src="/logo-header.png"
                  alt="ReadyLayer"
                  width={140}
                  height={28}
                  priority
                  className="h-7 w-auto dark:invert"
                />
              </picture>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {PUBLIC_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium text-text-muted hover:text-text transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Link
                href="/docs"
                className="text-sm font-medium text-text-muted hover:text-text transition-colors"
              >
                View docs
              </Link>
              <a
                href="https://github.com/Hardonian/ReadyLayer"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                See GitHub
              </a>
            </div>
          </div>
        </Container>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
