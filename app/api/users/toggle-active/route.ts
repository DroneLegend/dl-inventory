// -----------------------------------------------------------------------------
// API Route: Toggle User Active/Inactive
// -----------------------------------------------------------------------------
// Updates the profiles table is_active column, and bans/unbans the user
// via the Supabase Admin API. Does NOT delete the user or their history.
// Only accessible by authenticated admin users.
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // --- Auth check: verify the caller is an authenticated admin ---
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  // --- Parse and validate the request body ---
  const body = await request.json()
  const { user_id, is_active } = body as {
    user_id?: string
    is_active?: boolean
  }

  if (!user_id || typeof is_active !== 'boolean') {
    return NextResponse.json(
      { error: 'Required: user_id (string) and is_active (boolean).' },
      { status: 400 }
    )
  }

  // Prevent admins from deactivating themselves
  if (user_id === user.id && !is_active) {
    return NextResponse.json(
      { error: 'You cannot deactivate your own account.' },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()

  // --- Update the profiles table ---
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ is_active })
    .eq('id', user_id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // --- Ban or unban the user in Supabase Auth ---
  if (is_active) {
    // Unban: set ban_duration to "none" to remove any existing ban
    const { error } = await adminClient.auth.admin.updateUserById(user_id, {
      ban_duration: 'none',
    })
    if (error) {
      return NextResponse.json({ error: `Profile updated but unban failed: ${error.message}` }, { status: 500 })
    }
  } else {
    // Ban: set a very long ban duration (effectively permanent until reactivated)
    const { error } = await adminClient.auth.admin.updateUserById(user_id, {
      ban_duration: '876000h', // ~100 years
    })
    if (error) {
      return NextResponse.json({ error: `Profile updated but ban failed: ${error.message}` }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
