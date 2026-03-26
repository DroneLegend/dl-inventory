'use client'

// -----------------------------------------------------------------------------
// User Manager Component
// -----------------------------------------------------------------------------
// Lets admins view all user accounts, change roles, toggle active/inactive,
// and create new users. Roles:
//   admin     — full access: dashboard, inventory management, all settings
//   warehouse — limited access: can log receives and ships
// -----------------------------------------------------------------------------

import { useState, useTransition } from 'react'
import { updateUserRole } from '@/app/(protected)/admin/actions'
import { cn } from '@/lib/utils'
import { UserPlus, CheckCircle, AlertCircle, X } from 'lucide-react'

// ---- Type definitions --------------------------------------------------------

type Profile = {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'warehouse'
  is_active: boolean
  created_at: string
}

type Props = {
  profiles: Profile[]
  // The current logged-in admin's ID — we prevent them from changing their own role
  currentUserId: string
}

// ---- Toast component for success/error feedback -----------------------------

function Toast({ message, type, onDismiss }: {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
}) {
  const isSuccess = type === 'success'
  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl border-2 animate-in fade-in slide-in-from-top-2 duration-300',
      isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    )}>
      {isSuccess
        ? <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
        : <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />}
      <p className={cn('flex-1 text-sm font-medium', isSuccess ? 'text-green-800' : 'text-red-800')}>
        {message}
      </p>
      <button onClick={onDismiss} className={cn(
        'p-0.5 rounded hover:bg-white/60 transition-colors',
        isSuccess ? 'text-green-600' : 'text-red-600'
      )}>
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// ---- Main component ----------------------------------------------------------

