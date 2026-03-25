// -----------------------------------------------------------------------------
// Auth Helper
// -----------------------------------------------------------------------------
// Server-side utilities for getting the current user's profile and role.
// Use these in server components and server actions.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// The shape of a user profile from the database
export type UserProfile = {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'warehouse'
  created_at: string
  updated_at: string
}

// Gets the current user's profile (including their role) from the database.
// Returns null if the user is not logged in or their profile doesn't exist.
export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()

  // First check if there's an authenticated user session
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) return null

  // Then fetch their profile row (which includes the role field)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) return null

  return profile as UserProfile
}

// Gets the current user's profile and redirects to login if not authenticated.
// Use this in protected server components to guarantee a logged-in user.
export async function requireAuth(): Promise<UserProfile> {
  const profile = await getUserProfile()

  if (!profile) {
    redirect('/')
  }

  return profile
}

// Gets the current user's profile and redirects if they are not an admin.
// Use this in admin-only server components.
export async function requireAdmin(): Promise<UserProfile> {
  const profile = await requireAuth()

  if (profile.role !== 'admin') {
    // Warehouse users who try to access admin pages get sent to their home
    redirect('/warehouse')
  }

  return profile
}
