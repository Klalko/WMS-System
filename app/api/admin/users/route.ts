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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Requires Service Role Key to use admin API
    )

    // Actually create the user in Supabase Auth!
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm so they don't need real emails
      user_metadata: {
        full_name: fullName,
        role: role || 'WORKER',
      }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Also save invitation to DB just as backup/reference
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
