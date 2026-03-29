'use server'

// -----------------------------------------------------------------------------
// Warehouse Server Actions
// -----------------------------------------------------------------------------
// These functions run on the server and handle all inventory movements.
// They're called directly from the warehouse form components.
//
// After any consume transaction, we run a "threshold crossing" check:
// if an item's stock just dropped below its alert threshold for the first time
// (and hasn't been alerted in the past 24 hours), we send an alert email.
// -----------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getItemsToAlert, markAlertsSent, sendAlertEmail } from '@/lib/alerts'


// =============================================================================
// RECEIVE INVENTORY
// =============================================================================
// Records stock arriving — a purchase delivery, a return from the field, etc.
// Creates a 'receive' transaction with a positive quantity.
// No alert check needed here — receiving stock can't push anything below threshold.

export async function receiveInventory(data: {
  itemId: string
  quantity: number
  reference: string
  notes: string
}): Promise<{ transactionId: string | null; error: string | null }> {
  const profile = await requireAuth()
  const supabase = await createClient()

  const fullNotes = [
    data.reference.trim() ? `Ref: ${data.reference.trim()}` : null,
    data.notes.trim() || null,
  ]
    .filter(Boolean)
    .join(' | ') || null

  const { data: result, error } = await supabase
    .from('inventory_transactions')
    .insert({
      item_id: data.itemId,
      transaction_type: 'receive',
      quantity: data.quantity,
      notes: fullNotes,
      created_by: profile.id,
    })
    .select('id')
    .single()

  if (error) return { transactionId: null, error: error.message }

  revalidatePath('/warehouse')
  return { transactionId: result.id, error: null }
}


// =============================================================================
// BATCH RECEIVE INVENTORY
// =============================================================================
// Records multiple physical items arriving at once — one transaction per item.
// Used by the "Digital Worksheet" batch receive mode where staff enter
// quantities for many items at once and hit one big save button.

export async function batchReceiveInventory(data: {
  entries: { itemId: string; quantity: number }[]
  notes: string
}): Promise<{ error: string | null }> {
  const profile = await requireAuth()
  const supabase = await createClient()

  // Build one transaction per item that has a quantity > 0
  const transactions = data.entries
    .filter((e) => e.quantity > 0)
    .map((e) => ({
      item_id: e.itemId,
      transaction_type: 'receive' as const,
      quantity: e.quantity,
      notes: data.notes.trim() || null,
      created_by: profile.id,
    }))

  if (transactions.length === 0) {
    return { error: 'No items have a quantity entered.' }
  }

  const { error } = await supabase
    .from('inventory_transactions')
    .insert(transactions)

  if (error) return { error: error.message }

  revalidatePath('/warehouse')
  return { error: null }
}


// =============================================================================
// UNDO A TRANSACTION
// =============================================================================
// Deletes a specific transaction — used by the 30-second undo button.
// Only allows deleting transactions that belong to the current user and
// were created within the last 5 minutes (safety check beyond the UI timer).

export async function undoTransaction(transactionId: string): Promise<{ error: string | null }> {
  const profile = await requireAuth()
  const supabase = await createClient()

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { error } = await supabase
    .from('inventory_transactions')
    .delete()
    .eq('id', transactionId)
    .eq('created_by', profile.id)
    .gte('created_at', fiveMinutesAgo)

  if (error) return { error: error.message }

  revalidatePath('/warehouse')
  return { error: null }
}


// =============================================================================
// SHIP KITS
// =============================================================================
// Records the shipment of a number of complete kits.
// Creates one 'consume' transaction for EACH component item in the BOM.
// After inserting, checks whether any item just crossed below its threshold.

export async function shipKits(data: {
  kitTypeId: string
  kitName: string
  numKits: number
  notes: string
}): Promise<{ error: string | null }> {
  const profile = await requireAuth()
  const supabase = await createClient()

  // 1. Fetch BOM for this kit type
  const { data: bomItems, error: bomError } = await supabase
    .from('bom_items')
    .select('item_id, quantity_required')
    .eq('kit_type_id', data.kitTypeId)

  if (bomError) return { error: bomError.message }
  if (!bomItems || bomItems.length === 0) {
    return { error: 'This kit has no items in its bill of materials.' }
  }

  // 2. Snapshot current stock BEFORE the transaction
  //    (needed to detect which items just crossed below threshold)
  const itemIds = bomItems.map((b) => b.item_id)
  const { data: preInventory } = await supabase
    .from('current_inventory')
    .select('item_id, quantity_on_hand')
    .in('item_id', itemIds)

  // Map of itemId → quantity BEFORE this transaction
  const prevQtyMap = new Map<string, number>(
    (preInventory ?? []).map((r) => [r.item_id, r.quantity_on_hand])
  )

  // 3. Build and insert all transactions
  const fullNotes = [
    `Kit shipment: ${data.numKits}× ${data.kitName}`,
    data.notes.trim() || null,
  ]
    .filter(Boolean)
    .join(' | ')

  const transactions = bomItems.map((bom) => ({
    item_id: bom.item_id,
    transaction_type: 'consume' as const,
    quantity: -(bom.quantity_required * data.numKits),
    notes: fullNotes,
    created_by: profile.id,
  }))

  const { error: insertError } = await supabase
    .from('inventory_transactions')
    .insert(transactions)

  if (insertError) return { error: insertError.message }

  revalidatePath('/warehouse')

  // 4. Check for threshold crossings (fire-and-forget — don't fail the action if alerts fail)
  fireThresholdCheck(itemIds, prevQtyMap).catch((err) => {
    console.error('[Alerts] Threshold check failed after shipKits:', err)
  })

  return { error: null }
}


