'use client'

import { useState, Suspense } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, LoadingState, ErrorState } from '@/components/ui'
import { Container } from '@/components/ui/container'
import { fadeIn, slideUp } from '@/lib/design/motion'
import { Github } from 'lucide-react'

function SignInContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGitHubSignIn = async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createSupabaseClient()
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(callbackUrl)}`,
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <Container size="sm" className="min-h-screen flex items-center justify-center py-12">
      <motion.div
        className="w-full max-w-md"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="text-center mb-8"
          variants={slideUp}
        >
          <h1 className="text-4xl font-bold mb-2">ReadyLayer</h1>
          <p className="text-lg text-muted-foreground">
            Sign in to continue
          </p>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Authenticate with GitHub to access ReadyLayer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <motion.div
                variants={slideUp}
                initial="hidden"
                animate="visible"
              >
                <ErrorState
                  message={error}
                  className="py-4"
                />
              </motion.div>
            )}
            <Button
              onClick={handleGitHubSignIn}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  <Github className="mr-2 h-5 w-5" />
                  Sign in with GitHub
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <Container size="sm" className="min-h-screen flex items-center justify-center">
        <LoadingState message="Loading..." />
      </Container>
    }>
      <SignInContent />
    </Suspense>
  )
}
