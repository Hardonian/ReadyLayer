'use client'

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
          <div className="z-10 max-w-2xl w-full">
            <h1 className="text-4xl font-bold mb-4">Application Error</h1>
            <p className="text-lg mb-8 text-gray-600">
              A critical error occurred. Please refresh the page or contact support.
            </p>
            <button
              onClick={reset}
              className="bg-gray-900 text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