// =============================================================================
// SHIP KIT (PARTIAL) — accepts custom quantities per item
// =============================================================================
// Like shipKits, but each BOM item can have a different quantity (for partial
// shipments when staff don't have enough of every item).

export async function shipKitPartial(data: {
  kitTypeId: string
  kitName: string
  numKits: number
  items: { itemId: string; quantity: number }[]
  notes: string
}): Promise<{ error: string | null }> {
  const profile = await requireAuth()
  const supabase = await createClient()

  // Filter to only items with quantity > 0
  const entries = data.items.filter((e) => e.quantity > 0)
  if (entries.length === 0) {
    return { error: 'No items have a quantity to ship.' }
  }

  // Snapshot current stock BEFORE the transaction
  const itemIds = entries.map((e) => e.itemId)
  const { data: preInventory } = await supabase
    .from('current_inventory')
    .select('item_id, quantity_on_hand')
    .in('item_id', itemIds)

  const prevQtyMap = new Map<string, number>(
    (preInventory ?? []).map((r) => [r.item_id, r.quantity_on_hand])
  )

  const fullNotes = [
    `Kit shipment: ${data.numKits}× ${data.kitName}`,
    data.notes.trim() || null,
  ]
    .filter(Boolean)
    .join(' | ')

  // Build transactions with the custom quantities from the pick-list
  const transactions = entries.map((e) => ({
    item_id: e.itemId,
    transaction_type: 'consume' as const,
    quantity: -e.quantity,
    notes: fullNotes,
    created_by: profile.id,
  }))

  const { error: insertError } = await supabase
    .from('inventory_transactions')
    .insert(transactions)

  if (insertError) return { error: insertError.message }

  revalidatePath('/warehouse')

  fireThresholdCheck(itemIds, prevQtyMap).catch((err) => {
    console.error('[Alerts] Threshold check failed after shipKitPartial:', err)
  })

  return { error: null }
}


// =============================================================================
// SHIP INDIVIDUAL ITEM
// =============================================================================
// Records the shipment of a single item (not a full kit).
// After inserting, checks whether this item just crossed below its threshold.

export async function shipIndividualItem(data: {
  itemId: string
  quantity: number
  reference: string
  notes: string
}): Promise<{ transactionId: string | null; error: string | null }> {
  const profile = await requireAuth()
  const supabase = await createClient()

  // Snapshot current stock BEFORE the transaction
  const { data: preInventory } = await supabase
    .from('current_inventory')
    .select('quantity_on_hand')
    .eq('item_id', data.itemId)
    .single()

  const prevQtyMap = new Map([[data.itemId, preInventory?.quantity_on_hand ?? 0]])

  // Build notes string
  const fullNotes = [
    data.reference.trim() ? `Ref: ${data.reference.trim()}` : null,
    data.notes.trim() || null,
  ]
    .filter(Boolean)
    .join(' | ') || null

  const { data: result, error } = await supabase
    .from('inventory_transactions')
    .insert({
      item_id: data.itemId,
      transaction_type: 'consume',
      quantity: -data.quantity,
      notes: fullNotes,
      created_by: profile.id,
    })
    .select('id')
    .single()

  if (error) return { transactionId: null, error: error.message }

  revalidatePath('/warehouse')

  // Check for threshold crossing (fire-and-forget)
  fireThresholdCheck([data.itemId], prevQtyMap).catch((err) => {
    console.error('[Alerts] Threshold check failed after shipIndividualItem:', err)
  })

  return { transactionId: result.id, error: null }
}


// =============================================================================
// THRESHOLD CROSSING CHECK (internal helper)
// =============================================================================
// Called after consume transactions. Sends an alert if any affected item just
// dropped below its reorder threshold for the first time (since last alert).
//
// Uses the admin client so it can update last_alert_sent regardless of RLS.

async function fireThresholdCheck(
  itemIds: string[],
  prevQtyMap: Map<string, number>
): Promise<void> {
  const supabase = createAdminClient()

  // Find items that need alerts, passing the "previous quantities" so the
  // logic can detect which ones just crossed below their threshold
  const itemsToAlert = await getItemsToAlert(supabase, {
    onlyItemIds: itemIds,
    crossingItems: prevQtyMap,
  })

  if (itemsToAlert.length === 0) return

  console.log(
    `[Alerts] ${itemsToAlert.length} item(s) just crossed below threshold:`,
    itemsToAlert.map((i) => i.sku).join(', ')
  )

  // Send the alert email
  const emailId = await sendAlertEmail(itemsToAlert)
  console.log(`[Alerts] Threshold-crossing alert sent. Resend ID: ${emailId}`)

  // Mark as alerted so we don't re-alert within 24 hours
  await markAlertsSent(supabase, itemsToAlert.map((i) => i.alertSettingsId))
}
