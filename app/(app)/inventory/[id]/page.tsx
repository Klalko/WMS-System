import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import TransactionHistoryTable from './TransactionHistoryTable'
import DeleteProductButton from './DeleteProductButton'

export const metadata: Metadata = { title: 'Product Detail' }

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { id } = await params
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })

  const [product, transactions] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.transaction.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: true },
    }),
  ])

  if (!product) notFound()

  const isLow = product.currentStock <= product.lowStockThreshold
  const isOut = product.currentStock === 0

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/inventory" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Inventory
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            {product.imageUrl && (
              <img src={product.imageUrl} alt={product.name} className="w-40 h-40 sm:w-64 sm:h-64 rounded-xl object-cover border border-stroke-neutral bg-white/5 shrink-0 shadow-lg" />
            )}
            <div>
              <h1 className="page-title leading-tight">{product.name}</h1>
              <p className="mono text-muted mt-1">{product.sku}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0 flex-wrap">
            {isOut ? (
              <span className="badge badge-danger">Out of stock</span>
            ) : isLow ? (
              <span className="badge badge-warning">Low stock</span>
            ) : (
              <span className="badge badge-success">In stock</span>
            )}
            {profile?.role === 'ADMIN' && (
              <>
                <Link href={`/inventory/${id}/edit`} className="btn btn-secondary btn-sm">Edit</Link>
                <DeleteProductButton productId={product.id} productName={product.name} />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="glass-card p-4 sm:p-5 text-center">
          <p className={`text-2xl sm:text-3xl font-bold ${isOut ? 'text-danger' : isLow ? 'text-warning' : 'text-success'}`}>
            {product.currentStock}
          </p>
          <p className="text-[10px] sm:text-xs text-muted mt-1 leading-tight">Current Stock ({product.unit})</p>
        </div>
        <div className="glass-card p-4 sm:p-5 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-white">{product.lowStockThreshold}</p>
          <p className="text-[10px] sm:text-xs text-muted mt-1 leading-tight">Low Stock Alert</p>
        </div>
        <div className="glass-card p-4 sm:p-5 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-white">
            {product.costPrice ? `$${Number(product.costPrice).toFixed(2)}` : '-'}
          </p>
          <p className="text-[10px] sm:text-xs text-muted mt-1 leading-tight">Cost Price</p>
        </div>
        <div className="glass-card p-4 sm:p-5 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-primary">
            {product.sellingPrice ? `$${Number(product.sellingPrice).toFixed(2)}` : '-'}
          </p>
          <p className="text-[10px] sm:text-xs text-muted mt-1 leading-tight">Selling Price</p>
        </div>
      </div>

      {product.description && (
        <div className="glass-card p-5 mb-8">
          <p className="text-xs text-muted mb-1">Description</p>
          <p className="text-white">{product.description}</p>
        </div>
      )}

      <div className="flex gap-3 mb-8">
        <Link href={`/scan?sku=${product.sku}&action=inbound`} className="btn btn-success">
          ↓ Receive Stock
        </Link>
        <Link href={`/scan?sku=${product.sku}&action=outbound`} className="btn btn-danger">
          ↑ Dispatch Stock
        </Link>
      </div>

      <div className="glass-card">
        <div className="p-6 pb-0">
          <h2 className="font-semibold text-white">Transaction History</h2>
          <p className="text-xs text-muted mt-0.5">Last 50 movements for this product</p>
        </div>
        <TransactionHistoryTable transactions={JSON.parse(JSON.stringify(transactions))} />
      </div>
    </div>
  )
}
