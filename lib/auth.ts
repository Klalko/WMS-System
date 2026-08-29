import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import type { UserRole } from '@/types'

/**
 * Returns the authenticated user's profile, or null if not authenticated.
 */
export async function getAuthUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  })

  return profile
}

/**
 * Asserts the current user has at least the required role.
 * Returns the profile, or throws a Response with 401/403.
 */
export async function requireRole(role: UserRole) {
  const profile = await getAuthUser()

  if (!profile) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const hierarchy: Record<UserRole, number> = {
    WORKER: 1,
    ADMIN: 2,
  }

  if (hierarchy[profile.role as UserRole] < hierarchy[role]) {
    throw new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return profile
}
