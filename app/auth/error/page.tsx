'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Container } from '@/components/ui/container'
import { fadeIn } from '@/lib/design/motion'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: Record<string, string> = {
    AuthError: 'An error occurred during authentication. Please try again.',
    AccessDenied: 'You do not have permission to sign in.',
    Configuration: 'There is a problem with the server configuration.',
    Default: 'An error occurred during authentication.',
  }

  const message = errorMessages[error || ''] || errorMessages.Default

  return (
    <Container size="sm" className="min-h-screen flex items-center justify-center py-12">
      <motion.div
        className="w-full max-w-md"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        <Card>
          <CardHeader>
            <CardTitle>Authentication Error</CardTitle>
            <CardDescription>
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/auth/signin">Try Again</Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <Container size="sm" className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Container>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}
