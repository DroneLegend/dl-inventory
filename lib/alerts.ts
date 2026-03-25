// -----------------------------------------------------------------------------
// Alert System — Core Logic
// -----------------------------------------------------------------------------
// This module is the single source of truth for how low-stock alerts work.
// It's used by two callers:
//
//   1. The /api/alerts/check API route (called by Vercel cron at 1pm UTC daily)
//      → Checks ALL items and sends one email listing everything that's low.
//
//   2. The warehouse server actions (called after a consume transaction)
//      → Only checks the affected items, and only sends if an item JUST
//        crossed below its threshold (i.e., was above before this transaction).
//
// Deduplication: we never send an alert for the same item more than once per
// 24 hours. The last_alert_sent column on alert_settings tracks this.
// -----------------------------------------------------------------------------

import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'

// ---- Types ------------------------------------------------------------------

// Full alert data for one low-stock item (used to build the email)
export type AlertItem = {
  alertSettingsId: string   // the alert_settings row ID (for updating last_alert_sent)
  itemId: string
  sku: string
  name: string
  currentQty: number
  threshold: number         // the effective threshold (override or reorder_point)
  kitLimits: {              // for each kit this item is in, how many kits are still buildable
    kitName: string
    maxKits: number         // floor(currentQty / qtyPerKit) — could be 0
    qtyPerKit: number
  }[]
}

// Raw row shape from current_inventory view
type InventoryRow = {
  item_id: string
  sku: string
  name: string
  reorder_point: number
  quantity_on_hand: number
  is_active: boolean
}

// Raw row from alert_settings
type AlertSettingsRow = {
  id: string
  item_id: string
  alert_enabled: boolean
  override_threshold: number | null
  last_alert_sent: string | null
}

// Raw row from bom_items joined with kit_types
type BomRow = {
  item_id: string
  quantity_required: number
  kit_types: { name: string } | null
}

// ---- Main functions ---------------------------------------------------------

/**
 * getItemsToAlert()
 *
 * Fetches all items that should trigger an alert email right now.
 *
 * Rules:
 *   - Alert must be enabled for the item
 *   - Current stock must be at or below the effective threshold
 *   - No alert has been sent for this item in the past 24 hours
 *
 * @param supabase       A Supabase client (use the admin client for cron jobs)
 * @param onlyItemIds    Optional: limit check to specific item IDs (for transaction triggers)
 * @param crossingItems  Optional: map of itemId → previousQty. If provided, only items
 *                       that JUST crossed below their threshold are included.
 */
