import React from 'react'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'

type SimplePageCta = {
  label: string
  href: string
  external?: boolean
  variant?: 'default' | 'outline'
}

type SimplePageProps = {
  title: string
  description: string
  primaryCta?: SimplePageCta
  secondaryCta?: SimplePageCta
}

export function SimplePage({ title, description, primaryCta, secondaryCta }: SimplePageProps): React.JSX.Element {
  return (
    <main className="min-h-screen py-16 lg:py-20">
      <Container size="lg">
        <div className="max-w-2xl">
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">{title}</h1>
          <p className="text-text-muted text-lg mb-8">{description}</p>
          {(primaryCta || secondaryCta) && (
            <div className="flex flex-wrap gap-3">
              {primaryCta && (
                <Button asChild variant={primaryCta.variant ?? 'default'}>
                  {primaryCta.external ? (
                    <a href={primaryCta.href} target="_blank" rel="noopener noreferrer">
                      {primaryCta.label}
                    </a>
                  ) : (
                    <Link href={primaryCta.href}>{primaryCta.label}</Link>
                  )}
                </Button>
              )}
              {secondaryCta && (
                <Button asChild variant={secondaryCta.variant ?? 'outline'}>
                  {secondaryCta.external ? (
                    <a href={secondaryCta.href} target="_blank" rel="noopener noreferrer">
                      {secondaryCta.label}
                    </a>
                  ) : (
                    <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </Container>
    </main>
  )
}
