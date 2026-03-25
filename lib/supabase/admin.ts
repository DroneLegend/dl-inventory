// -----------------------------------------------------------------------------
// Supabase Admin Client (Service Role)
// -----------------------------------------------------------------------------
// Uses the SERVICE ROLE key which bypasses Row Level Security entirely.
//
// ONLY use this in server-side code: API routes and server actions.
// NEVER import this in client components — it would expose the secret key.
//
// Used by the alert system because:
//   1. The cron job runs without a user session (no auth.uid())
//   2. It needs to update alert_settings.last_alert_sent, which RLS restricts
//      to admins only
// -----------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.'
    )
  }

  // auth: { persistSession: false } is important for server-side usage —
  // it means this client won't try to store or refresh session tokens.
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}
