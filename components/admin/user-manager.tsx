'use client'

// -----------------------------------------------------------------------------
// User Manager Component
// -----------------------------------------------------------------------------
// Lets admins view all user accounts and change their roles.
// Roles:
//   admin     — full access: dashboard, inventory management, all settings
//   warehouse — limited access: can log receives and ships
// -----------------------------------------------------------------------------

import { useState, useTransition } from 'react'
import { updateUserRole } from '@/app/(protected)/admin/actions'
import { cn } from '@/lib/utils'

// ---- Type definitions --------------------------------------------------------

type Profile = {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'warehouse'
  created_at: string
}

type Props = {
  profiles: Profile[]
  // The current logged-in admin's ID — we prevent them from changing their own role
  currentUserId: string
}

// ---- Helper: format a date string for display --------------------------------

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ---- Main component ----------------------------------------------------------

export default function UserManager({ profiles, currentUserId }: Props) {
  // Error message to show if a role change fails
  const [error, setError] = useState<string | null>(null)

  // isPending = true while a server action is running
  const [isPending, startTransition] = useTransition()

  // Toggle a user's role between 'admin' and 'warehouse'
  function handleToggleRole(profile: Profile) {
    const newRole = profile.role === 'admin' ? 'warehouse' : 'admin'
    const label = newRole === 'admin' ? 'promote to Admin' : 'change to Warehouse'

    if (!confirm(`${label === 'promote to Admin' ? 'Promote' : 'Change'} "${profile.full_name ?? profile.email}" to ${newRole}?`)) return

    startTransition(async () => {
      const result = await updateUserRole(profile.id, newRole)
      if (result.error) setError(result.error)
    })
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

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Users table */}
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
                <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Joined</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((profile) => {
                // Admins can't change their own role (would lock themselves out)
                const isSelf = profile.id === currentUserId

                return (
                  <tr key={profile.id} className="hover:bg-slate-50 transition-colors">

                    {/* Full name */}
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {profile.full_name ?? (
                        <span className="text-slate-400 font-normal">—</span>
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

                    {/* Join date */}
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {formatDate(profile.created_at)}
                    </td>

                    {/* Role toggle button */}
                    <td className="px-4 py-3 text-right">
                      {isSelf ? (
                        // Can't change your own role
                        <span className="text-xs text-slate-300">—</span>
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
      </p>

    </div>
  )
}