export default function UserManager({ profiles, currentUserId }: Props) {
  // Toast for feedback messages
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // isPending = true while a server action is running
  const [isPending, startTransition] = useTransition()

  // Controls whether the "Add User" modal is open
  const [showAddUser, setShowAddUser] = useState(false)

  // Add User form fields
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'warehouse'>('warehouse')
  const [addingUser, setAddingUser] = useState(false)

  // Auto-dismiss toast after 4 seconds
  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Toggle a user's role between 'admin' and 'warehouse'
  function handleToggleRole(profile: Profile) {
    const newRoleValue = profile.role === 'admin' ? 'warehouse' : 'admin'
    const label = newRoleValue === 'admin' ? 'Promote' : 'Change'

    if (!confirm(`${label} "${profile.full_name ?? profile.email}" to ${newRoleValue}?`)) return

    startTransition(async () => {
      const result = await updateUserRole(profile.id, newRoleValue)
      if (result.error) {
        showToast(result.error, 'error')
      } else {
        showToast(`${profile.full_name ?? profile.email} is now ${newRoleValue}.`, 'success')
      }
    })
  }

  // Toggle a user's active/inactive status via the API route
  async function handleToggleActive(profile: Profile) {
    const activating = !profile.is_active

    // Show confirmation when deactivating
    if (!activating) {
      if (!confirm(
        `Deactivate "${profile.full_name ?? profile.email}"?\n\nThey will be unable to log in until reactivated. Their transaction history will be preserved.`
      )) return
    }

    try {
      const res = await fetch('/api/users/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: profile.id, is_active: activating }),
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || 'Failed to update user status.', 'error')
        return
      }

      showToast(
        `${profile.full_name ?? profile.email} has been ${activating ? 'reactivated' : 'deactivated'}.`,
        'success'
      )
      // Reload the page to reflect changes from the server
      window.location.reload()
    } catch {
      showToast('Network error. Please try again.', 'error')
    }
  }

  // Submit the Add User form
  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    setAddingUser(true)

    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          full_name: newName,
          role: newRole,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || 'Failed to create user.', 'error')
        setAddingUser(false)
        return
      }

      showToast(`User "${newName}" created successfully!`, 'success')
      // Reset form and close modal
      setNewEmail('')
      setNewPassword('')
      setNewName('')
      setNewRole('warehouse')
      setShowAddUser(false)
      // Reload to show the new user in the table
      window.location.reload()
    } catch {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setAddingUser(false)
    }
  }

  // Sort users: admins first, then alphabetically by name/email
  const sorted = [...profiles].sort((a, b) => {
    if (a.role !== b.role) return a.role === 'admin' ? -1 : 1
    const nameA = a.full_name ?? a.email
    const nameB = b.full_name ?? b.email
    return nameA.localeCompare(nameB)
  })

  return (
    <div className="space-y-4">

      {/* Toast messages */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}

      {/* Add User button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddUser(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-navy text-white
                     text-sm font-medium hover:bg-brand-navy/90 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Add User
        </button>
      </div>

      {/* ---- Add User Modal ---- */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5
                          animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Add New User</h3>
              <button
                onClick={() => setShowAddUser(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Jane Smith"
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm
                             focus:outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="jane@dronelegends.com"
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm
                             focus:outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm
                             focus:outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'warehouse')}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm bg-white
                             focus:outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
                >
                  <option value="warehouse">Warehouse</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Submit / Cancel buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 h-9 rounded-lg border border-slate-200 text-sm font-medium
                             text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingUser}
                  className="flex-1 h-9 rounded-lg bg-brand-navy text-white text-sm font-medium
                             hover:bg-brand-navy/90 transition-colors disabled:opacity-50"
                >
                  {addingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Users table ---- */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-400 text-sm">No users found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((profile) => {
                // Admins can't change their own role or deactivate themselves
                const isSelf = profile.id === currentUserId
                const isActive = profile.is_active !== false // default to true if null

                return (
                  <tr key={profile.id} className={cn(
                    'hover:bg-slate-50 transition-colors',
                    !isActive && 'opacity-60'
                  )}>

                    {/* Full name */}
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {profile.full_name ?? (
                        <span className="text-slate-400 font-normal">&mdash;</span>
                      )}
                      {/* "You" badge for the current user */}
                      {isSelf && (
                        <span className="ml-2 text-xs bg-brand-orange/15 text-brand-orange px-1.5 py-0.5 rounded font-medium">
                          You
                        </span>
                      )}
                    </td>

                    {/* Email address */}
                    <td className="px-4 py-3 text-slate-500">{profile.email}</td>

                    {/* Role badge */}
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'inline-block text-xs font-medium px-2.5 py-0.5 rounded-full capitalize',
                        profile.role === 'admin'
                          ? 'bg-brand-orange/15 text-brand-orange'
                          : 'bg-slate-100 text-slate-600'
                      )}>
                        {profile.role}
                      </span>
                    </td>

                    {/* Active/Inactive status toggle */}
                    <td className="px-4 py-3 text-center">
                      {isSelf ? (
                        // Current user always shows as Active (can't toggle self)
                        <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">
                          Active
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(profile)}
                          className="group inline-flex items-center gap-2 cursor-pointer"
                          title={isActive ? 'Click to deactivate' : 'Click to reactivate'}
                        >
                          {/* Toggle switch visual */}
                          <div className={cn(
                            'relative w-9 h-5 rounded-full transition-colors',
                            isActive ? 'bg-green-500' : 'bg-slate-300'
                          )}>
                            <div className={cn(
                              'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                              isActive ? 'translate-x-4' : 'translate-x-0.5'
                            )} />
                          </div>
                          <span className={cn(
                            'text-xs font-medium',
                            isActive ? 'text-green-700' : 'text-slate-400'
                          )}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </button>
                      )}
                    </td>

                    {/* Role toggle button */}
                    <td className="px-4 py-3 text-right">
                      {isSelf ? (
                        // Can't change your own role
                        <span className="text-xs text-slate-300">&mdash;</span>
                      ) : (
                        <button
                          onClick={() => handleToggleRole(profile)}
                          disabled={isPending}
                          className={cn(
                            'text-xs font-medium px-3 py-1 rounded-lg border transition-colors disabled:opacity-50',
                            profile.role === 'admin'
                              ? 'border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50'
                              : 'border-slate-200 text-slate-600 hover:border-brand-navy hover:text-brand-navy hover:bg-brand-navy/5'
                          )}
                        >
                          {profile.role === 'admin' ? 'Make Warehouse' : 'Make Admin'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Info note about roles */}
      <p className="text-xs text-slate-400">
        <strong>Admin</strong> — full access to all pages and settings.
        &nbsp;&nbsp;
        <strong>Warehouse</strong> — can only view stock and log receives/ships.
        &nbsp;&nbsp;
        <strong>Inactive</strong> — user cannot log in but their history is preserved.
      </p>

    </div>
  )
}
