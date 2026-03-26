// -----------------------------------------------------------------------------
// 404 Not Found Page
// -----------------------------------------------------------------------------
// Shown when a user navigates to a route that doesn't exist.
// -----------------------------------------------------------------------------

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-xl font-semibold text-slate-800">Page Not Found</h2>
        <p className="text-sm text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <a
          href="/dashboard"
          className="inline-block px-4 py-2 rounded-lg bg-brand-navy text-white text-sm font-medium
                     hover:bg-brand-navy/90 transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}
