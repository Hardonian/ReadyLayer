'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Container, ErrorState } from '@/components/ui'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): React.JSX.Element {
  const router = useRouter()

  useEffect(() => {
    console.error('App route error:', error)
  }, [error])

  return (
    <Container size="md" className="min-h-screen flex items-center justify-center">
      <ErrorState
        title="We hit a snag loading your workspace"
        message="Please try again. If the issue persists, return to the homepage and retry from there."
        action={{
          label: 'Try again',
          onClick: reset,
        }}
        secondaryAction={{
          label: 'Go home',
          onClick: () => router.push('/'),
        }}
        showDetails={process.env.NODE_ENV === 'development'}
        details={error.message}
      />
    </Container>
  )
}
