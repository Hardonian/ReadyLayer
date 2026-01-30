import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/observability/logging'

// Force dynamic rendering - this route uses request.url
export const dynamic = 'force-dynamic'

/**
 * Validates a redirect path to prevent open redirect vulnerabilities.
 * Only allows relative paths that start with `/` and do not contain protocol-relative URLs.
 */
function isValidRedirectPath(path: string): boolean {
  // Must start with `/` (relative path)
  if (!path.startsWith('/')) {
    return false
  }

  // Must not start with `//` (protocol-relative URL)
  if (path.startsWith('//')) {
    return false
  }

  // Must not contain common protocol prefixes (defense in depth)
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(path)) {
    return false
  }

  return true
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const redirectParam = requestUrl.searchParams.get('redirect') || '/'

    // Validate redirect path to prevent open redirect attacks
    const redirect = isValidRedirectPath(redirectParam) ? redirectParam : '/'

    const response = NextResponse.next()

    if (code) {
      try {
        const supabase = createSupabaseRouteHandlerClient(request, response)
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
          return NextResponse.redirect(new URL(redirect, request.url))
        }

        logger.warn('Failed to exchange code for session', {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          } : error,
          code: code.substring(0, 10) + '...',
        })
      } catch (error) {
        logger.error(error, 'Error during auth callback')
      }
    }

    // If there's an error or no code, redirect to sign in
    return NextResponse.redirect(new URL('/auth/signin?error=AuthError', request.url))
  } catch (error) {
    logger.error(error, 'Auth callback route failed')
    return NextResponse.redirect(new URL('/auth/signin?error=AuthError', request.url))
  }
}
