// -----------------------------------------------------------------------------
// Inventory Page (Admin View)
// -----------------------------------------------------------------------------
// A read-only overview of all inventory stock levels.
// Admins can see every item's current on-hand quantity, reorder point,
// and whether it's low on stock. Click any row to see transaction history.
// -----------------------------------------------------------------------------

import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import InventoryOverview from '@/components/dashboard/inventory-overview'

export const metadata = {
  title: 'Inventory — DL Inventory',
}

export default async function InventoryPage() {
  // Only admins can view this page; redirects warehouse users to /warehouse
  await requireAdmin()

  // Create a Supabase client for server-side data fetching
  const supabase = await createClient()

  // Fetch current inventory from the database view.
  // The current_inventory VIEW automatically calculates quantity_on_hand
  // by summing all transactions for each item.
  const { data: inventory } = await supabase
    .from('current_inventory')
    .select('item_id, sku, name, description, unit_of_measure, reorder_point, is_active, quantity_on_hand, is_low_stock')
    .order('sku')

  return (
    <div className="space-y-6">

      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Inventory</h2>
        <p className="text-slate-500 mt-1">
          Current stock levels for all items. Click any row to see transaction history.
        </p>
      </div>

      {/* Inventory table — handles search, filtering, and row expansion */}
      <InventoryOverview inventory={inventory ?? []} />

    </div>
  )
}
