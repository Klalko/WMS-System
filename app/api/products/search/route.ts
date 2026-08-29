import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const profile = await requireRole('WORKER')
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''

    if (q.length < 2) {
      return NextResponse.json({ data: [] })
    }

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
        ]
      },
      take: 10,
      orderBy: { name: 'asc' },
    })

    const isWorker = profile.role === 'WORKER'
    const sanitizedProducts = products.map(p => {
      if (isWorker) {
        const { costPrice, sellingPrice, ...rest } = p
        return rest
      }
      return p
    })

    return NextResponse.json({ data: sanitizedProducts })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
