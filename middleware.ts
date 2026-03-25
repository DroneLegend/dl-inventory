// -----------------------------------------------------------------------------
// Next.js Middleware
// -----------------------------------------------------------------------------
// This file runs on EVERY request before the page loads.
// It does two things:
//   1. Refreshes the Supabase auth session (keeps the user logged in)
//   2. Redirects unauthenticated users to the login page

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Start with a basic "continue" response that we'll modify if needed
  let supabaseResponse = NextResponse.next({ request })

  // Create a Supabase client that can read and write cookies on the request/response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write updated cookies to both the request and response.
          // This is required to properly refresh expiring session tokens.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Check if there is a valid logged-in user.
  // IMPORTANT: Always use getUser() (not getSession()) for security —
  // getUser() validates the token with the Supabase server every time.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // If the user is NOT logged in and is trying to access any page other than
  // the login page ("/") or the auth callback, redirect them to login.
  // Public routes that don't require a logged-in user session.
  // The alerts API route has its own auth (CRON_SECRET Bearer token) so it
  // doesn't need the Supabase session check.
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/api/alerts/')

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Return the response (which may contain refreshed session cookies)
  return supabaseResponse
}

// Tell Next.js which routes this middleware should run on.
// We exclude static files, images, and Next.js internals for performance.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
