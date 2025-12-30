'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

function SignInPageContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkSession() {
      try {
        // Check if Supabase env vars are available
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          return // Skip during build
        }
        
        const supabase = createSupabaseClient()
        if (!supabase) return
        
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          router.push(callbackUrl)
        }
      } catch (err) {
        // During build, env vars may not be set - ignore
        console.debug('Supabase client not available during build')
      }
    }
    checkSession()
  }, [callbackUrl, router])

  async function handleSignIn() {
    try {
      setLoading(true)
      setError(null)
      
      // Check if Supabase env vars are available
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setError('Authentication not configured. Please set Supabase environment variables.')
        return
      }
      
      const supabase = createSupabaseClient()
      if (!supabase) {
        setError('Failed to initialize authentication client.')
        return
      }
      
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        },
      })

      if (signInError) {
        setError(signInError.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-md w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Sign In</h1>
        <div className="bg-white p-8 rounded-lg shadow-lg">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full bg-gray-900 text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in with GitHub'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    }>
      <SignInPageContent />
    </Suspense>
  )
}
