import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

const roleSchema = z.object({
  role: z.enum(['WORKER', 'ADMIN']),
})

// PATCH /api/admin/users/[id]/role — update a user's role (super_admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireRole('ADMIN')
    const { id } = await params
    const body = await request.json()
    const parsed = roleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid role value' }, { status: 400 })
    }

    // Prevent self-demotion
    if (id === currentUser.id && parsed.data.role !== 'ADMIN') {
      return NextResponse.json({ error: 'You cannot demote yourself' }, { status: 403 })
    }

    const updated = await prisma.profile.update({
      where: { id },
      data: { role: parsed.data.role },
    })

    return NextResponse.json({ data: updated })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
