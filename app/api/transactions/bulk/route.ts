import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const bulkTransactionSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      type: z.enum(['inbound', 'outbound']),
      quantity: z.number().int().positive(),
      notes: z.string().optional(),
      supplierName: z.string().optional(),
      customerName: z.string().optional(),
    })
  ).min(1, 'Cart is empty'),
  globalReference: z.string().optional(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const json = await req.json()
    const { items, globalReference } = bulkTransactionSchema.parse(json)

    // Run atomically
    const result = await prisma.$transaction(async (tx: any) => {
      const createdTransactions = []

      for (const item of items) {
        // Find product
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        })

        if (!product) {
          throw new Error(`Product not found (ID: ${item.productId})`)
        }

        // Calculate new stock
        let newStock = product.currentStock
        if (item.type === 'inbound') {
          newStock += item.quantity
        } else if (item.type === 'outbound') {
          if (product.currentStock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}. Have ${product.currentStock}, need ${item.quantity}.`)
          }
          newStock -= item.quantity
        }

        // Update product stock
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: newStock },
        })

        const unitPrice = item.type === 'inbound' ? product.costPrice : product.sellingPrice

        // Create transaction log
        const newTransaction = await tx.transaction.create({
          data: {
            productId: item.productId,
            userId: user.id,
            type: item.type,
            quantity: item.quantity,
            notes: item.notes,
            supplierName: item.type === 'inbound' ? (globalReference || item.supplierName) : item.supplierName,
            customerName: item.type === 'outbound' ? (globalReference || item.customerName) : item.customerName,
            unitPrice,
          },
        })

        createdTransactions.push(newTransaction)
      }

      return createdTransactions
    })

    return NextResponse.json(result)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as any).errors[0].message }, { status: 400 })
    }
    return NextResponse.json(
      { error: error.message || 'Bulk transaction failed' },
      { status: 500 }
    )
  }
}
