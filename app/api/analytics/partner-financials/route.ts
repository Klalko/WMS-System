import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    await requireRole('WORKER')
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || 'monthly'

    let dateFilter = ''
    if (timeframe === 'daily') {
      dateFilter = `AND t.created_at >= CURRENT_DATE`
    } else if (timeframe === 'monthly') {
      dateFilter = `AND t.created_at >= DATE_TRUNC('month', CURRENT_DATE)`
    }

    const query = `
      SELECT 
        c.name as "partnerName",
        SUM(CASE WHEN t.type = 'inbound' THEN t.quantity * COALESCE(p.cost_price, 0) ELSE 0 END) as "totalCost",
        SUM(CASE WHEN t.type = 'outbound' THEN t.quantity * COALESCE(p.selling_price, 0) ELSE 0 END) as "totalEarnings"
      FROM transactions t
      JOIN products p ON t.product_id = p.id
      JOIN contacts c ON p.contact_id = c.id
      WHERE c.type = 'partner' ${dateFilter}
      GROUP BY c.id, c.name
      ORDER BY c.name ASC
    `

    const data = await prisma.$queryRawUnsafe<{partnerName: string, totalCost: number, totalEarnings: number}[]>(query)
    
    // Map BigInt/Decimal to string/number if necessary, but queryRaw un-typed returns values that might need casting
    const formattedData = data.map(row => ({
      partnerName: row.partnerName,
      totalCost: Number(row.totalCost) || 0,
      totalEarnings: Number(row.totalEarnings) || 0,
      profit: (Number(row.totalEarnings) || 0) - (Number(row.totalCost) || 0)
    }))

    return NextResponse.json({ data: formattedData })
  } catch (e) {
    if (e instanceof Response) return e
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