export async function getItemsToAlert(
  supabase: SupabaseClient,
  options?: {
    onlyItemIds?: string[]
    crossingItems?: Map<string, number>  // itemId → quantity BEFORE the transaction
  }
): Promise<AlertItem[]> {
  const { onlyItemIds, crossingItems } = options ?? {}

  // 1. Fetch current inventory for active items
  let inventoryQuery = supabase
    .from('current_inventory')
    .select('item_id, sku, name, reorder_point, quantity_on_hand, is_active')
    .eq('is_active', true)

  // If checking specific items only, filter to those
  if (onlyItemIds && onlyItemIds.length > 0) {
    inventoryQuery = inventoryQuery.in('item_id', onlyItemIds)
  }

  const { data: inventoryRows, error: invError } = await inventoryQuery
  if (invError) throw new Error(`Failed to fetch inventory: ${invError.message}`)
  if (!inventoryRows || inventoryRows.length === 0) return []

  // 2. Fetch alert settings for the relevant items
  const itemIds = inventoryRows.map((r: InventoryRow) => r.item_id)
  const { data: alertSettings, error: alertError } = await supabase
    .from('alert_settings')
    .select('id, item_id, alert_enabled, override_threshold, last_alert_sent')
    .in('item_id', itemIds)
  if (alertError) throw new Error(`Failed to fetch alert settings: ${alertError.message}`)

  // Build a map for quick lookup: item_id → alert settings row
  const settingsMap = new Map<string, AlertSettingsRow>(
    (alertSettings ?? []).map((s: AlertSettingsRow) => [s.item_id, s])
  )

  // 3. Filter to items that should receive an alert
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const qualifying = (inventoryRows as InventoryRow[]).filter((item) => {
    const settings = settingsMap.get(item.item_id)

    // Skip if no alert settings row or alerts are disabled
    if (!settings || !settings.alert_enabled) return false

    // Determine the effective threshold (custom override, or the item's reorder_point)
    const threshold =
      settings.override_threshold !== null ? settings.override_threshold : item.reorder_point

    // Skip if stock is above threshold (no alert needed)
    if (item.quantity_on_hand > threshold) return false

    // Deduplication: skip if we already sent an alert in the last 24 hours
    if (settings.last_alert_sent) {
      const lastSent = new Date(settings.last_alert_sent)
      if (lastSent > twentyFourHoursAgo) return false
    }

    // "Crossing" check: if crossingItems is provided, only include items
    // that JUST crossed below threshold in this transaction
    if (crossingItems) {
      const prevQty = crossingItems.get(item.item_id)
      if (prevQty === undefined) return false       // item wasn't in this transaction
      if (prevQty <= threshold) return false         // was already below threshold before
      // If we get here: prevQty > threshold AND currentQty <= threshold → just crossed!
    }

    return true
  })

  if (qualifying.length === 0) return []

  // 4. Fetch BOM data to calculate kit limits for each qualifying item
  const qualifyingIds = qualifying.map((i: InventoryRow) => i.item_id)
  const { data: bomRows, error: bomError } = await supabase
    .from('bom_items')
    .select('item_id, quantity_required, kit_types(name)')
    .in('item_id', qualifyingIds)
  if (bomError) throw new Error(`Failed to fetch BOM data: ${bomError.message}`)

  // Group BOM entries by item_id
  const bomByItem = new Map<string, BomRow[]>()
  for (const row of (bomRows ?? []) as unknown as BomRow[]) {
    const existing = bomByItem.get(row.item_id) ?? []
    bomByItem.set(row.item_id, [...existing, row])
  }

  // 5. Build the final AlertItem array
  return qualifying.map((item: InventoryRow) => {
    const settings = settingsMap.get(item.item_id)!
    const threshold =
      settings.override_threshold !== null ? settings.override_threshold : item.reorder_point

    // Calculate kit limits: for each kit this item appears in,
    // how many complete kits could be built with the current stock?
    const boms = bomByItem.get(item.item_id) ?? []
    const kitLimits = boms
      .filter((b) => b.kit_types)
      .map((b) => ({
        kitName: b.kit_types!.name,
        qtyPerKit: b.quantity_required,
        maxKits: Math.floor(item.quantity_on_hand / b.quantity_required),
      }))

    return {
      alertSettingsId: settings.id,
      itemId: item.item_id,
      sku: item.sku,
      name: item.name,
      currentQty: item.quantity_on_hand,
      threshold,
      kitLimits,
    }
  })
}

/**
 * markAlertsSent()
 *
 * Updates last_alert_sent = now() for the given alert_settings rows.
 * Call this AFTER successfully sending the email.
 */
export async function markAlertsSent(
  supabase: SupabaseClient,
  alertSettingsIds: string[]
): Promise<void> {
  if (alertSettingsIds.length === 0) return

  const { error } = await supabase
    .from('alert_settings')
    .update({ last_alert_sent: new Date().toISOString() })
    .in('id', alertSettingsIds)

  if (error) throw new Error(`Failed to mark alerts sent: ${error.message}`)
}

/**
 * sendAlertEmail()
 *
 * Composes and sends the low-stock alert email via Resend.
 * Returns the Resend message ID on success.
 */
export async function sendAlertEmail(items: AlertItem[]): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.ALERT_FROM_EMAIL
  const toEmail = process.env.ALERT_TO_EMAIL

  if (!apiKey || !fromEmail || !toEmail) {
    throw new Error(
      'Missing email environment variables: RESEND_API_KEY, ALERT_FROM_EMAIL, ALERT_TO_EMAIL'
    )
  }

  const resend = new Resend(apiKey)

  const subject =
    items.length === 1
      ? `⚠️ Low Stock: ${items[0].name} — DL Inventory`
      : `⚠️ Low Stock Alert: ${items.length} items need attention — DL Inventory`

  const html = buildEmailHtml(items)
  const text = buildEmailText(items)

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    subject,
    html,
    text,
  })

  if (error) throw new Error(`Resend error: ${error.message}`)
  return data?.id ?? 'unknown'
}

// ---- Email HTML builder -----------------------------------------------------

