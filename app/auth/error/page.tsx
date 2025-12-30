'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ErrorPageContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-4">Authentication Error</h1>
        <p className="text-lg mb-8 text-gray-600">
          {error === 'Configuration'
            ? 'There is a problem with the server configuration.'
            : error === 'AccessDenied'
            ? 'You do not have permission to sign in.'
            : error === 'Verification'
            ? 'The verification token has expired or has already been used.'
            : 'An error occurred during authentication.'}
        </p>
        <div className="flex gap-4">
          <Link
            href="/auth/signin"
            className="bg-gray-900 text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Try again
          </Link>
          <Link
            href="/"
            className="bg-gray-100 text-gray-900 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    }>
      <ErrorPageContent />
    </Suspense>
  )
}
