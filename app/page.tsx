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
          Gamified Code Review Platform for AI-Generated Code
        </p>
        <p className="text-lg mb-8 text-center text-gray-600">
          Engineers verify AI code reviews on pull requests. Earn badges, streaks, and recognition for quality code reviews.
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
                <h2 className="text-lg font-semibold mb-2">Code Reviews</h2>
                <p className="mb-4">Review AI-generated code on pull requests</p>
                <Link
                  href="/prs"
                  className="text-blue-600 hover:underline"
                >
                  View PRs →
                </Link>
              </div>
              <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
                <h2 className="text-lg font-semibold mb-2">Gamification</h2>
                <p className="mb-4">Earn badges, streaks, and XP for quality reviews</p>
                <Link
                  href={`/users/${user.id}/profile`}
                  className="text-blue-600 hover:underline"
                >
                  View Profile →
                </Link>
              </div>
              <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
                <h2 className="text-lg font-semibold mb-2">Leaderboards</h2>
                <p className="mb-4">Compete with your team on code review quality</p>
                <Link
                  href="/leaderboards"
                  className="text-blue-600 hover:underline"
                >
                  View Leaderboards →
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
            <h3 className="text-lg font-semibold mb-2">🏆 Gamification</h3>
            <p className="text-sm text-gray-600">
              Earn badges, maintain streaks, and climb leaderboards for exceptional code review work.
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
