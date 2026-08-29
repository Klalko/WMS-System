'use client'

import { useState, useEffect } from 'react'

import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import type { Transaction } from '@/types'
import Link from 'next/link'

interface Props {
  stats: {
    totalProducts: number
    lowStockCount: number
    totalInbound: number
    totalOutbound: number
  }
  recentTransactions: (Transaction & { product: { name: string; sku: string }; user: { fullName: string | null } })[]
  stockByProduct: { name: string; stock: number }[]
  transactionsByDay: { date: string; inbound: number; outbound: number }[]
  partners: { id: string; name: string }[]
  selectedPartnerId: string
  lowStockProducts?: { id: string, name: string, sku: string, currentStock: number, lowStockThreshold: number }[]
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

import { useRouter } from 'next/navigation'

function PartnerFinancials() {
  const [timeframe, setTimeframe] = useState('monthly')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics/partner-financials?timeframe=${timeframe}`)
      .then(res => res.ok ? res.json() : { data: [] })
      .then(json => setData(json.data || []))
      .catch(err => {
        console.error('Failed to fetch partner financials:', err)
        setData([])
      })
      .finally(() => setLoading(false))
  }, [timeframe])

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="glass-card flex flex-col h-full">
      <div className="flex items-center justify-between p-6 pb-0 mb-4">
        <div>
          <h2 className="font-semibold text-white">Partner Financials</h2>
          <p className="text-xs text-muted mt-0.5">Cost & Earnings grouped by Partner</p>
        </div>
        <select 
          className="input py-1.5 px-3 text-sm min-w-[120px]"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
        >
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
          <option value="all-time">All-Time</option>
        </select>
      </div>
      <div className="table-wrapper border-0 flex-1 min-h-[250px] overflow-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Partner</th>
              <th className="text-right">Total Cost</th>
              <th className="text-right">Total Earnings</th>
              <th className="text-right">Profit</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center text-muted py-8">Loading financials...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-muted py-8">No transaction data</td></tr>
            ) : (
              data.map(row => (
                <tr key={row.partnerName}>
                  <td className="font-medium text-white">{row.partnerName}</td>
                  <td className="text-right text-muted">${row.totalCost.toFixed(2)}</td>
                  <td className="text-right text-success">${row.totalEarnings.toFixed(2)}</td>
                  <td className={`text-right font-bold ${row.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                    ${row.profit.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

export default function DashboardClient({ stats, recentTransactions, stockByProduct, transactionsByDay, partners, selectedPartnerId, lowStockProducts = [] }: Props) {
  const router = useRouter()
  const [showAllLowStock, setShowAllLowStock] = useState(false)
  const displayedLowStock = showAllLowStock ? lowStockProducts : lowStockProducts.slice(0, 5)
  const statCards: { label: string, value: number | string, icon: string, color: string, glow: string, urgent?: boolean }[] = [
    {
      label: 'Total Products',
      value: stats.totalProducts,
      icon: '📦',
      color: 'var(--color-primary)',
      glow: 'var(--color-primary-glow)',
    },
    {
      label: 'Total Received',
      value: stats.totalInbound.toLocaleString(),
      icon: '⬇️',
      color: 'var(--color-success)',
      glow: 'var(--color-success-glow)',
    },
    {
      label: 'Total Dispatched',
      value: stats.totalOutbound.toLocaleString(),
      icon: '⬆️',
      color: '#a78bfa',
      glow: 'rgba(167,139,250,0.2)',
    },
  ]

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time warehouse overview</p>
        </div>
        
        <div>
          <select 
            className="input py-2 px-3 min-w-[200px]"
            value={selectedPartnerId}
            onChange={(e) => {
              const val = e.target.value
              router.push(val ? `/dashboard?contactId=${val}` : '/dashboard')
            }}
          >
            <option value="">All Partners</option>
            {partners.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stat Cards */}
      <motion.div
        className="grid grid-cols-3 gap-2 md:gap-4 mb-8"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      >
        {statCards.map((card) => (
          <motion.div key={card.label} variants={cardVariants} className="glass-card p-3 md:p-5 flex flex-col justify-center items-center text-center aspect-square md:aspect-auto md:block md:text-left">
            <div className="flex items-start justify-center md:justify-between mb-1 md:mb-3 w-full">
              <span className="text-xl md:text-2xl">{card.icon}</span>
              {card.urgent && (
                <span className="badge badge-warning hidden md:inline-flex">Alert</span>
              )}
            </div>
            <p className="text-lg md:text-2xl font-bold text-white leading-tight">{card.value}</p>
            <p className="text-[9px] md:text-xs text-muted mt-0.5 leading-tight">{card.label}</p>
            <div className="mt-2 md:mt-3 h-1 rounded-full w-full max-w-[40px] md:max-w-none" style={{ background: `linear-gradient(90deg, ${card.color}, transparent)`, boxShadow: `0 0 8px ${card.glow}` }} />
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Area Chart — Transactions over 7 days */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold text-white mb-1">Transaction Activity</h2>
          <p className="text-xs text-muted mb-5">Last 7 days</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={transactionsByDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a2236', border: '1px solid #1f2d45', borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Area type="monotone" dataKey="inbound" stroke="#10b981" fill="url(#colorInbound)" strokeWidth={2} name="Inbound" />
              <Area type="monotone" dataKey="outbound" stroke="#a78bfa" fill="url(#colorOutbound)" strokeWidth={2} name="Outbound" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Bar Chart — Stock by product */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold text-white mb-1">Top Stock Levels</h2>
          <p className="text-xs text-muted mb-5">Top 10 products by current stock</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stockByProduct} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a2236', border: '1px solid #1f2d45', borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="stock" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Stock" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Grid for Partner Financials and Low Stock */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <PartnerFinancials />

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card flex flex-col h-full">
          <div className="flex items-center justify-between p-6 pb-0 mb-4">
            <div>
              <h2 className="font-semibold text-white">Low Stock Alerts</h2>
              <p className="text-xs text-muted mt-0.5">Products below threshold</p>
            </div>
            <span className="badge badge-warning">{lowStockProducts.length}</span>
          </div>
          <div className="table-wrapper border-0 flex-1 min-h-[250px] overflow-auto">
            <table className="table min-w-[400px]">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Threshold</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.length === 0 ? (
                  <tr><td colSpan={3} className="text-center text-muted py-8">No low stock items</td></tr>
                ) : (
                  displayedLowStock.map(p => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/inventory/${p.id}`} className="font-medium text-white hover:text-primary transition-colors">
                          {p.name}
                        </Link>
                        <div className="text-xs text-muted mono">{p.sku}</div>
                      </td>
                      <td className="text-right text-danger font-bold">{p.currentStock}</td>
                      <td className="text-right text-muted">{p.lowStockThreshold}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {lowStockProducts.length > 5 && (
              <div className="p-3 border-t border-[var(--color-border)] flex justify-center bg-black/10 mt-auto">
                <button 
                  onClick={() => setShowAllLowStock(!showAllLowStock)} 
                  className="text-xs font-medium text-primary hover:text-white transition-colors py-1 px-3 rounded-full hover:bg-white/5"
                >
                  {showAllLowStock ? 'Show Less' : `View All (${lowStockProducts.length})`}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card"
      >
        <div className="flex items-center justify-between p-6 pb-0">
          <div>
            <h2 className="font-semibold text-white">Recent Transactions</h2>
            <p className="text-xs text-muted mt-0.5">Latest 10 stock movements</p>
          </div>
          <Link href="/transactions" className="btn btn-secondary btn-sm">View all</Link>
        </div>
        <div className="table-wrapper mt-4 border-0 overflow-auto">
          <table className="table min-w-[600px]">
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Qty</th>
                <th>By</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted py-8">No transactions yet</td></tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <div className="font-medium text-white">{tx.product?.name ?? '—'}</div>
                      <div className="text-xs text-muted mono">{tx.product?.sku}</div>
                    </td>
                    <td>
                      <span className={`badge ${tx.type === 'inbound' ? 'badge-success' : 'badge-danger'}`}>
                        {tx.type === 'inbound' ? '↓ Inbound' : '↑ Outbound'}
                      </span>
                    </td>
                    <td className="font-semibold text-white">{tx.quantity}</td>
                    <td className="text-muted">{tx.user?.fullName ?? '—'}</td>
                    <td className="text-muted text-xs">
                      {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
