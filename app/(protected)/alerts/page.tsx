// -----------------------------------------------------------------------------
// Alert Settings Page
// -----------------------------------------------------------------------------
// Lets admins configure low-stock email alerts for each inventory item.
// You can enable/disable alerts per item and set a custom threshold that
// overrides the item's default reorder point.
// -----------------------------------------------------------------------------

import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import AlertSettingsPanel from '@/components/dashboard/alert-settings-panel'

export const metadata = {
  title: 'Alert Settings — DL Inventory',
}

export default async function AlertsPage() {
  // Only admins can view this page
  await requireAdmin()

  // Create a Supabase client for server-side data fetching
  const supabase = await createClient()

  // Fetch all items and their current alert settings in parallel
  const [itemsResult, alertSettingsResult] = await Promise.all([
    // Items: need id, sku, name, reorder_point, and is_active
    supabase
      .from('items')
      .select('id, sku, name, reorder_point, is_active')
      .order('sku'),

    // Alert settings: per-item configuration for notification thresholds
    supabase
      .from('alert_settings')
      .select('id, item_id, alert_enabled, override_threshold'),
  ])

  const items = itemsResult.data ?? []
  const alertSettings = alertSettingsResult.data ?? []

  return (
    <div className="space-y-6">

      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Alert Settings</h2>
        <p className="text-slate-500 mt-1">
          Configure low-stock email alerts. Set a custom threshold per item or use its default reorder point.
        </p>
      </div>

      {/* Alert settings table — handles toggling and threshold editing */}
      <AlertSettingsPanel items={items} alertSettings={alertSettings} />

    </div>
  )
}
