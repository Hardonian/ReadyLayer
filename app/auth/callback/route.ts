import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/observability/logging'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const redirect = requestUrl.searchParams.get('redirect') || '/'

    const response = NextResponse.next()

    if (code) {
      try {
        const supabase = createSupabaseRouteHandlerClient(request, response)
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
          return NextResponse.redirect(new URL(redirect, request.url))
        }

        logger.warn(error, 'Failed to exchange code for session', {
          code: code.substring(0, 10) + '...',
        })
      } catch (error) {
        logger.error(error, 'Error during auth callback');
      }
    }

    // If there's an error or no code, redirect to sign in
    return NextResponse.redirect(new URL('/auth/signin?error=AuthError', request.url))
  } catch (error) {
    logger.error(error, 'Auth callback route failed');
    return NextResponse.redirect(new URL('/auth/signin?error=AuthError', request.url))
  }
}
