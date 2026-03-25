// -----------------------------------------------------------------------------
// Login Page (Root Route)
// -----------------------------------------------------------------------------
// This is the entry point of the app. It shows the login form.
// If the user is already logged in, they get redirected to the right page
// based on their role (admin → /dashboard, warehouse → /warehouse).

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from '@/components/auth/login-form'

export const metadata = {
  title: 'Sign In — DL Inventory',
}

export default async function LoginPage() {
  const supabase = await createClient()

  // Check if there's already a logged-in user
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // User is already logged in — look up their role and redirect
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin') {
      redirect('/dashboard')
    } else {
      redirect('/warehouse')
    }
  }

  // No logged-in user — show the login page
  return (
    // Full-screen navy background
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4">

      {/* Centered login card */}
      <div className="w-full max-w-md">

        {/* Drone Legends branding */}
        <div className="text-center mb-8">
          {/* Decorative accent bars above the logo */}
          <div className="inline-flex flex-col items-center gap-2 mb-2">
            <div className="w-12 h-1.5 rounded-full bg-brand-orange" />
            <div className="w-8 h-1.5 rounded-full bg-brand-orange opacity-60" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mt-3">
            Drone Legends
          </h1>
          <p className="text-slate-400 text-sm mt-1 tracking-widest uppercase">
            Inventory System
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <h2 className="text-white text-xl font-semibold mb-6">
            Sign in to your account
          </h2>

          {/* LoginForm is a client component that handles the actual login logic */}
          <LoginForm />
        </div>

        {/* Footer note */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Access is restricted to authorized Drone Legends staff.
        </p>

      </div>
    </div>
  )
}
