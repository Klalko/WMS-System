'use client'

import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'

type ScanAction = 'inbound' | 'outbound' | null

interface ProductInfo {
  id: string
  name: string
  sku: string
  currentStock: number
  unit: string
  imageUrl?: string | null
}

function ScanPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)

  const [scanning, setScanning] = useState(false)
  const [scannedSku, setScannedSku] = useState(searchParams.get('sku') ?? '')
  const [action, setAction] = useState<ScanAction>((searchParams.get('action') as ScanAction) ?? null)
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [product, setProduct] = useState<ProductInfo | null>(null)
  const [loadingProduct, setLoadingProduct] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cameraError, setCameraError] = useState('')

  // Look up product when SKU is set
  useEffect(() => {
    if (!scannedSku) { setProduct(null); return }
    setLoadingProduct(true)
    setError('')
    fetch(`/api/products/by-sku?sku=${encodeURIComponent(scannedSku)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data && json.data.length > 0) setProduct(json.data[0])
        else setError(`No product found for SKU: ${scannedSku}`)
      })
      .catch(() => setError('Failed to look up product'))
      .finally(() => setLoadingProduct(false))
  }, [scannedSku])

  const stopScanner = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop()
      controlsRef.current = null
    }
    if (videoRef.current) {
      // Do not manually stop tracks here, controls.stop() handles it cleanly
      BrowserMultiFormatReader.cleanVideoSource(videoRef.current)
    }
    readerRef.current = null
    setScanning(false)
  }, [])

  const startScanner = useCallback(async () => {
    setCameraError('')
    setScanning(true)
    try {
      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader
      const devices = await BrowserMultiFormatReader.listVideoInputDevices()
      // Prefer rear camera on mobile
      const rearCam = devices.find((d) => /back|rear|environment/i.test(d.label)) ?? devices[0]
      if (!rearCam) throw new Error('No camera found')

      const controls = await reader.decodeFromVideoDevice(rearCam.deviceId, videoRef.current!, (result, err) => {
        if (result) {
          const sku = result.getText()
          setScannedSku(sku)
          stopScanner()
        }
        if (err && !(err instanceof NotFoundException)) {
          console.error(err)
        }
      })
      
      controlsRef.current = controls
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Camera error'
      setCameraError(msg)
      setScanning(false)
    }
  }, [stopScanner])

  useEffect(() => { 
    // Suppress harmless "setPhotoOptions failed" unhandled rejections that trigger the Next.js overlay
    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      if (e.reason && e.reason.message && e.reason.message.includes('setPhotoOptions')) {
        e.preventDefault()
      }
    }
    window.addEventListener('unhandledrejection', onUnhandledRejection)
    
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
      stopScanner() 
    }
  }, [stopScanner])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!product || !action) return
    setError('')
    setSubmitting(true)

    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        type: action,
        quantity: parseInt(quantity),
        notes,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Transaction failed')
      setSubmitting(false)
      return
    }

    setSuccess(`✅ ${action === 'inbound' ? 'Received' : 'Dispatched'} ${quantity} × ${product.name}`)
    setProduct(null)
    setScannedSku('')
    setAction(null)
    setQuantity('1')
    setNotes('')
    setSubmitting(false)
    setTimeout(() => setSuccess(''), 4000)
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="page-header">
        <h1 className="page-title">Barcode Scanner</h1>
        <p className="page-subtitle">Scan a product to record a transaction</p>
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Viewfinder */}
      <div className="glass-card overflow-hidden mb-6">
        <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ display: scanning ? 'block' : 'none' }}
          />
          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)', border: '2px dashed rgba(59,130,246,0.4)' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
                  <rect x="7" y="7" width="10" height="10" rx="1"/>
                </svg>
              </div>
              <p className="text-muted text-sm text-center">Point your camera at a barcode or QR code</p>
              {cameraError && <p className="text-danger text-xs text-center">{cameraError}</p>}
            </div>
          )}
          {/* Scanning overlay */}
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-56 relative">
                {/* Corner brackets */}
                {['tl','tr','bl','br'].map((pos) => (
                  <div key={pos} className="absolute w-8 h-8" style={{
                    top: pos.startsWith('t') ? 0 : 'auto',
                    bottom: pos.startsWith('b') ? 0 : 'auto',
                    left: pos.endsWith('l') ? 0 : 'auto',
                    right: pos.endsWith('r') ? 0 : 'auto',
                    borderTop: pos.startsWith('t') ? '3px solid #3b82f6' : 'none',
                    borderBottom: pos.startsWith('b') ? '3px solid #3b82f6' : 'none',
                    borderLeft: pos.endsWith('l') ? '3px solid #3b82f6' : 'none',
                    borderRight: pos.endsWith('r') ? '3px solid #3b82f6' : 'none',
                  }} />
                ))}
                {/* Scan line */}
                <motion.div
                  className="absolute left-1 right-1 h-0.5"
                  style={{ background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)' }}
                  animate={{ top: ['10%', '90%', '10%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="p-4">
          {!scanning ? (
            <button onClick={startScanner} className="btn btn-primary w-full">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Start Camera
            </button>
          ) : (
            <button onClick={stopScanner} className="btn btn-secondary w-full">Stop Camera</button>
          )}
        </div>
      </div>

      {/* Manual SKU input */}
      <div className="glass-card p-5 mb-6">
        <label htmlFor="manualSku">Or enter SKU manually</label>
        <div className="flex gap-2 mt-1">
          <input
            id="manualSku"
            type="text"
            className="input mono flex-1"
            placeholder="e.g. 012345678901"
            value={scannedSku}
            onChange={(e) => setScannedSku(e.target.value)}
          />
          <button
            className="btn btn-secondary"
            onClick={() => setScannedSku(scannedSku)}
            disabled={!scannedSku}
          >
            Look up
          </button>
        </div>
      </div>

      {/* Product card + Transaction form */}
      <AnimatePresence>
        {loadingProduct && (
          <div className="glass-card p-6 mb-6">
            <div className="skeleton h-5 w-1/2 mb-2" />
            <div className="skeleton h-4 w-1/3" />
          </div>
        )}

        {product && !loadingProduct && (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="glass-card p-6 mb-6"
          >
            <div className="flex items-start justify-between mb-4 gap-4">
              <div className="flex items-center gap-4">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-lg object-cover border border-stroke-neutral bg-white/5 shadow-md shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-white/5 border border-stroke-neutral flex items-center justify-center text-muted text-[10px] shrink-0">No image</div>
                )}
                <div>
                  <p className="font-bold text-white text-lg leading-tight">{product.name}</p>
                  <p className="mono text-muted text-sm mt-0.5">{product.sku}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-white">{product.currentStock}</p>
                <p className="text-xs text-muted leading-none">{product.unit} in stock</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Action selector */}
              <div>
                <label>Action *</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setAction('inbound')}
                    className={`btn ${action === 'inbound' ? 'btn-success' : 'btn-secondary'}`}
                  >
                    ↓ Receive (Inbound)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction('outbound')}
                    className={`btn ${action === 'outbound' ? 'btn-danger' : 'btn-secondary'}`}
                  >
                    ↑ Dispatch (Outbound)
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="qty">Quantity *</label>
                <input
                  id="qty"
                  type="number"
                  min="1"
                  className="input"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="notes">Notes (optional)</label>
                <input
                  id="notes"
                  type="text"
                  className="input"
                  placeholder="e.g. Order #123"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm text-danger bg-red-950/30 border border-red-800/30 rounded-lg px-4 py-2.5">{error}</p>
              )}

              <button
                type="submit"
                className={`btn btn-lg w-full ${action === 'outbound' ? 'btn-danger' : 'btn-success'}`}
                disabled={!action || submitting}
              >
                {submitting ? 'Saving...' : action ? `Confirm ${action === 'inbound' ? 'Receive' : 'Dispatch'}` : 'Select an action'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {error && !product && !loadingProduct && (
        <div className="glass-card p-5 border border-red-800/30 bg-red-950/10">
          <p className="text-sm text-danger mb-4 text-center">{error}</p>
          <button 
            onClick={() => router.push(`/inventory/new?sku=${scannedSku}`)}
            className="btn btn-primary w-full"
          >
            + Register New Product
          </button>
        </div>
      )}
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted">Loading scanner…</div>}>
      <ScanPageInner />
    </Suspense>
  )
}
