'use client'

import { useEffect, useState, Suspense } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface User {
  id: string
  email?: string
  name?: string
}

function HomePageContent() {
  const [user, setUser] = useState<User | null>(null)
  
  useEffect(() => {
    async function checkUser() {
      try {
        // Check if Supabase env vars are available
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          return // Skip during build
        }
        
        const supabase = createSupabaseClient()
        if (!supabase) return
        
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || undefined,
            name: session.user.user_metadata?.name || undefined,
          })
        }
      } catch (error) {
        // During build, env vars may not be set - ignore
        console.debug('Supabase client not available during build')
      }
    }
    checkUser()
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 text-gray-900">
            AI Code Readiness Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Ensure your code is production-ready with AI-powered reviews, automated testing, and comprehensive documentation.
          </p>
          <div className="flex gap-4 justify-center">
            {user ? (
              <Link
                href="/dashboard"
                className="bg-gray-900 text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="bg-gray-900 text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Get Started
                </Link>
                <Link
                  href="/auth/signin"
                  className="bg-gray-100 text-gray-900 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Everything you need for production-ready code
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">AI Code Reviews</h3>
              <p className="text-gray-600">
                Automated code reviews with AI-powered analysis of security, performance, and best practices.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">Automated Testing</h3>
              <p className="text-gray-600">
                Comprehensive test generation and execution to ensure code quality and reliability.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">Documentation Sync</h3>
              <p className="text-gray-600">
                Keep your documentation in sync with your codebase automatically.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">ReadyLayer</h1>
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}
