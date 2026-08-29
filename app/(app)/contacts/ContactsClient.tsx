'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Contact = {
  id: string
  type: 'client' | 'partner'
  name: string
  phone: string | null
  location: string | null
  email: string | null
  _count?: { products: number }
}

export default function ContactsClient() {
  const [activeTab, setActiveTab] = useState<'client' | 'partner'>('client')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Form State
  const [form, setForm] = useState({ name: '', phone: '', location: '', email: '' })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/contacts?type=${activeTab}`)
      const json = await res.json()
      setContacts(json.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [activeTab])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab, ...form })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add contact')
      
      setIsModalOpen(false)
      setForm({ name: '', phone: '', location: '', email: '' })
      fetchContacts()
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4">
      {/* Top Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)] w-full sm:w-auto">
          <button 
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'client' ? 'bg-primary text-white shadow-md' : 'text-muted hover:text-white'}`}
            onClick={() => setActiveTab('client')}
          >
            Clients
          </button>
          <button 
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'partner' ? 'bg-primary text-white shadow-md' : 'text-muted hover:text-white'}`}
            onClick={() => setActiveTab('partner')}
          >
            Partners
          </button>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary w-full sm:w-auto">
          + Add New {activeTab === 'client' ? 'Client' : 'Partner'}
        </button>
      </div>

      {/* Contact List */}
      <div className="glass-card flex-1 overflow-auto p-4 sm:p-6">
        {loading ? (
          <div className="py-12 text-center text-muted">Loading contacts...</div>
        ) : contacts.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center mx-auto mb-4 text-muted">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <p className="text-white font-medium mb-1">No {activeTab}s found</p>
            <p className="text-sm text-muted">Click the button above to add your first {activeTab}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {contacts.map(contact => (
              <div key={contact.id} className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-primary/50 transition-colors">
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white truncate text-lg">{contact.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted capitalize">{contact.type}</p>
                      {contact.type === 'partner' && contact._count && (
                        <span className="text-[10px] font-medium bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          {contact._count.products} Product{contact._count.products !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 mt-4 text-sm">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-muted">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                      <span className="truncate text-white">{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-muted">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      <span className="text-white">{contact.phone}</span>
                    </div>
                  )}
                  {contact.location && (
                    <div className="flex items-center gap-2 text-muted">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      <span className="truncate text-white">{contact.location}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Add New {activeTab === 'client' ? 'Client' : 'Partner'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-white transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="text-sm text-muted mb-1 block">Full Name / Company Name *</label>
                  <input type="text" className="input w-full" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div>
                  <label className="text-sm text-muted mb-1 block">Email</label>
                  <input type="email" className="input w-full" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm text-muted mb-1 block">Phone Number</label>
                  <input type="text" className="input w-full" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm text-muted mb-1 block">Location / Address</label>
                  <input type="text" className="input w-full" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                </div>

                {formError && <p className="text-sm text-danger mt-2">{formError}</p>}
                
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={formLoading || !form.name} className="btn btn-primary flex-1">
                    {formLoading ? 'Saving...' : 'Save Contact'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
