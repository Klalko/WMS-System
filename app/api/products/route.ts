import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

const createSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  unit: z.string().default('pcs'),
  currentStock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(10),
  costPrice: z.number().optional(),
  sellingPrice: z.number().optional(),
  imageUrl: z.string().optional(),
  contactId: z.string().uuid().optional(),
})

// GET /api/products — list all (paginated)
export async function GET(request: Request) {
  try {
    const profile = await requireRole('WORKER')
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') ?? ''
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const pageSize = 20

    const contactId = searchParams.get('contactId')

    const where: any = q
      ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { sku: { contains: q, mode: 'insensitive' as const } }] }
      : {}
      
    if (contactId) {
      where.contactId = contactId
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.product.count({ where }),
    ])

    const isWorker = profile.role === 'WORKER'
    const sanitizedProducts = products.map(p => {
      if (isWorker) {
        const { costPrice, sellingPrice, ...rest } = p
        return rest
      }
      return p
    })

    return NextResponse.json({ data: sanitizedProducts, total, page, pageSize })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/products — create (super_admin only)
export async function POST(request: Request) {
  try {
    const profile = await requireRole('ADMIN')
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }


    const { currentStock, ...productData } = parsed.data
    let product;

    if (currentStock > 0) {
      product = await prisma.$transaction(async (tx) => {
        const p = await tx.product.create({ data: { ...productData, currentStock } })
        await tx.transaction.create({
          data: {
            productId: p.id,
            userId: profile.id,
            type: 'inbound',
            quantity: currentStock,
            notes: 'Initial stock registration',
            unitPrice: p.costPrice
          }
        })
        return p
      })
    } else {
      product = await prisma.product.create({ data: parsed.data })
    }
    return NextResponse.json({ data: product }, { status: 201 })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
