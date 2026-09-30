import { createBrowserClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Whether real Supabase credentials are configured in this environment.
 * When false, auth flows must degrade gracefully instead of redirecting
 * the browser to placeholder endpoints.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

/**
 * Supabase client for browser/client-side usage
 */
export function createSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build, env vars might not be available
  if (!url || !key) {
    // Return a mock client that won't crash during build
    return createBrowserClient(
      url || 'https://placeholder.supabase.co',
      key || 'placeholder-key'
    ) as SupabaseClient
  }

  return createBrowserClient(url, key) as SupabaseClient
}

/**
 * Create a Supabase client instance (for server-side when needed)
 */
export function createSupabaseServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    // Return mock client during build
    return createClient(
      url || 'https://placeholder.supabase.co',
      key || 'placeholder-key'
    ) as SupabaseClient;
  }
  
  return createClient(url, key) as SupabaseClient;
}
