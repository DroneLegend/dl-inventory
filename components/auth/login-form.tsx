'use client'

// -----------------------------------------------------------------------------
// Login Form Component
// -----------------------------------------------------------------------------
// This is a CLIENT component — it runs in the browser and handles form state,
// user input, and the actual login request to Supabase Auth.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginForm() {
  const router = useRouter()
  const supabase = createClient()

  // Form field values
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault() // prevent the page from refreshing on submit
    setLoading(true)
    setError(null)

    // Log the Supabase URL so we can confirm the env vars are loaded
    // (the anon key is intentionally not logged in full for security)
    console.log('[Login] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('[Login] Anon key present:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    console.log('[Login] Attempting sign-in for:', email)

    // Attempt to sign in with email and password
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // Log the full Supabase response so we can see exactly what went wrong
    console.log('[Login] signInWithPassword result:', {
      user: data?.user?.email ?? null,
      errorMessage: signInError?.message ?? null,
      errorStatus: signInError?.status ?? null,
      errorCode: (signInError as unknown as { code?: string })?.code ?? null,
    })

    if (signInError || !data.user) {
      // Show the actual Supabase error message on screen (helpful for debugging)
      setError(signInError?.message ?? 'Sign-in failed — no user returned.')
      setLoading(false)
      return
    }

    console.log('[Login] Sign-in succeeded. Fetching profile for user:', data.user.id)

    // Login succeeded — now fetch the user's role from the profiles table
    // so we can redirect them to the right part of the app
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    console.log('[Login] Profile fetch result:', {
      role: profile?.role ?? null,
      errorMessage: profileError?.message ?? null,
      errorCode: profileError?.code ?? null,
    })

    if (profileError || !profile) {
      setError(`Profile load failed: ${profileError?.message ?? 'No profile row found for this user.'}`)
      setLoading(false)
      return
    }

    // Redirect based on role
    console.log('[Login] Redirecting to:', profile.role === 'admin' ? '/dashboard' : '/warehouse')
    if (profile.role === 'admin') {
      router.push('/dashboard')
    } else {
      router.push('/warehouse')
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5">

      {/* Email field */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-slate-200 text-sm font-medium">
          Email address
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="bg-white/10 border-white/20 text-white placeholder:text-slate-400
                     focus:border-brand-orange focus:ring-brand-orange"
        />
      </div>

      {/* Password field */}
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-slate-200 text-sm font-medium">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="bg-white/10 border-white/20 text-white placeholder:text-slate-400
                     focus:border-brand-orange focus:ring-brand-orange"
        />
      </div>

      {/* Error message — only shows when there's an error */}
      {error && (
        <div className="rounded-md bg-red-500/20 border border-red-500/40 px-4 py-3">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-orange hover:bg-amber-500 text-white font-semibold
                   h-11 text-base transition-colors disabled:opacity-60"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>

    </form>
  )
}
