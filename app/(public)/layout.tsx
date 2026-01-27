import type { Metadata } from 'next'
import { PublicLayout } from '@/components/layout/public-layout'
import { ErrorBoundary } from '@/components/ui/error-boundary'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ReadyLayer',
  url: 'https://readylayer.dev',
  logo: 'https://readylayer.dev/logo-seo.png',
  sameAs: ['https://github.com/Hardonian/ReadyLayer'],
}

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ReadyLayer',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  isAccessibleForFree: true,
  url: 'https://readylayer.dev',
  description:
    'Open-source governance framework for AI-generated code with deterministic checks and traceable decisions.',
}

export const metadata: Metadata = {
  title: {
    default: 'ReadyLayer — Open-source governance for AI-generated code',
    template: '%s | ReadyLayer',
  },
}

export default function PublicRootLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <ErrorBoundary>
      <PublicLayout>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
        {children}
      </PublicLayout>
    </ErrorBoundary>
  )
}
