import { Metadata } from 'next'
import ContactsClient from './ContactsClient'

export const metadata: Metadata = { title: 'Contacts Directory' }

export default function ContactsPage() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="page-header">
        <h1 className="page-title">Contacts Directory</h1>
        <p className="page-subtitle">Manage your clients and partners</p>
      </div>
      
      <ContactsClient />
    </div>
  )
}
