import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

export const metadata: Metadata = { title: 'Admin Panel' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (profile?.role !== 'ADMIN') redirect('/dashboard')

  const users = await prisma.profile.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">Manage user accounts and roles</p>
      </div>
      <AdminClient users={JSON.parse(JSON.stringify(users))} currentUserId={user.id} />
    </div>
  )
}
