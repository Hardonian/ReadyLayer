import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppLayout } from '@/components/layout/app-layout'
import { ThemeProvider } from '@/components/providers/theme-provider'

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
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ReadyLayer - AI Code Readiness Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReadyLayer — AI Code Readiness Platform',
    description: 'AI writes the code. ReadyLayer makes it production-ready.',
    images: ['/og-image.png'],
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
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AppLayout>{children}</AppLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}
