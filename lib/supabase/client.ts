// -----------------------------------------------------------------------------
// Supabase Browser Client
// -----------------------------------------------------------------------------
// Use this client in CLIENT COMPONENTS (files with 'use client' at the top).
// It reads from the browser's cookies to maintain the logged-in session.
// Never use this in server components or API routes — use server.ts instead.

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
