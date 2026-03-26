'use client'

// -----------------------------------------------------------------------------
// Global Error Boundary
// -----------------------------------------------------------------------------
// Catches unhandled errors in the app and shows a recovery UI.
// Must be a client component because it uses useEffect and onClick handlers.
// -----------------------------------------------------------------------------

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-xl font-semibold text-slate-800">Something went wrong</h2>
        <p className="text-sm text-slate-500">
          An unexpected error occurred. You can try again or go back to the dashboard.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-brand-navy text-white text-sm font-medium
                       hover:bg-brand-navy/90 transition-colors"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium
                       text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
