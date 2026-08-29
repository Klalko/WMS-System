import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TransactionsFilter from './TransactionsFilter'
import RevertButton from './RevertButton'

export const metadata: Metadata = { title: 'Transactions' }

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string; contactId?: string; timeframe?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { type, page, contactId, timeframe } = await searchParams
  const pageNum = Math.max(1, parseInt(page ?? '1'))
  const pageSize = 25

  const where: any = {}
  if (type === 'inbound' || type === 'outbound') where.type = type
  if (contactId) {
    where.product = { contactId }
  }

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

  const [transactions, total, partners] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      include: { product: true, user: true },
    }),
    prisma.transaction.count({ where }),
    prisma.contact.findMany({ where: { type: 'partner' }, orderBy: { name: 'asc' }, select: { id: true, name: true } })
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Transactions</h1>
        <p className="page-subtitle">{total.toLocaleString()} total movements</p>
      </div>

      {/* Filter tabs */}
      <TransactionsFilter 
        partners={partners} 
        currentType={type ?? ''} 
        currentPartner={contactId ?? ''}
        currentTimeframe={timeframe ?? 'all'} 
      />

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total Value</th>
              <th>By</th>
              <th>Notes</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={10} className="text-center text-muted py-12">No transactions found</td></tr>
            ) : (
              transactions.map((tx: any) => (
                <tr key={tx.id}>
                  <td>
                    <Link href={`/inventory/${tx.productId}`} className="font-medium text-white hover:text-primary transition-colors">
                      {tx.product?.name ?? '—'}
                    </Link>
                  </td>
                  <td><span className="mono text-xs text-muted">{tx.product?.sku}</span></td>
                  <td>
                    <span className={`badge ${tx.type === 'inbound' ? 'badge-success' : 'badge-danger'}`}>
                      {tx.type === 'inbound' ? '↓ Inbound' : '↑ Outbound'}
                    </span>
                  </td>
                  <td className="font-bold text-white">{tx.quantity}</td>
                  <td className="text-muted">
                    {tx.unitPrice ? `$${Number(tx.unitPrice).toFixed(2)}` : '—'}
                  </td>
                  <td className="font-medium text-white">
                    {tx.unitPrice ? `$${(Number(tx.unitPrice) * tx.quantity).toFixed(2)}` : '—'}
                  </td>
                  <td className="text-muted text-sm">{tx.user?.fullName ?? '—'}</td>
                  <td className="text-muted text-sm">{tx.notes ?? '—'}</td>
                  <td className="text-muted text-xs whitespace-nowrap">
                    {new Date(tx.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td>
                    <RevertButton txId={tx.id} isReverted={tx.notes?.startsWith('REVERT:') || false} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted">Page {pageNum} of {totalPages}</p>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Link href={`?type=${type ?? ''}&page=${pageNum - 1}`} className="btn btn-secondary btn-sm">← Prev</Link>
            )}
            {pageNum < totalPages && (
              <Link href={`?type=${type ?? ''}&page=${pageNum + 1}`} className="btn btn-secondary btn-sm">Next →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
