// -----------------------------------------------------------------------------
// API Route: POST /api/alerts/check
// -----------------------------------------------------------------------------
// Checks all inventory items against their alert thresholds and sends a
// low-stock email if any items are below threshold (with 24h deduplication).
//
// This endpoint is called by:
//   1. Vercel Cron — every day at 1:00 PM UTC (8:00 AM EST)
//      Vercel automatically sends: Authorization: Bearer <CRON_SECRET>
//   2. Our own server code — can call it the same way using the CRON_SECRET
//
// Security: requests without the correct Bearer token are rejected with 401.
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getItemsToAlert, markAlertsSent, sendAlertEmail } from '@/lib/alerts'

export async function POST(request: NextRequest) {
  // ---- 1. Verify the request is authorized ----------------------------------

  const cronSecret = process.env.CRON_SECRET

  // In production, always require the secret.
  // In development (no secret configured), allow through for easier testing.
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (token !== cronSecret) {
      console.warn('[Alerts] Unauthorized request — invalid CRON_SECRET')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // ---- 2. Run the alert check -----------------------------------------------

  try {
    // Use the admin client so we can read all data and update last_alert_sent
    // without needing a user session (cron jobs have no auth context)
    const supabase = createAdminClient()

    console.log('[Alerts] Starting daily alert check…')

    // Find all items that are currently below threshold and haven't been
    // alerted in the past 24 hours
    const itemsToAlert = await getItemsToAlert(supabase)

    if (itemsToAlert.length === 0) {
      console.log('[Alerts] No items to alert — all stock levels OK (or recently alerted).')
      return NextResponse.json({
        success: true,
        message: 'No alerts needed.',
        alertsSent: 0,
      })
    }

    console.log(`[Alerts] Found ${itemsToAlert.length} item(s) to alert.`)

    // ---- 3. Send the email ---------------------------------------------------

    const emailId = await sendAlertEmail(itemsToAlert)
    console.log(`[Alerts] Email sent via Resend. Message ID: ${emailId}`)

    // ---- 4. Mark items as alerted so we don't re-alert within 24 hours ------

    const alertSettingsIds = itemsToAlert.map((i) => i.alertSettingsId)
    await markAlertsSent(supabase, alertSettingsIds)
    console.log(`[Alerts] Marked ${alertSettingsIds.length} item(s) as alerted.`)

    // ---- 5. Return success ---------------------------------------------------

    return NextResponse.json({
      success: true,
      message: `Alert email sent for ${itemsToAlert.length} item(s).`,
      alertsSent: itemsToAlert.length,
      items: itemsToAlert.map((i) => ({ sku: i.sku, name: i.name, qty: i.currentQty })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Alerts] Alert check failed:', message)

    return NextResponse.json(
      { error: 'Alert check failed.', details: message },
      { status: 500 }
    )
  }
}

// Also support GET for easy manual testing in the browser
// (still requires the CRON_SECRET in the Authorization header)
export async function GET(request: NextRequest) {
  return POST(request)
}
