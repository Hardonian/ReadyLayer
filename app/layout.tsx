import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppLayout } from '@/components/layout/app-layout'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'ReadyLayer — AI Code Readiness Platform',
    template: '%s | ReadyLayer',
  },
  description: 'AI writes the code. ReadyLayer makes it production-ready. Automated verification, testing, and documentation for AI-generated code.',
  keywords: [
    'AI code review',
    'code verification',
    'AI code quality',
    'automated testing',
    'code documentation',
    'GitHub integration',
    'GitLab integration',
    'CI/CD integration',
    'code security',
    'AI code safety',
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
    title: 'ReadyLayer — AI Code Readiness Platform',
    description: 'AI writes the code. ReadyLayer makes it production-ready.',
    images: [
      {
        url: '/logo-seo.png',
        width: 359,
        height: 344,
        alt: 'ReadyLayer - AI Code Readiness Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReadyLayer — AI Code Readiness Platform',
    description: 'AI writes the code. ReadyLayer makes it production-ready.',
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
      <body className={inter.className}>
        <ThemeProvider>
          <AppLayout>{children}</AppLayout>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
