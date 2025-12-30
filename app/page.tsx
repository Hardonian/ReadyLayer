'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4 text-center">ReadyLayer</h1>
        <p className="text-xl mb-8 text-center">
          AI Code Readiness Platform
        </p>
        <p className="text-lg mb-8 text-center text-gray-600">
          Ensure AI-generated code is production-ready through automated review, testing, and documentation. Enforcement-first principles catch security vulnerabilities, ensure test coverage, and keep docs in sync.
        </p>

        {loading && (
          <div className="text-center">Loading...</div>
        )}

        {!loading && !user && (
          <div className="text-center">
            <Link
              href="/auth/signin"
              className="inline-block bg-gray-900 text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Sign in with GitHub
            </Link>
          </div>
        )}

        {!loading && user && (
          <div className="space-y-4">
            <div className="text-center mb-8">
              <p className="text-lg">Welcome, {user.user_metadata?.full_name || user.email}!</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
                <h2 className="text-lg font-semibold mb-2">Review Guard</h2>
                <p className="mb-4">AI-aware code review with enforcement-first principles</p>
                <Link
                  href="/dashboard"
                  className="text-blue-600 hover:underline"
                >
                  View Dashboard →
                </Link>
              </div>
              <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
                <h2 className="text-lg font-semibold mb-2">Test Engine</h2>
                <p className="mb-4">Automatic test generation with coverage enforcement</p>
                <Link
                  href="/dashboard"
                  className="text-blue-600 hover:underline"
                >
                  View Dashboard →
                </Link>
              </div>
              <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
                <h2 className="text-lg font-semibold mb-2">Doc Sync</h2>
                <p className="mb-4">Keep API documentation in sync with code</p>
                <Link
                  href="/dashboard"
                  className="text-blue-600 hover:underline"
                >
                  View Dashboard →
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">🔍 AI Code Review</h3>
            <p className="text-sm text-gray-600">
              Automated code analysis detects security issues, quality problems, and suggests improvements.
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">👥 Human Verification</h3>
            <p className="text-sm text-gray-600">
              Engineers review and verify AI findings, ensuring accuracy and building team knowledge.
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">📚 Doc Sync</h3>
            <p className="text-sm text-gray-600">
              Automatic API documentation generation with drift prevention. Blocks PRs when code and docs are out of sync.
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">📊 Analytics</h3>
            <p className="text-sm text-gray-600">
              Track your code review performance, issues caught, and contributions to team quality.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
