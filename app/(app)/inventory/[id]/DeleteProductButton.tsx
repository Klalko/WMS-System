'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteProductButton({ productId, productName }: { productId: string, productName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"?\nThis will permanently delete the product and all of its transaction history. This action cannot be undone.`)) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to delete product')
      }
      router.push('/inventory')
      router.refresh()
    } catch (err: any) {
      alert(err.message)
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={loading}
      className="btn btn-sm btn-secondary hover:text-danger hover:border-danger/30 hover:bg-red-500/10"
    >
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  )
}
