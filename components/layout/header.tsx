'use client'

// -----------------------------------------------------------------------------
// Header Component
// -----------------------------------------------------------------------------
// The top bar shown on all protected pages.
// Shows the current page title and a logout button.

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

type HeaderProps = {
  title: string // The page title shown in the header (e.g. "Dashboard", "Inventory")
}

export default function Header({ title }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    // Sign out of Supabase — this clears the session cookie
    await supabase.auth.signOut()

    // After signing out, send the user back to the login page
    router.push('/')

    // router.refresh() tells Next.js to re-run server components,
    // ensuring no cached data from the previous session is shown
    router.refresh()
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center
                        justify-between px-6 shrink-0">

      {/* Page title */}
      <h1 className="text-slate-800 font-semibold text-lg">
        {title}
      </h1>

      {/* Right side: logout button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 gap-2"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>

    </header>
  )
}
