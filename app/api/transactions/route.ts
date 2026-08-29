import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

const transactionSchema = z.object({
  productId: z.string().uuid(),
  type: z.enum(['inbound', 'outbound']),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
})

// POST /api/transactions — record a new stock movement
export async function POST(request: Request) {
  try {
    const profile = await requireRole('WORKER')
    const body = await request.json()
    const parsed = transactionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { productId, type, quantity, notes } = parsed.data

    // Verify product exists
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Guard against negative stock
    if (type === 'outbound' && product.currentStock < quantity) {
      return NextResponse.json({
        error: `Insufficient stock. Available: ${product.currentStock} ${product.unit}`
      }, { status: 422 })
    }

    // Atomic: create transaction + update stock in a single Prisma transaction
    const unitPrice = type === 'inbound' ? product.costPrice : product.sellingPrice

    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: { productId, userId: profile.id, type, quantity, notes, unitPrice },
      }),
      prisma.product.update({
        where: { id: productId },
        data: {
          currentStock: {
            [type === 'inbound' ? 'increment' : 'decrement']: quantity,
          },
        },
      }),
    ])

    return NextResponse.json({ data: transaction }, { status: 201 })
  } catch (e) {
    if (e instanceof Response) return e
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/transactions — list (with optional type filter)
export async function GET(request: Request) {
  try {
    await requireRole('WORKER')
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const timeframe = searchParams.get('timeframe')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const pageSize = 25

    const where: any = {}
    if (type === 'inbound' || type === 'outbound') where.type = type

    if (timeframe === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      where.createdAt = { gte: today }
    } else if (timeframe === '7days') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      where.createdAt = { gte: d }
    } else if (timeframe === 'month') {
      const d = new Date()
      d.setDate(1)
      d.setHours(0, 0, 0, 0)
      where.createdAt = { gte: d }
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { product: true, user: true },
      }),
      prisma.transaction.count({ where }),
    ])

    return NextResponse.json({ data: transactions, total, page, pageSize })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
