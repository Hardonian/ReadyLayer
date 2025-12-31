/**
 * Edge-Safe Authentication
 * 
 * Authentication helpers for Edge runtime (middleware)
 * Uses only Supabase SSR - no Prisma, no Node crypto
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export interface EdgeAuthUser {
  id: string;
  email?: string;
}

/**
 * Get authenticated user from Supabase session (Edge-safe)
 * Returns null if not authenticated or on error
 */
export async function getEdgeAuthUser(
  request: NextRequest,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<EdgeAuthUser | null> {
  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          try {
            return request.cookies.getAll();
          } catch {
            return [];
          }
        },
        setAll() {
          // No-op for middleware - cookies handled by response
        },
      },
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  } catch {
    // Fail silently - return null on any error
    return null;
  }
}

/**
 * Extract API key from Authorization header (Edge-safe)
 * Returns null if not present or invalid format
 */
export function extractApiKeyFromHeader(request: NextRequest): string | null {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  } catch {
    return null;
  }
}
