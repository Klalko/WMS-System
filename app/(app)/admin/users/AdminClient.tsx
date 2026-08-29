'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Profile, UserRole } from '@/types'

interface Props {
  users: Profile[]
  currentUserId: string
}

export default function AdminClient({ users: initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'WORKER', fullName: '' })

  async function toggleRole(userId: string, currentRole: UserRole) {
    const newRole: UserRole = currentRole === 'ADMIN' ? 'WORKER' : 'ADMIN'
    setLoadingId(userId)
    setError('')

    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })

    let json;
    try {
      json = await res.json();
    } catch {
      throw new Error(`Server returned HTML instead of JSON. Status: ${res.status}`);
    }
    if (!res.ok) {
      setError(json?.error ?? 'Failed to update role')
    } else {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
    }
    setLoadingId(null)
  }

  async function deleteUser(userId: string, userName: string) {
    if (!window.confirm(`Are you sure you want to delete ${userName}?\nThis cannot be undone.`)) return
    
    setLoadingId(userId)
    setError('')

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      let json;
      try {
        json = await res.json();
      } catch {
        throw new Error(`Server returned HTML instead of JSON. Status: ${res.status}`);
      }
      if (!res.ok) throw new Error(json?.error || 'Failed to delete user')
      
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingId(null)
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setLoadingId('creating')
    setError('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })
      let json;
      try {
        json = await res.json();
      } catch {
        throw new Error(`Server returned HTML instead of JSON. Status: ${res.status}`);
      }
      if (!res.ok) throw new Error(json?.error || 'Failed to create user')
      
      alert('User invited successfully! They can now sign in with the password you set.')
      setShowCreateModal(false)
      setNewUser({ email: '', password: '', role: 'WORKER', fullName: '' })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingId(null)
    }
  }

  async function resetPassword(userId: string) {
    const newPassword = prompt('Enter new password for this user:')
    if (!newPassword) return

    setLoadingId(`reset-${userId}`)
    setError('')

    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      })
      let json;
      try {
        json = await res.json();
      } catch {
        throw new Error(`Server returned HTML instead of JSON. Status: ${res.status}`);
      }
      if (!res.ok) throw new Error(json?.error || 'Failed to reset password')
      alert('Password reset successfully')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
      <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
        <h2 className="text-lg font-medium text-white">Users</h2>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm">
          + New Worker
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-xl text-sm text-danger bg-red-950/30 border border-red-800/30">{error}</div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-4">Invite User</h3>
            <form onSubmit={createUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Full Name</label>
                <input type="text" className="input w-full" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Email</label>
                <input type="email" className="input w-full" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Password</label>
                <input type="password" className="input w-full" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Role</label>
                <select className="input w-full" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                  <option value="WORKER">Worker</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loadingId === 'creating'}>
                  {loadingId === 'creating' ? 'Inviting...' : 'Invite Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-wrapper border-0">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                      {u.fullName ? u.fullName.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <p className="font-medium text-white">{u.fullName ?? 'Unknown'}</p>
                      <p className="text-xs text-muted">{u.id.slice(0, 8)}…</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${u.role === 'ADMIN' ? 'badge-info' : 'badge-muted'}`}>
                    {u.role === 'ADMIN' ? 'Admin' : 'Worker'}
                  </span>
                </td>
                <td className="text-muted text-sm">
                  {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {u.id === currentUserId ? (
                      <span className="text-xs text-muted italic">You</span>
                    ) : (
                      <>
                        <button
                          className={`btn btn-sm ${u.role === 'ADMIN' ? 'btn-secondary' : 'btn-primary'}`}
                          disabled={loadingId === u.id}
                          onClick={() => toggleRole(u.id, u.role)}
                        >
                          {loadingId === u.id
                            ? '...'
                            : u.role === 'ADMIN'
                            ? 'Demote to Worker'
                            : 'Promote to Admin'}
                        </button>
                        <button
                          className="btn btn-sm btn-secondary hover:text-white"
                          disabled={loadingId === `reset-${u.id}`}
                          onClick={() => resetPassword(u.id)}
                        >
                          {loadingId === `reset-${u.id}` ? '...' : 'Reset Password'}
                        </button>
                        <button
                          className="btn btn-sm btn-secondary hover:text-danger hover:border-danger/30 hover:bg-red-500/10"
                          disabled={loadingId === u.id}
                          onClick={() => deleteUser(u.id, u.fullName || 'Unknown')}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
