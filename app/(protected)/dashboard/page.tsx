// -----------------------------------------------------------------------------
// Admin Dashboard Page
// -----------------------------------------------------------------------------
// This is a SERVER component — it runs on the server, fetches all the data
// from the database, and passes it down to the client-side tab components.
//
// The admin dashboard has five sections:
//   1. Kit Fulfillment Calculator (default view)
//   2. BOM Manager
//   3. Item Manager
//   4. Inventory Overview
//   5. Alert Settings
// -----------------------------------------------------------------------------

import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import DashboardTabs from '@/components/dashboard/dashboard-tabs'

export const metadata = {
  title: 'Dashboard — DL Inventory',
}

export default async function DashboardPage() {
  // Verify the user is an admin (redirects to /warehouse if not)
  await requireAdmin()

  // Create a Supabase client for server-side data fetching
  const supabase = await createClient()

  // -------------------------------------------------------------------------
  // Fetch all data needed by every dashboard tab in parallel.
  // Using Promise.all runs all queries simultaneously for faster page loads.
  // -------------------------------------------------------------------------
  const [
    kitTypesResult,
    bomItemsResult,
    inventoryResult,
    allItemsResult,
    alertSettingsResult,
  ] = await Promise.all([

    // 1. All kit types (active and inactive — BOM Manager needs inactive ones too)
    supabase
      .from('kit_types')
      .select('id, name, description, is_active')
      .order('name'),

    // 2. All BOM items, joined with their item details
    //    This tells us: for each kit, which items are needed and how many
    supabase
      .from('bom_items')
      .select('id, kit_type_id, item_id, quantity_required, items(sku, name, description, unit_of_measure)'),

    // 3. Current inventory from the view (calculates live stock levels)
    //    This is a database VIEW that sums all transactions per item
    supabase
      .from('current_inventory')
      .select('item_id, sku, name, description, unit_of_measure, reorder_point, is_active, quantity_on_hand, is_low_stock'),

    // 4. All items (for Item Manager — includes inactive items)
    supabase
      .from('items')
      .select('id, sku, name, description, unit_of_measure, reorder_point, is_active')
      .order('sku'),

    // 5. Alert settings for all items
    supabase
      .from('alert_settings')
      .select('id, item_id, alert_enabled, override_threshold'),
  ])

  // Use empty arrays as fallback if any query fails (prevents crashes)
  const kitTypes     = kitTypesResult.data     ?? []
  const bomItems     = bomItemsResult.data      ?? []
  const inventory    = inventoryResult.data     ?? []
  const allItems     = allItemsResult.data      ?? []
  const alertSettings = alertSettingsResult.data ?? []

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">

      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Admin Dashboard</h2>
        <p className="text-slate-500 mt-1">
          Manage inventory, kits, and alerts.
        </p>
      </div>

      {/* Tab layout — client component handles tab switching and all interactivity.
          We cast through 'unknown' because TypeScript can't fully infer the shape
          of Supabase joined queries — the database schema guarantees correctness. */}
      <DashboardTabs
        kitTypes={kitTypes as unknown as Parameters<typeof DashboardTabs>[0]['kitTypes']}
        bomItems={bomItems as unknown as Parameters<typeof DashboardTabs>[0]['bomItems']}
        inventory={inventory as unknown as Parameters<typeof DashboardTabs>[0]['inventory']}
        allItems={allItems as unknown as Parameters<typeof DashboardTabs>[0]['allItems']}
        alertSettings={alertSettings as unknown as Parameters<typeof DashboardTabs>[0]['alertSettings']}
      />

    </div>
  )
}
