import { AppLayout } from '@/components/layout/app-layout'
import { AISupportBot } from '@/components/ai-support/chat-bot'
import { ErrorBoundary } from '@/components/ui/error-boundary'

export default function AppRootLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <ErrorBoundary>
      <AppLayout>
        {children}
        <AISupportBot />
      </AppLayout>
    </ErrorBoundary>
  )
}
