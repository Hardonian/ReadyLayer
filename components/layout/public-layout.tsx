import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/ui/container'
import { Footer } from '@/components/layout/footer'
import { PUBLIC_NAV_ITEMS } from '@/lib/navigation'

export function PublicLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border/20 backdrop-blur-custom bg-surface/95 dark:bg-surface/90 shadow-surface-flat transition-all duration-300">
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
                  className="h-7 w-auto"
                />
              </picture>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {PUBLIC_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 text-sm font-display font-medium text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-surface-hover tap-target"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <Link
                href="/docs"
                className="text-sm font-display font-medium text-text-muted hover:text-text-primary transition-colors px-3 py-2 rounded-lg hover:bg-surface-hover tap-target"
              >
                View docs
              </Link>
              <a
                href="https://github.com/Hardonian/ReadyLayer"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-display font-semibold text-primary-foreground shadow-glow hover:shadow-glow-green transition-all tap-target"
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
