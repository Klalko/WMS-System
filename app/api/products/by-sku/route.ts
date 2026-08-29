import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

// GET /api/products/by-sku?sku=<value>
export async function GET(request: Request) {
  try {
    const profile = await requireRole('WORKER')
    const { searchParams } = new URL(request.url)
    const sku = searchParams.get('sku')

    if (!sku) {
      return NextResponse.json({ error: 'sku query param is required' }, { status: 400 })
    }

    const products = await prisma.product.findMany({ where: { sku } })
    if (products.length === 0) {
      return NextResponse.json({ error: `No products found with SKU: ${sku}` }, { status: 404 })
    }

    const isWorker = profile.role === 'WORKER'
    const sanitizedProducts = products.map((p: any) => {
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
