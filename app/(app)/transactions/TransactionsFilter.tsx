'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function TransactionsFilter({ 
  partners, 
  currentType, 
  currentPartner,
  currentTimeframe
}: { 
  partners: {id: string, name: string}[],
  currentType: string,
  currentPartner: string,
  currentTimeframe: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page') // Reset page on filter change
    router.push(`/transactions?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex gap-2">
        {[
          { label: 'All', value: '' },
          { label: '↓ Inbound', value: 'inbound' },
          { label: '↑ Outbound', value: 'outbound' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setParam('type', tab.value)}
            className={`btn btn-sm ${currentType === tab.value || (!currentType && tab.value === '') ? 'btn-primary' : 'btn-secondary'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <select 
        className="input w-full sm:w-48 py-1.5 px-3 text-sm h-[38px]"
        value={currentTimeframe}
        onChange={(e) => setParam('timeframe', e.target.value)}
      >
        <option value="all">All Time</option>
        <option value="today">Today</option>
        <option value="7days">Last 7 Days</option>
        <option value="month">This Month</option>
      </select>
      
      <select 
        className="input w-full sm:w-48 py-1.5 px-3 text-sm h-[38px]"
        value={currentPartner}
        onChange={(e) => setParam('contactId', e.target.value)}
      >
        <option value="">All Partners</option>
        {partners.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
    </div>
  )
}
