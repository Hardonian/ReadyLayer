import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/observability/logging'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.next()
    const supabase = createSupabaseRouteHandlerClient(request, response)
    
    try {
      await supabase.auth.signOut()
    } catch (error) {
      logger.warn(error, 'Error during sign out, redirecting anyway');
    }
    
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  } catch (error) {
    logger.error(error, 'Sign out route failed');
    // Still redirect even on error
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }
}
