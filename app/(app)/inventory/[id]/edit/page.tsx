import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import EditProductClient from './EditProductClient'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (profile?.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl text-danger font-semibold">Forbidden</h1>
        <p className="text-muted mt-2">Only Super Admins can edit products.</p>
      </div>
    )
  }

  const { id } = await params

  const [product, partners] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.contact.findMany({ where: { type: 'partner' }, orderBy: { name: 'asc' } })
  ])

  if (!product) notFound()

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Loading...</div>}>
      <EditProductClient product={product} partners={partners} />
    </Suspense>
  )
}
