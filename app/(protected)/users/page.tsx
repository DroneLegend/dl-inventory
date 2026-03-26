// -----------------------------------------------------------------------------
// Users Page
// -----------------------------------------------------------------------------
// Shows all registered user accounts and lets admins change their roles.
// Admins have full system access; warehouse users can only see stock and
// log receives/shipments.
// -----------------------------------------------------------------------------

import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import UserManager from '@/components/admin/user-manager'

export const metadata = {
  title: 'Users — DL Inventory',
}

export default async function UsersPage() {
  // requireAdmin() returns the current user's profile AND enforces the admin check
  const currentUser = await requireAdmin()

  // Create a Supabase client for server-side data fetching
  const supabase = await createClient()

  // Fetch all user profiles (including is_active status)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, created_at')
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6">

      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Users</h2>
        <p className="text-slate-500 mt-1">
          Manage user accounts and roles. Change who has admin vs. warehouse access.
        </p>
      </div>

      {/* User table with role toggle functionality */}
      <UserManager
        profiles={profiles ?? []}
        currentUserId={currentUser.id}
      />

    </div>
  )
}
