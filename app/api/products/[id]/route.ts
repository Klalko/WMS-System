import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('ADMIN')
    const { id } = await params

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { z } from 'zod'

const updateSchema = z.object({
  sku: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  costPrice: z.number().nullable().optional(),
  sellingPrice: z.number().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
})

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('ADMIN')
    const { id } = await params
    const body = await request.json()
    
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    // If SKU is being updated, check uniqueness
    if (parsed.data.sku) {
      const existing = await prisma.product.findFirst({ where: { sku: parsed.data.sku } })
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'A product with this SKU already exists' }, { status: 409 })
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: parsed.data
    })

    return NextResponse.json({ data: product })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
