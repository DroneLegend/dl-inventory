// -----------------------------------------------------------------------------
// Supabase Auth Callback Route
// -----------------------------------------------------------------------------
// Supabase redirects users here after they click an email confirmation link
// (e.g. for email verification or password reset).
// This route exchanges the temporary "code" in the URL for a real session.

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  // Supabase puts a one-time code in the URL query string
  const code = searchParams.get('code')

  // Optional: where to send the user after the callback completes
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a real session (sets the auth cookie)
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Successfully logged in — send them to the intended destination
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — send back to login with an error flag
  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`)
}
