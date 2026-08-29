'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function InventoryPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [partners, setPartners] = useState<{id: string, name: string}[]>([])
  const [partnerId, setPartnerId] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/contacts?type=partner').then(res => res.json()).then(json => setPartners(json.data || []))
  }, [])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true)
      const params = new URLSearchParams()
      if (debouncedSearch) params.append('q', debouncedSearch)
      if (partnerId) params.append('contactId', partnerId)
      params.append('page', page.toString())

      const res = await fetch(`/api/products?${params.toString()}`)
      const json = await res.json()
      setData(json)
      setLoading(false)
    }
    fetchProducts()
  }, [debouncedSearch, partnerId, page])

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage your product catalog and stock levels</p>
        </div>
        <Link href="/inventory/new" className="btn btn-primary">
          + Add Product
        </Link>
      </div>

      <div className="glass-card flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-stroke-neutral bg-white/5 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by name or SKU..."
            className="input flex-1 max-w-md"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
          <select 
            className="input w-full sm:w-48"
            value={partnerId}
            onChange={(e) => {
              setPartnerId(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Partners</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-auto flex flex-col">
          {loading ? (
            <div className="p-8 text-center text-muted">Loading products...</div>
          ) : data?.data?.length === 0 ? (
            <div className="p-8 text-center text-muted">No products found.</div>
          ) : (
            <>
              {/* Grid Layout (Mobile & Desktop) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 p-3 sm:p-4">
                {data.data.map((product: any) => (
                  <div
                    key={product.id}
                    onClick={() => router.push(`/inventory/${product.id}`)}
                    className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl overflow-hidden flex flex-col hover:border-[var(--color-primary)] active:scale-95 transition-all cursor-pointer relative"
                  >
                    <div className="aspect-square bg-white/5 relative border-b border-[var(--color-border)]">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted text-xs">No image</div>
                      )}
                      <div className="absolute top-1.5 right-1.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded shadow-md text-[10px] sm:text-xs font-bold ${
                          product.currentStock <= product.lowStockThreshold
                            ? 'bg-danger text-white'
                            : 'bg-success text-white'
                        }`}>
                          {product.currentStock} {product.unit}
                        </span>
                      </div>
                    </div>
                    <div className="p-2.5 sm:p-3 flex flex-col gap-0.5 sm:gap-1">
                      <p className="font-bold text-white text-xs sm:text-sm truncate leading-tight">{product.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted mono truncate">{product.sku}</p>
                      {product.description && <p className="text-[9px] sm:text-[10px] text-muted truncate mt-0.5">{product.description}</p>}
                      <p className="text-[10px] sm:text-xs text-primary font-medium mt-1">
                        {product.sellingPrice ? `$${Number(product.sellingPrice).toFixed(2)}` : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination Controls */}
              {data && data.total > data.pageSize && (
                <div className="mt-auto p-4 border-t border-stroke-neutral bg-white/5 flex items-center justify-between">
                  <p className="text-sm text-muted">
                    Showing {(data.page - 1) * data.pageSize + 1} to {Math.min(data.page * data.pageSize, data.total)} of {data.total} products
                  </p>
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-secondary py-1 px-3"
                      disabled={data.page <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <button 
                      className="btn btn-secondary py-1 px-3"
                      disabled={data.page * data.pageSize >= data.total}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
