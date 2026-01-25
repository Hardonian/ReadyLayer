import { AppLayout } from '@/components/layout/app-layout'
import { AISupportBot } from '@/components/ai-support/chat-bot'

export default function AppRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppLayout>
      {children}
      <AISupportBot />
    </AppLayout>
  )
}
