import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { NextRequest } from 'next/server'

/**
 * Get the authenticated user ID from the server session
 */
export async function getAuthenticatedUserId(_request?: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions)
  return session?.user?.id || null
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
