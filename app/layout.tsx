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
  title: 'ReadyLayer — AI Code Readiness Platform',
  description: 'AI writes the code. ReadyLayer makes it production-ready.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AppLayout>{children}</AppLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}
