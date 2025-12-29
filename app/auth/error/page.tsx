'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You do not have permission to sign in.',
    Verification: 'The verification token has expired or has already been used.',
    Default: 'An error occurred during authentication.',
  }

  const message = errorMessages[error || ''] || errorMessages.Default

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-md w-full">
        <h1 className="text-4xl font-bold mb-4 text-center">Authentication Error</h1>
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <p className="text-red-600 mb-4">{message}</p>
          <Link
            href="/auth/signin"
            className="block w-full bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors text-center"
          >
            Try Again
          </Link>
        </div>
      </div>
    </div>
  )
}
