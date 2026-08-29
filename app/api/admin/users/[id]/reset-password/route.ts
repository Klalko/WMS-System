import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    await requireRole('ADMIN')
    const { id } = await params
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'New password required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
