// -----------------------------------------------------------------------------
// API Route: Create User
// -----------------------------------------------------------------------------
// Creates a new user via Supabase Admin API (service role key, server-side only).
// After creating the auth user, inserts their profile with full_name and role.
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

  // Check their profile role
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
  const { email, password, full_name, role } = body as {
    email?: string
    password?: string
    full_name?: string
    role?: string
  }

  if (!email || !password || !full_name || !role) {
    return NextResponse.json(
      { error: 'All fields are required: email, password, full_name, role.' },
      { status: 400 }
    )
  }

  if (role !== 'admin' && role !== 'warehouse') {
    return NextResponse.json(
      { error: 'Role must be "admin" or "warehouse".' },
      { status: 400 }
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters.' },
      { status: 400 }
    )
  }

  // --- Create the auth user via Supabase Admin API ---
  const adminClient = createAdminClient()

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true, // Skip confirmation email
    user_metadata: { full_name: full_name.trim() },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // --- Insert or update the profiles table with full_name and role ---
  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert({
      id: newUser.user.id,
      email: email.trim(),
      full_name: full_name.trim(),
      role,
    }, { onConflict: 'id' })

  if (profileError) {
    return NextResponse.json(
      { error: `User created but profile failed: ${profileError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
