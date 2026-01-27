'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Container, ErrorState } from '@/components/ui'

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): React.JSX.Element {
  const router = useRouter()

  useEffect(() => {
    console.error('Public route error:', error)
  }, [error])

  return (
    <Container size="md" className="min-h-screen flex items-center justify-center">
      <ErrorState
        title="We couldn’t load this page"
        message="Try again or return home. The rest of ReadyLayer is still available."
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
