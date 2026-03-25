// -----------------------------------------------------------------------------
// Protected Layout
// -----------------------------------------------------------------------------
// This layout wraps ALL pages inside the (protected) route group.
// It fetches the current user's profile and renders the sidebar + header.
// Any page inside app/(protected)/ automatically gets this layout.

import { requireAuth } from '@/lib/auth'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'

// Props include children (the actual page content) and params for the route.
// We also accept a headerTitle prop so each page can set its own title.
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // requireAuth() gets the user's profile from the database.
  // If the user isn't logged in, it automatically redirects them to "/".
  const profile = await requireAuth()

  return (
    // Full-screen flex row: sidebar on the left, content on the right
    <div className="flex min-h-screen bg-slate-50">

      {/* Sidebar — fixed width, full height, navy background */}
      <Sidebar profile={profile} />

      {/* Main content area — takes up all remaining horizontal space */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header — fixed at the top of the content area.
            We pass a default title here; individual pages can override this
            by adding their own header if needed. */}
        <Header title="DL Inventory" />

        {/* Page content — each page fills this area */}
        <main className="flex-1 p-6">
          {children}
        </main>

      </div>
    </div>
  )
}