function buildEmailHtml(items: AlertItem[]): string {
  const rows = items
    .map((item) => {
      // Kit limits section — shows "X STEM Fundamentals kits" per kit type
      const kitLimitLines =
        item.kitLimits.length > 0
          ? item.kitLimits
              .map(
                (k) =>
                  `<span style="display:block; color:${k.maxKits === 0 ? '#dc2626' : '#b45309'}">
                    ${k.maxKits === 0 ? '0' : k.maxKits} × ${k.kitName}
                    <span style="color:#94a3b8;font-size:12px">(needs ${k.qtyPerKit}/kit)</span>
                  </span>`
              )
              .join('')
          : '<span style="color:#94a3b8">Not in any kit BOM</span>'

      const qtyColor = item.currentQty <= 0 ? '#dc2626' : '#b45309'

      return `
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:14px 16px; font-family:monospace; font-size:13px; color:#64748b; white-space:nowrap">
            ${item.sku}
          </td>
          <td style="padding:14px 16px; font-weight:600; color:#1e293b">
            ${item.name}
          </td>
          <td style="padding:14px 16px; text-align:center; font-weight:700; font-size:18px; color:${qtyColor}; white-space:nowrap">
            ${item.currentQty}
          </td>
          <td style="padding:14px 16px; text-align:center; color:#64748b; white-space:nowrap">
            ${item.threshold}
          </td>
          <td style="padding:14px 16px; font-size:13px; line-height:1.6">
            ${kitLimitLines}
          </td>
        </tr>`
    })
    .join('')

  const now = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0; padding:0; background:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">

      <div style="max-width:700px; margin:32px auto; background:#ffffff; border-radius:12px;
                  border:1px solid #e2e8f0; overflow:hidden">

        <!-- Header -->
        <div style="background:#1B2A4A; padding:24px 32px">
          <div style="display:flex; align-items:center; gap:12px">
            <div style="width:4px; height:32px; background:#F5A623; border-radius:2px; flex-shrink:0"></div>
            <div>
              <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700">
                ⚠️ Low Stock Alert
              </h1>
              <p style="margin:4px 0 0; color:#94a3b8; font-size:13px">
                Drone Legends Inventory System · ${now}
              </p>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div style="padding:24px 32px">

          <p style="margin:0 0 20px; color:#475569; font-size:15px">
            The following ${items.length === 1 ? 'item is' : `${items.length} items are`}
            currently at or below the reorder threshold and may need to be restocked.
          </p>

          <!-- Table -->
          <div style="border-radius:8px; border:1px solid #e2e8f0; overflow:hidden">
            <table style="width:100%; border-collapse:collapse">
              <thead>
                <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0">
                  <th style="padding:10px 16px; text-align:left; font-size:11px; font-weight:600;
                             color:#64748b; text-transform:uppercase; letter-spacing:0.05em">
                    SKU
                  </th>
                  <th style="padding:10px 16px; text-align:left; font-size:11px; font-weight:600;
                             color:#64748b; text-transform:uppercase; letter-spacing:0.05em">
                    Item
                  </th>
                  <th style="padding:10px 16px; text-align:center; font-size:11px; font-weight:600;
                             color:#64748b; text-transform:uppercase; letter-spacing:0.05em">
                    On Hand
                  </th>
                  <th style="padding:10px 16px; text-align:center; font-size:11px; font-weight:600;
                             color:#64748b; text-transform:uppercase; letter-spacing:0.05em">
                    Threshold
                  </th>
                  <th style="padding:10px 16px; text-align:left; font-size:11px; font-weight:600;
                             color:#64748b; text-transform:uppercase; letter-spacing:0.05em">
                    Kits Still Buildable
                  </th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>

          <!-- Footer note -->
          <p style="margin:20px 0 0; color:#94a3b8; font-size:13px">
            This alert is sent at most once per 24 hours per item.
            Manage alert thresholds in the Admin Dashboard → Alert Settings.
          </p>

        </div>
      </div>
    </body>
    </html>`
}

// Plain-text fallback for email clients that don't render HTML
function buildEmailText(items: AlertItem[]): string {
  const lines: string[] = [
    'LOW STOCK ALERT — Drone Legends Inventory',
    '==========================================',
    '',
    'The following items are at or below their reorder threshold:',
    '',
  ]

  for (const item of items) {
    lines.push(`${item.sku} — ${item.name}`)
    lines.push(`  On hand: ${item.currentQty}  |  Threshold: ${item.threshold}`)

    if (item.kitLimits.length > 0) {
      for (const k of item.kitLimits) {
        lines.push(`  Kits buildable: ${k.maxKits} × ${k.kitName} (needs ${k.qtyPerKit}/kit)`)
      }
    }
    lines.push('')
  }

  lines.push('Manage thresholds: Admin Dashboard → Alert Settings')

  return lines.join('\n')
}
