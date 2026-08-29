import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import NewProductForm from './NewProductForm'

export default async function NewProductPage() {
  const partners = await prisma.contact.findMany({ where: { type: 'partner' }, orderBy: { name: 'asc' } })

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Loading...</div>}>
      <NewProductForm partners={partners} />
    </Suspense>
  )
}
