'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if env vars are available (not during build)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !key) {
      setLoading(false)
      return
    }

    const supabase = createSupabaseClient()

    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        // Silently fail during build
        console.error('Failed to get user:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })

      return () => subscription.unsubscribe()
    } catch (error) {
      // Silently fail during build
      console.error('Failed to set up auth state change:', error)
    }
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4 text-center">ReadyLayer</h1>
        <p className="text-xl mb-4 text-center font-semibold">
          Verifiable Assurance for AI-Generated Code
        </p>
        <p className="text-lg mb-8 text-center text-gray-600">
          Integrates seamlessly with your existing tools and workflows. Adds verification layers that catch AI common errors—context slips, drift, security risks—before they reach production. Trust built through transparency at every step.
        </p>

        {/* Trust Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-green-800">Verifiable Assurance Every Step of the Way</span>
          </div>
        </div>

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
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-lg font-semibold">Review Guard</h2>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">Verified</span>
                </div>
                <p className="mb-4 text-sm text-gray-600">
                  AI-aware checks catch context slips, drift, and security risks. Works with GitHub, GitLab, and your existing CI/CD.
                </p>
                <Link
                  href="/dashboard"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View Dashboard →
                </Link>
              </div>
              <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-lg font-semibold">Test Engine</h2>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">Verified</span>
                </div>
                <p className="mb-4 text-sm text-gray-600">
                  Automatic test generation with coverage enforcement. Integrates with Jest, pytest, and your test framework.
                </p>
                <Link
                  href="/dashboard"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View Dashboard →
                </Link>
              </div>
              <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-lg font-semibold">Doc Sync</h2>
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">Verified</span>
                </div>
                <p className="mb-4 text-sm text-gray-600">
                  Keeps API docs in sync with code changes. Prevents drift and flags outdated documentation.
                </p>
                <Link
                  href="/dashboard"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View Dashboard →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Integration Section */}
        <div className="mt-12 mb-8">
          <h2 className="text-2xl font-bold text-center mb-4">Works With Your Existing Tools</h2>
          <p className="text-center text-gray-600 mb-6">
            ReadyLayer integrates seamlessly—no workflow disruption. Adds verification layers to your current setup.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 border rounded-lg">
              <div className="font-semibold mb-1">Git Providers</div>
              <div className="text-sm text-gray-600">GitHub, GitLab, Bitbucket</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="font-semibold mb-1">CI/CD</div>
              <div className="text-sm text-gray-600">GitHub Actions, GitLab CI, CircleCI</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="font-semibold mb-1">IDEs</div>
              <div className="text-sm text-gray-600">VS Code, JetBrains</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="font-semibold mb-1">Test Frameworks</div>
              <div className="text-sm text-gray-600">Jest, pytest, Mocha</div>
            </div>
          </div>
        </div>

        {/* Verification Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border rounded-lg bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="text-lg font-semibold">AI Error Detection</h3>
            </div>
            <p className="text-sm text-gray-700">
              Specialized checks catch AI common errors: context slips, code drift, hallucinated dependencies, and security vulnerabilities. Each check is verified and transparent.
            </p>
          </div>
          <div className="p-6 border rounded-lg bg-green-50">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-semibold">Threat Detection & Analytics</h3>
            </div>
            <p className="text-sm text-gray-700">
              Security analysis, threat detection, and code quality metrics inform each other. Compound insights build confidence in every code submission.
            </p>
          </div>
          <div className="p-6 border rounded-lg bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-lg font-semibold">Verifiable Assurance</h3>
            </div>
            <p className="text-sm text-gray-700">
              Every check is traceable. See exactly what was verified, when, and why. Build trust through transparency at every step of your workflow.
            </p>
          </div>
          <div className="p-6 border rounded-lg bg-orange-50">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <h3 className="text-lg font-semibold">No Workflow Disruption</h3>
            </div>
            <p className="text-sm text-gray-700">
              Adds verification layers without replacing your tools. Works alongside GitHub, your CI/CD, and existing review processes. Double-checks, not replacements.
            </p>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-center">Built for Trust</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-semibold text-gray-900 mb-1">Transparent Checks</div>
              <div className="text-sm text-gray-600">Every verification is visible and traceable</div>
            </div>
            <div>
              <div className="font-semibold text-gray-900 mb-1">Compound Insights</div>
              <div className="text-sm text-gray-600">Analytics inform threat detection and vice versa</div>
            </div>
            <div>
              <div className="font-semibold text-gray-900 mb-1">Portable Integration</div>
              <div className="text-sm text-gray-600">Works with all major dev platforms and tools</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
