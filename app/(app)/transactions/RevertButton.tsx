'use client'

import { useState } from 'react'

export default function RevertButton({ txId, isReverted }: { txId: string, isReverted: boolean }) {
  const [loading, setLoading] = useState(false)

  async function handleRevert() {
    if (!window.confirm('Are you sure you want to revert this transaction? A compensating transaction will be created and stock will be adjusted.')) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/transactions/${txId}/revert`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to revert transaction')
      
      // Reload page to show new transaction
      window.location.reload()
    } catch (err: any) {
      alert(err.message)
      setLoading(false)
    }
  }

  if (isReverted) return <span className="text-xs text-muted italic">Reverted</span>

  return (
    <button 
      onClick={handleRevert} 
      disabled={loading}
      className="btn btn-sm btn-secondary hover:text-danger hover:border-danger/30 hover:bg-red-500/10"
      title="Undo / Revert Transaction"
    >
      {loading ? '...' : 'Undo'}
    </button>
  )
}
