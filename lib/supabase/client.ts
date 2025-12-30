import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client for browser/client-side usage
 */
export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build, env vars may not be set - handle gracefully
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
      // Server-side (build time) - return null to prevent build errors
      return null as any
    }
    // Client-side - throw error for better UX
    throw new Error('Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Create a Supabase client instance (for server-side when needed)
 */
export function createSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
