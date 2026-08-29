'use client'

import type { Transaction } from '@/types'

interface Props {
  transactions: (Transaction & { user: { fullName: string | null } })[]
}

export default function TransactionHistoryTable({ transactions }: Props) {
  return (
    <div className="table-wrapper mt-4 border-0 overflow-x-auto">
      <table className="w-full border-collapse min-w-[600px]">
        <thead>
          <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
            <th className="p-2 sm:p-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Type</th>
            <th className="p-2 sm:p-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Qty</th>
            <th className="p-2 sm:p-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">By</th>
            <th className="p-2 sm:p-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Notes</th>
            <th className="p-2 sm:p-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {transactions.length === 0 ? (
            <tr><td colSpan={5} className="text-center text-muted py-8 text-sm">No transactions for this product yet</td></tr>
          ) : (
            transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-2 sm:p-3 align-middle">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    tx.type === 'inbound' 
                      ? 'bg-[rgba(16,185,129,0.15)] text-success border border-[rgba(16,185,129,0.3)]' 
                      : 'bg-[rgba(239,68,68,0.15)] text-danger border border-[rgba(239,68,68,0.3)]'
                  }`}>
                    {tx.type === 'inbound' ? '↓ In' : '↑ Out'}
                  </span>
                </td>
                <td className="p-2 sm:p-3 align-middle font-semibold text-white text-xs sm:text-sm">{tx.quantity}</td>
                <td className="p-2 sm:p-3 align-middle text-muted text-xs sm:text-sm">{tx.user?.fullName ?? '—'}</td>
                <td className="p-2 sm:p-3 align-middle text-muted text-xs sm:text-sm truncate max-w-[150px]">{tx.notes ?? '—'}</td>
                <td className="p-2 sm:p-3 align-middle text-muted text-xs">
                  {new Date(tx.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
