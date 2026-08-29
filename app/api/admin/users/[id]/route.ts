import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminProfile = await requireRole('ADMIN')
    const { id } = await params
    
    if (adminProfile.id === id) {
      return NextResponse.json({ error: 'You cannot delete yourself' }, { status: 400 })
    }

    const targetProfile = await prisma.profile.findUnique({ where: { id } })
    if (!targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Initialize Supabase Admin Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseServiceKey) {
      // If no service key, we just delete the profile. (Auth user remains but profile is gone)
      await prisma.profile.delete({ where: { id } })
    } else {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
      if (error) {
        throw new Error(error.message)
      }
      // Trigger handles deleting profile, or if not we do it manually:
      await prisma.profile.delete({ where: { id } }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal server error' }, { status: 500 })
  }
}
