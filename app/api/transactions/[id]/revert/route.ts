import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

// POST /api/transactions/[id]/revert
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await requireRole('WORKER')
    const { id } = await params

    const originalTx = await prisma.transaction.findUnique({ where: { id } })
    if (!originalTx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Check if it's already a revert transaction to prevent infinite reverts
    if (originalTx.notes?.startsWith('REVERT:')) {
      return NextResponse.json({ error: 'Cannot revert a revert transaction' }, { status: 400 })
    }

    // Compensating transaction logic
    const compensatingType = originalTx.type === 'inbound' ? 'outbound' : 'inbound'
    const stockChange = compensatingType === 'inbound' ? originalTx.quantity : -originalTx.quantity

    const reverted = await prisma.$transaction(async (tx: any) => {
      // 1. Create compensating transaction
      const newTx = await tx.transaction.create({
        data: {
          productId: originalTx.productId,
          userId: profile.id,
          type: compensatingType,
          quantity: originalTx.quantity,
          notes: `REVERT: Original TX ${originalTx.id}`,
          supplierName: originalTx.supplierName,
          customerName: originalTx.customerName,
          unitPrice: originalTx.unitPrice
        }
      })

      // 2. Update current stock
      await tx.product.update({
        where: { id: originalTx.productId },
        data: { currentStock: { increment: stockChange } }
      })

      return newTx
    })

    return NextResponse.json({ data: reverted })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
