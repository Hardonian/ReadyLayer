import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirect = requestUrl.searchParams.get('redirect') || '/'

  const response = NextResponse.next()

  if (code) {
    const supabase = createSupabaseRouteHandlerClient(request, response)
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(redirect, request.url))
    }
  }

  // If there's an error or no code, redirect to sign in
  return NextResponse.redirect(new URL('/auth/signin?error=AuthError', request.url))
}
