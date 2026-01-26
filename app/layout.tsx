import type { Metadata } from 'next'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { PlatformThemeProvider } from '@/components/providers/platform-theme-provider'
import { RuntimeUiConfigProvider } from '@/components/providers/runtime-ui-config-provider'
import { Toaster } from '@/components/ui/toaster'

// Stitch typography system
const inter = Inter({ 
  variable: '--font-inter', 
  subsets: ['latin'],
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({ 
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({ 
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'ReadyLayer — Open-source governance for AI-generated code',
    template: '%s | ReadyLayer',
  },
  description:
    'ReadyLayer is an open-source governance framework for AI-generated code. Deterministic checks, traceable decisions, and composable workflow policy.',
  keywords: [
    'open-source governance',
    'AI-generated code',
    'code governance framework',
    'policy as code',
    'deterministic checks',
    'git workflow governance',
  ],
  authors: [{ name: 'ReadyLayer' }],
  creator: 'ReadyLayer',
  publisher: 'ReadyLayer',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://readylayer.dev'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'ReadyLayer',
    title: 'ReadyLayer — Open-source governance for AI-generated code',
    description:
      'Open-source governance framework for AI-generated code with deterministic checks and traceable decisions.',
    images: [
      {
        url: '/logo-seo.png',
        width: 359,
        height: 344,
        alt: 'ReadyLayer - Open-source governance framework',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReadyLayer — Open-source governance for AI-generated code',
    description:
      'Open-source governance framework for AI-generated code with deterministic checks and traceable decisions.',
    images: ['/logo-seo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_VERIFICATION,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="icon" type="image/webp" sizes="32x32" href="/favicon.webp" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
        <ThemeProvider>
          <QueryProvider>
            <PlatformThemeProvider>
              <RuntimeUiConfigProvider>
                {children}
                <Toaster />
              </RuntimeUiConfigProvider>
            </PlatformThemeProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
