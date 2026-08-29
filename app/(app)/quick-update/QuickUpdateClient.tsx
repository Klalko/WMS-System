'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BarcodeScannerModal from '@/components/scanner/BarcodeScannerModal'


type ProductLite = {
  id: string
  sku: string
  name: string
  currentStock: number
  unit: string
  imageUrl: string | null
}

type CartItem = {
  cartId: string
  product: ProductLite
  type: 'inbound' | 'outbound'
  quantity: number
}

export default function QuickUpdateClient() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [scannerOpen, setScannerOpen] = useState(false)
  const [conflictProducts, setConflictProducts] = useState<ProductLite[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lastSubmittedData, setLastSubmittedData] = useState<{
    date: string,
    receiver: string,
    items: { name: string, sku: string, qty: number }[]
  } | null>(null)
  
  // Global settings
  const [globalReference, setGlobalReference] = useState('')
  const [defaultType, setDefaultType] = useState<'inbound'|'outbound'>('outbound')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProductLite[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`)
        if (res.ok) {
          const json = await res.json()
          setSearchResults(json.data)
          setShowDropdown(true)
        }
      } catch (e) {
        console.error("Search failed", e)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  const addProductToCart = (product: ProductLite) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id && item.type === defaultType)
      if (existing) {
        return prev.map(item => item.cartId === existing.cartId ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, {
        cartId: Math.random().toString(36).substring(7),
        product: product,
        type: defaultType,
        quantity: 1,
      }]
    })
    setSearchQuery('')
    setShowDropdown(false)
  }

  // Scanner handler calls the API by exact SKU
  const handleScan = async (sku: string) => {
    try {
      const res = await fetch(`/api/products/by-sku?sku=${encodeURIComponent(sku)}`)
      if (!res.ok) {
        alert(`SKU ${sku} not found!`)
        return
      }
      const json = await res.json()
      const products: ProductLite[] = json.data
      
      if (products.length === 1) {
        addProductToCart(products[0])
      } else if (products.length > 1) {
        setConflictProducts(products)
        setScannerOpen(false)
      }
    } catch (e) {
      console.error(e)
      alert(`Error scanning SKU ${sku}`)
    }
  }

  const updateCartItem = (cartId: string, updates: Partial<CartItem>) => {
    setCart(prev => prev.map(item => item.cartId === cartId ? { ...item, ...updates } : item))
  }

  const removeCartItem = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId))
  }

  const submitBulk = async () => {
    if (cart.length === 0) return
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          globalReference: globalReference || undefined,
          items: cart.map(i => ({
            productId: i.product.id,
            type: i.type,
            quantity: i.quantity
          })) 
        }),
      })
      
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit updates')
      
      setSuccess(`Successfully processed ${cart.length} updates!`)
      setLastSubmittedData({
        date: new Date().toLocaleDateString(),
        receiver: globalReference || 'N/A',
        items: cart.map(i => ({ name: i.product.name, sku: i.product.sku, qty: i.quantity }))
      })
      setCart([])
      setGlobalReference('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Success / Print Modal */}
      <AnimatePresence>
        {lastSubmittedData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:bg-white print:text-black">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto print:bg-white print:border-none print:shadow-none print:p-0"
            >
              <h3 className="text-xl font-bold text-white mb-4 print:hidden">Update Successful!</h3>
              
              <div id="print-slip" className="hidden print:block bg-white text-black p-8">
                <h2 className="text-2xl font-bold mb-4">Packing Slip</h2>
                <p><strong>Date:</strong> {lastSubmittedData.date}</p>
                <p><strong>Receiver / Supplier:</strong> {lastSubmittedData.receiver}</p>
                <table className="w-full mt-6 text-left border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-black">
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastSubmittedData.items.map((it, idx) => (
                       <tr key={idx} className="border-b border-gray-300">
                         <td className="py-2 px-3">{it.name}</td>
                         <td className="py-2 px-3">{it.sku}</td>
                         <td className="py-2 px-3 text-right">{it.qty}</td>
                       </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-16 pt-8 border-t border-black w-64">
                  <p className="text-center font-bold">Authorized Signature</p>
                </div>
              </div>
              
              <div className="flex gap-4 justify-end mt-6 print:hidden">
                <button onClick={() => setLastSubmittedData(null)} className="btn btn-secondary">Close</button>
                <button onClick={() => window.print()} className="btn btn-primary">Print Slip</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        title={`Scan Item`}
        description="Continuous scanning is enabled. Close when done."
      />

      {/* Conflict Modal */}
      <AnimatePresence>
        {conflictProducts && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
            >
              <h3 className="text-lg font-bold text-white mb-2">Multiple Products Found</h3>
              <p className="text-sm text-muted mb-4">Please select the correct item for this barcode:</p>
              
              <div className="space-y-3">
                {conflictProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      addProductToCart(p)
                      setConflictProducts(null)
                      setScannerOpen(true)
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-primary)] transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center overflow-hidden flex-shrink-0">
                       {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="object-cover w-full h-full" />
                        ) : (
                          <span className="text-[10px] font-medium text-muted">No Pic</span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate text-sm">{p.name}</p>
                      <p className="text-xs text-muted truncate">Stock: {p.currentStock}</p>
                    </div>
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => {
                  setConflictProducts(null)
                  setScannerOpen(true)
                }}
                className="btn btn-secondary w-full mt-4"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:col-span-2 space-y-6">
        
        {error && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/30 text-danger text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-green-950/30 border border-green-800/30 text-green-400 text-sm">
            {success}
          </div>
        )}

        {/* Global Configuration */}
        <div className="glass-card p-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm text-muted mb-1 block">Receiver / Supplier Name (Global)</label>
            <input 
              type="text" 
              className="input w-full" 
              placeholder="e.g. Acme Corp or John Doe" 
              value={globalReference}
              onChange={e => setGlobalReference(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="text-sm text-muted mb-1 block">Default Action</label>
            <select
              className="input w-full"
              value={defaultType}
              onChange={e => setDefaultType(e.target.value as any)}
            >
              <option value="outbound">Outbound (-)</option>
              <option value="inbound">Inbound (+)</option>
            </select>
          </div>
        </div>

        {/* Selection Tools */}
        <div className="glass-card p-6 border-b border-[var(--color-border)] flex flex-col sm:flex-row gap-4 items-start sm:items-center relative z-10">
          <div className="flex-1 w-full relative" ref={searchRef}>
            <div className="relative">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                className="input w-full pl-10"
                placeholder="Search by Name or SKU to add..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true) }}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute left-0 right-0 top-full mt-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden z-20 max-h-64 overflow-y-auto"
                >
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted">No products found.</div>
                  ) : (
                    searchResults.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addProductToCart(p)}
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-colors border-b border-[var(--color-border)] last:border-0"
                      >
                        <div className="w-10 h-10 rounded bg-[var(--color-surface)] flex items-center justify-center overflow-hidden flex-shrink-0">
                           {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="object-cover w-full h-full" />
                            ) : (
                              <span className="text-xs font-medium text-muted">No Pic</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate text-sm">{p.name}</p>
                          <p className="text-xs text-muted truncate">{p.sku}</p>
                        </div>
                        <div className="text-xs bg-[var(--color-surface)] px-2 py-1 rounded text-white whitespace-nowrap">
                          Stock: {p.currentStock}
                        </div>
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="text-muted font-medium text-sm">OR</div>
          <button 
            onClick={() => setScannerOpen(true)}
            className="btn btn-secondary w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
              <line x1="7" y1="12" x2="7.01" y2="12"/><line x1="12" y1="12" x2="17" y2="12"/>
            </svg>
            Camera Scan
          </button>
        </div>

        {/* Scratchpad UI */}
        <div className="glass-card">
          <div className="p-4 sm:p-6 border-b border-[var(--color-border)] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Scratchpad ({cart.length} items)</h2>
          </div>
          
          <div className="p-4 sm:p-6">
            {cart.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center mx-auto mb-4 text-muted">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </div>
                <p className="text-white font-medium mb-1">Your scratchpad is empty</p>
                <p className="text-sm text-muted">Use the search bar or scanner above to add items.</p>
              </div>
            ) : (
              <div className="space-y-4 relative z-0">
                <AnimatePresence>
                  {cart.map(item => {
                    const product = item.product
                    return (
                      <motion.div
                        key={item.cartId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-3 sm:p-4 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                      >
                        <div className="flex-1 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded object-cover border border-[var(--color-border)] shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[10px] text-muted shrink-0">No Pic</div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate text-sm sm:text-base">{product.name}</p>
                              <p className="text-[10px] sm:text-xs text-muted">SKU: {product.sku} • Stock: {product.currentStock}</p>
                            </div>
                          </div>
                          
                          {/* Mobile Delete Button (top right) */}
                          <button 
                            onClick={() => removeCartItem(item.cartId)}
                            className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-danger bg-white/5"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-end w-full sm:w-auto">
                          <div className="w-[120px] sm:w-auto">
                            <select 
                              className="input w-full py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm"
                              value={item.type}
                              onChange={(e) => updateCartItem(item.cartId, { type: e.target.value as any })}
                            >
                              <option value="inbound">Inbound (+)</option>
                              <option value="outbound">Outbound (-)</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1 sm:gap-2">
                            <button
                              onClick={() => updateCartItem(item.cartId, { quantity: Math.max(1, item.quantity - 1) })}
                              className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-white hover:bg-white/5 transition-colors"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateCartItem(item.cartId, { quantity: parseInt(e.target.value) || 1 })}
                              className="input w-12 sm:w-16 text-center py-1.5 px-1 sm:px-2 text-sm"
                            />
                            <button
                              onClick={() => updateCartItem(item.cartId, { quantity: item.quantity + 1 })}
                              className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-white hover:bg-white/5 transition-colors"
                            >
                              +
                            </button>
                          </div>

                          {/* Desktop Delete Button */}
                          <div className="hidden sm:flex justify-end">
                            <button 
                              onClick={() => removeCartItem(item.cartId)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-red-500/10 transition-colors"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="glass-card lg:sticky lg:top-24 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Summary</h3>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Total Unique Items</span>
              <span className="text-white font-medium">{cart.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Total Units Affected</span>
              <span className="text-white font-medium">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Global Name</span>
              <span className="text-white font-medium truncate max-w-[120px]" title={globalReference}>{globalReference || 'None'}</span>
            </div>
          </div>
          
          <button
            onClick={submitBulk}
            disabled={cart.length === 0 || loading}
            className="btn btn-primary w-full py-3"
          >
            {loading ? 'Processing...' : 'Submit Updates'}
          </button>
        </div>
      </div>
    </div>
  )
}
