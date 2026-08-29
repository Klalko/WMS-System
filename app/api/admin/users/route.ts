import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    await requireRole('ADMIN')
    const { email, role, password, fullName } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Save invitation to DB
    await prisma.$executeRaw`
      INSERT INTO invited_users (email, password, role)
      VALUES (${email}, ${password}, CAST(${role || 'WORKER'} AS "Role"))
      ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, password = EXCLUDED.password;
    `

    return NextResponse.json({ data: { email, role, fullName } })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
