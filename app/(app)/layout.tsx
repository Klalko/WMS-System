import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/layout/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  let profile = await prisma.profile.findUnique({ where: { id: user.id } })

  if (!profile) {
    redirect('/auth/login')
  }

  // Check for pending invite
  if (user.email) {
    const invites: any[] = await prisma.$queryRaw`SELECT * FROM invited_users WHERE email = ${user.email}`
    const invite = invites[0]
    if (invite) {
      profile = await prisma.profile.update({
        where: { id: user.id },
        data: { role: invite.role }
      })
      await prisma.$executeRaw`DELETE FROM invited_users WHERE email = ${user.email}`
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] overflow-hidden">
      <Sidebar role={profile.role as 'WORKER' | 'ADMIN'} fullName={profile.fullName} />
      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto overflow-x-hidden relative order-first md:order-none">
        <div className="w-full max-w-full pb-8">
          {children}
        </div>
      </main>
    </div>
  )
}
