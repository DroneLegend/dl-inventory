// -----------------------------------------------------------------------------
// Warehouse Page
// -----------------------------------------------------------------------------
// The main interface for warehouse staff (and admins) to log inventory movements.
// This is a SERVER component — it fetches all the data upfront, then hands it
// to the client-side WarehouseUI component which handles all interactivity.
// -----------------------------------------------------------------------------

import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import WarehouseUI from '@/components/warehouse/warehouse-ui'

export const metadata = {
  title: 'Warehouse — DL Inventory',
}

export default async function WarehousePage() {
  // requireAuth() verifies the user is logged in (any role can access this page)
  const profile = await requireAuth()

  const supabase = await createClient()

  // Fetch everything needed for the warehouse interface, all at once
  const [itemsResult, kitTypesResult, bomItemsResult, inventoryResult] = await Promise.all([

    // All active items — used by the item search dropdowns
    supabase
      .from('items')
      .select('id, sku, name, unit_of_measure')
      .eq('is_active', true)
      .order('sku'),

    // Active kit types — for the Ship Kits dropdown
    supabase
      .from('kit_types')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),

    // BOM items joined with item details — for the Ship Kits form
    supabase
      .from('bom_items')
      .select('kit_type_id, item_id, quantity_required, items(sku, name, unit_of_measure)'),

    // Current inventory from the view — for Stock Levels and quantity checks
    supabase
      .from('current_inventory')
      .select('item_id, sku, name, unit_of_measure, reorder_point, quantity_on_hand, is_low_stock, is_active'),
  ])

  const items     = itemsResult.data     ?? []
  const kitTypes  = kitTypesResult.data  ?? []
  const bomItems  = bomItemsResult.data  ?? []
  const inventory = inventoryResult.data ?? []

  return (
    <div className="space-y-6">

      {/* Page heading — personalised with the user's name */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          {profile.full_name
            ? `Hi ${profile.full_name.split(' ')[0]} 👋`
            : 'Warehouse'}
        </h2>
        <p className="text-slate-500 mt-1">
          Use the buttons below to log deliveries, shipments, and check stock levels.
        </p>
      </div>

      {/* Main warehouse interface — client component handles all interactivity */}
      <WarehouseUI
        items={items as unknown as Parameters<typeof WarehouseUI>[0]['items']}
        kitTypes={kitTypes}
        bomItems={bomItems as unknown as Parameters<typeof WarehouseUI>[0]['bomItems']}
        inventory={inventory as unknown as Parameters<typeof WarehouseUI>[0]['inventory']}
      />

    </div>
  )
}
