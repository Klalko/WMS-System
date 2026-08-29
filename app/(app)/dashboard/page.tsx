import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage(props: { searchParams: Promise<{ contactId?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const searchParams = await props.searchParams
  const contactId = searchParams.contactId || undefined
  const productFilter = contactId ? { contactId } : {}
  const transactionFilter = contactId ? { product: { contactId } } : {}

  const [
    totalProducts,
    inboundAgg,
    outboundAgg,
    recentTransactions,
    stockData,
    brands,
  ] = await Promise.all([
    prisma.product.count({ where: productFilter }),
    prisma.transaction.aggregate({ where: { type: 'inbound', ...transactionFilter }, _sum: { quantity: true } }),
    prisma.transaction.aggregate({ where: { type: 'outbound', ...transactionFilter }, _sum: { quantity: true } }),
    prisma.transaction.findMany({
      where: transactionFilter,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { product: true, user: true },
    }),
    prisma.product.findMany({
      where: productFilter,
      orderBy: { currentStock: 'desc' },
      take: 10,
      select: { name: true, currentStock: true },
    }),
    prisma.contact.findMany({ where: { type: 'partner' }, orderBy: { name: 'asc' } }),
  ])

  // Need separate raw query for filtered tx by day, or Prisma group by
  const txByDay = contactId 
    ? await prisma.$queryRaw<{ date: string; type: string; total: bigint }[]>`
        SELECT 
          TO_CHAR(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
          t.type,
          SUM(t.quantity)::int as total
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        WHERE t.created_at >= NOW() - INTERVAL '7 days' AND p.contact_id = ${contactId}::uuid
        GROUP BY date, t.type
        ORDER BY date ASC
      `
    : await prisma.$queryRaw<{ date: string; type: string; total: bigint }[]>`
        SELECT 
          TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
          type,
          SUM(quantity)::int as total
        FROM transactions
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY date, type
        ORDER BY date ASC
      `


  // Get specific low stock products
  const lowStockProductsQuery = contactId
    ? Prisma.sql`SELECT id, name, sku, current_stock as "currentStock", low_stock_threshold as "lowStockThreshold" FROM products WHERE current_stock <= low_stock_threshold AND contact_id = ${contactId}::uuid`
    : Prisma.sql`SELECT id, name, sku, current_stock as "currentStock", low_stock_threshold as "lowStockThreshold" FROM products WHERE current_stock <= low_stock_threshold`
  
  const lowStockProducts = await prisma.$queryRaw<{id: string, name: string, sku: string, currentStock: number, lowStockThreshold: number}[]>(lowStockProductsQuery)


  // Build 7-day chart data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })

  const transactionsByDay = last7Days.map((date) => {
    const inRow = txByDay.find((r) => r.date === date && r.type === 'inbound')
    const outRow = txByDay.find((r) => r.date === date && r.type === 'outbound')
    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      inbound: inRow ? Number(inRow.total) : 0,
      outbound: outRow ? Number(outRow.total) : 0,
    }
  })

  const stats = {
    totalProducts,
    lowStockCount: lowStockProducts.length,
    totalInbound: inboundAgg._sum.quantity ?? 0,
    totalOutbound: outboundAgg._sum.quantity ?? 0,
  }

  return (
    <DashboardClient
      stats={stats}
      lowStockProducts={lowStockProducts}
      recentTransactions={JSON.parse(JSON.stringify(recentTransactions))}
      stockByProduct={stockData.map((p) => ({ name: p.name, stock: p.currentStock }))}
      transactionsByDay={transactionsByDay}
      partners={brands}
      selectedPartnerId={contactId || ''}
    />
  )
}
