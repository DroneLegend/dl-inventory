// -----------------------------------------------------------------------------
// Supabase Server Client
// -----------------------------------------------------------------------------
// Use this client in SERVER COMPONENTS, server actions, and API routes.
// It reads cookies from the incoming request to identify the logged-in user.
// Must be called inside an async function (it uses Next.js cookies()).

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  // Next.js cookies() gives us access to the request/response cookie jar
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read all cookies from the request
        getAll() {
          return cookieStore.getAll()
        },
        // Write cookies back to the response (e.g. when refreshing a session token)
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // In server components we can't set cookies directly.
            // The middleware handles session refresh — this catch is expected.
          }
        },
      },
    }
  )
}
