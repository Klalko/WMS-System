'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import BarcodeScannerModal from '@/components/scanner/BarcodeScannerModal'
import { createClient } from '@/lib/supabase/client'
import imageCompression from 'browser-image-compression'

export default function EditProductClient({ 
  product, 
  partners 
}: { 
  product: any, 
  partners: { id: string, name: string }[] 
}) {
  const router = useRouter()
  const supabase = createClient()
  
  const [form, setForm] = useState({
    sku: product.sku || '', 
    name: product.name || '', 
    description: product.description || '', 
    unit: product.unit || 'pcs',
    lowStockThreshold: product.lowStockThreshold?.toString() || '10',
    costPrice: product.costPrice?.toString() || '', 
    sellingPrice: product.sellingPrice?.toString() || '', 
    contactId: product.contactId || ''
  })
  
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [removeExistingImage, setRemoveExistingImage] = useState(false)
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let finalImageUrl = removeExistingImage ? null : product.imageUrl

      if (imageFile) {
        let fileToUpload = imageFile
        try {
          const options = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
          }
          fileToUpload = await imageCompression(imageFile, options)
        } catch (compErr) {
          console.error("Compression error:", compErr)
        }

        const fileExt = fileToUpload.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, fileToUpload)

        if (uploadError) throw new Error('Failed to upload image: ' + uploadError.message)

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName)
          
        finalImageUrl = publicUrl
      }

      const payload = {
        ...form,
        lowStockThreshold: parseInt(form.lowStockThreshold) || 0,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
        sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : null,
        imageUrl: finalImageUrl,
        contactId: form.contactId || null,
      }

      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to update product')

      router.push(`/inventory/${product.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/inventory/${product.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Product
        </Link>
        <h1 className="page-title">Edit Product</h1>
        <p className="page-subtitle">Update product details and pricing</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Basic Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label htmlFor="sku">SKU / Barcode *</label>
                <div className="flex gap-2 mt-1">
                  <input id="sku" name="sku" type="text" className="input mono flex-1" placeholder="e.g. 012345678901" value={form.sku} onChange={handleChange} required />
                  <button type="button" onClick={() => setIsScanning(true)} className="btn btn-secondary flex items-center gap-1.5 shrink-0 px-4">
                    Scan
                  </button>
                </div>
              </div>
              <div className="col-span-2">
                <label htmlFor="name">Product Name *</label>
                <input id="name" name="name" type="text" className="input" placeholder="e.g. Premium Widget" value={form.name} onChange={handleChange} required />
              </div>
              
              <div className="col-span-2">
                <label htmlFor="contactId">Partner</label>
                <select id="contactId" name="contactId" className="input" value={form.contactId} onChange={handleChange}>
                  <option value="">No Partner</option>
                  {partners.map(partner => (
                    <option key={partner.id} value={partner.id}>{partner.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label htmlFor="image">Product Image (Upload new to replace)</label>
                {product.imageUrl && !removeExistingImage && !imageFile && (
                  <div className="mb-2 flex items-start gap-3">
                    <img src={product.imageUrl} alt="Current" className="w-16 h-16 object-cover rounded border border-stroke-neutral bg-white/5" />
                    <button type="button" onClick={() => setRemoveExistingImage(true)} className="btn btn-sm btn-danger">
                      Remove Photo
                    </button>
                  </div>
                )}
                <input 
                  id="image" 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="input p-2.5 w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 cursor-pointer" 
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)} 
                />
              </div>

              <div className="col-span-2">
                <label htmlFor="description">Description</label>
                <textarea id="description" name="description" className="input min-h-20 resize-none" placeholder="Optional description..." value={form.description} onChange={handleChange} />
              </div>
            </div>
          </div>

          <hr className="border-stroke-neutral" />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Pricing & Stock</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="costPrice">Cost Price ($)</label>
                <input id="costPrice" name="costPrice" type="number" step="0.01" min="0" className="input" placeholder="0.00" value={form.costPrice} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="sellingPrice">Selling Price ($)</label>
                <input id="sellingPrice" name="sellingPrice" type="number" step="0.01" min="0" className="input" placeholder="0.00" value={form.sellingPrice} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="unit">Unit</label>
                <input id="unit" name="unit" type="text" className="input" placeholder="pcs" value={form.unit} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="lowStockThreshold">Low Stock Alert</label>
                <input id="lowStockThreshold" name="lowStockThreshold" type="number" min="0" className="input" value={form.lowStockThreshold} onChange={handleChange} />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-danger bg-red-950/30 border border-red-800/30 rounded-lg px-4 py-2.5">{error}</p>}

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn btn-primary btn-lg flex-1" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <Link href={`/inventory/${product.id}`} className="btn btn-secondary btn-lg">Cancel</Link>
          </div>
        </form>
      </motion.div>

      <BarcodeScannerModal
        isOpen={isScanning}
        onClose={() => setIsScanning(false)}
        onScan={(scannedSku) => {
          setForm(prev => ({ ...prev, sku: scannedSku }))
          setIsScanning(false)
        }}
      />
    </div>
  )
}
