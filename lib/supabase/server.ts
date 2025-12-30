import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Create Supabase server client for API routes and Server Components
 */
export async function createSupabaseServerClient(_request?: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build, env vars might not be available
  if (!url || !key) {
    // Return a mock client that won't crash during build
    const cookieStore = await cookies()
    return createServerClient(
      url || 'https://placeholder.supabase.co',
      key || 'placeholder-key',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // No-op during build
          },
        },
      }
    )
  }

  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

/**
 * Create Supabase server client for route handlers (with response)
 */
export function createSupabaseRouteHandlerClient(
  request: NextRequest,
  response: NextResponse
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build, env vars might not be available
  if (!url || !key) {
    // Return a mock client that won't crash during build
    return createServerClient(
      url || 'https://placeholder.supabase.co',
      key || 'placeholder-key',
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // No-op during build
          },
        },
      }
    )
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })
}

/**
 * Get authenticated user from Supabase session
 */
export async function getSupabaseUser(_request?: NextRequest) {
  const supabase = await createSupabaseServerClient(_request)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * Get authenticated user ID from Supabase session
 */
export async function getSupabaseUserId(_request?: NextRequest): Promise<string | null> {
  const user = await getSupabaseUser(_request)
  return user?.id || null
}
