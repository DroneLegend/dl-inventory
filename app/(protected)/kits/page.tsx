// -----------------------------------------------------------------------------
// Kit Types Page
// -----------------------------------------------------------------------------
// Lets admins manage the kit types — templates that define what items are
// needed to build each kind of kit. Admins can add, edit, and deactivate
// kit types from this page.
// -----------------------------------------------------------------------------

import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import KitManager from '@/components/admin/kit-manager'

export const metadata = {
  title: 'Kit Types — DL Inventory',
}

export default async function KitsPage() {
  // Only admins can view this page
  await requireAdmin()

  // Create a Supabase client for server-side data fetching
  const supabase = await createClient()

  // Fetch all kit types
  const { data: kitTypes } = await supabase
    .from('kit_types')
    .select('id, name, description, is_active')
    .order('name')

  // Fetch a count of BOM items per kit type.
  // bom_items.kit_type_id links each BOM row to its kit type.
  const { data: bomCounts } = await supabase
    .from('bom_items')
    .select('kit_type_id')

  // Build a map of kit_type_id → item count for quick lookup
  const countMap = new Map<string, number>()
  for (const row of bomCounts ?? []) {
    countMap.set(row.kit_type_id, (countMap.get(row.kit_type_id) ?? 0) + 1)
  }

  // Attach the BOM item count to each kit type
  const kitsWithCounts = (kitTypes ?? []).map((kit) => ({
    ...kit,
    bom_item_count: countMap.get(kit.id) ?? 0,
  }))

  return (
    <div className="space-y-6">

      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Kit Types</h2>
        <p className="text-slate-500 mt-1">
          Manage kit templates. Each kit type has a bill of materials you can edit in the Dashboard.
        </p>
      </div>

      {/* Kit management table with add/edit/toggle functionality */}
      <KitManager kitTypes={kitsWithCounts} />

    </div>
  )
}
