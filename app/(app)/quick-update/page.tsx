import { Metadata } from 'next'
import QuickUpdateClient from './QuickUpdateClient'

export const metadata: Metadata = { title: 'Quick Bulk Update' }

export default async function QuickUpdatePage() {
  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Quick Bulk Update</h1>
          <p className="page-subtitle">Add items by scanner or text search to process transactions</p>
        </div>
      </div>
      <QuickUpdateClient />
    </div>
  )
}
