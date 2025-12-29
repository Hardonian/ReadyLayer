import { getSupabaseUserId, getSupabaseUser } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * Get the authenticated user ID from Supabase session
 */
export async function getAuthenticatedUserId(request?: NextRequest): Promise<string | null> {
  return await getSupabaseUserId(request)
}

/**
 * Require authentication for a route handler
 * Throws error if not authenticated
 */
export async function requireAuth(request?: NextRequest): Promise<string> {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) {
    throw new Error('Unauthorized')
  }
  return userId
}

/**
 * Get the full authenticated user object
 */
export async function getAuthenticatedUser(request?: NextRequest) {
  return await getSupabaseUser(request)
}

/**
 * Verify that a user can access a resource
 */
export function canAccessResource(userId: string, resourceUserId: string): boolean {
  return userId === resourceUserId
}

/**
 * Check if user has permission to perform action
 */
export function hasPermission(userId: string, resourceUserId: string, _action: string): boolean {
  // Users can always access their own resources
  if (userId === resourceUserId) {
    return true
  }

  // Add role-based permissions here if needed
  // For now, users can only access their own resources
  return false
}
