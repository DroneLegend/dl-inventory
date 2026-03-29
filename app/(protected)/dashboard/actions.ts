'use server'

// -----------------------------------------------------------------------------
// Dashboard Server Actions
// -----------------------------------------------------------------------------
// Server actions are functions that run on the server but can be called from
// client components. They handle all data mutations (creates, updates, deletes)
// and refresh the page data when done via revalidatePath().
// -----------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'


// =============================================================================
// BOM MANAGER ACTIONS
// =============================================================================

// Add a new item to a kit's bill of materials
export async function addBomItem(data: {
  kitTypeId: string
  itemId: string
  quantityRequired: number
}): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('bom_items').insert({
    kit_type_id: data.kitTypeId,
    item_id: data.itemId,
    quantity_required: data.quantityRequired,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}

// Change how many of an item are required per kit
export async function updateBomItem(
  bomItemId: string,
  quantityRequired: number
): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('bom_items')
    .update({ quantity_required: quantityRequired })
    .eq('id', bomItemId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}

// Remove an item from a kit's bill of materials
export async function deleteBomItem(bomItemId: string): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('bom_items').delete().eq('id', bomItemId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}


// =============================================================================
// ITEM MANAGER ACTIONS
// =============================================================================

// Add a brand new inventory item to the system
export async function addItem(data: {
  sku: string
  name: string
  description: string
  unit_of_measure: string
  reorder_point: number
}): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('items').insert(data)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}

// Update an existing inventory item's details
export async function updateItem(
  itemId: string,
  data: {
    sku: string
    name: string
    description: string
    unit_of_measure: string
    reorder_point: number
  }
): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('items').update(data).eq('id', itemId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}

// Soft-delete an item — marks it inactive but keeps all history
// (We never hard-delete items because their transaction history is important)
export async function deactivateItem(itemId: string): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('items')
    .update({ is_active: false })
    .eq('id', itemId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}

// Re-enable an item that was previously deactivated
export async function reactivateItem(itemId: string): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('items')
    .update({ is_active: true })
    .eq('id', itemId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}


// =============================================================================
// BOM ITEM NAME / UNIT UPDATE ACTION
// =============================================================================

// Update an item's name and unit of measure directly in the items table.
// Called from the BOM Manager when an admin edits those fields inline.
export async function updateItemNameAndUnit(
  itemId: string,
  name: string,
  unitOfMeasure: string
): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('items')
    .update({ name: name.trim(), unit_of_measure: unitOfMeasure.trim() })
    .eq('id', itemId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}


// =============================================================================
// ALERT SETTINGS ACTIONS
// =============================================================================

// Save alert settings for an item.
// Uses "upsert" which means: insert if no row exists, update if one already does.
export async function upsertAlertSettings(
  itemId: string,
  alertEnabled: boolean,
  overrideThreshold: number | null
): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('alert_settings').upsert(
    {
      item_id: itemId,
      alert_enabled: alertEnabled,
      override_threshold: overrideThreshold,
    },
    { onConflict: 'item_id' } // update existing row if item_id already exists
  )

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}


// =============================================================================
// ADJUST STOCK ACTION
// =============================================================================

// Manually adjust an item's stock level. Admin-only.
// Supports two modes:
//   - "set": Set stock to an exact count (we calculate the delta)
//   - "delta": Add or remove a specific quantity directly
// Creates an 'adjust' transaction to preserve the full audit trail.
export async function adjustStock(data: {
  itemId: string
  adjustmentType: 'set' | 'delta'
  value: number
  currentQuantity: number
  reason: string
}): Promise<{ error: string | null }> {
  const profile = await requireAdmin()
  const supabase = await createClient()

  // Calculate the transaction quantity based on adjustment type
  let quantity: number
  if (data.adjustmentType === 'set') {
    // "Set to exact count" — delta is new value minus current stock
    quantity = data.value - data.currentQuantity
  } else {
    // "Add/Remove quantity" — use the entered value directly
    quantity = data.value
  }

  // Don't create a no-op transaction
  if (quantity === 0) {
    return { error: 'No change — the adjusted quantity equals the current stock.' }
  }

  const { error } = await supabase
    .from('inventory_transactions')
    .insert({
      item_id: data.itemId,
      transaction_type: 'adjust',
      quantity,
      notes: data.reason.trim(),
      created_by: profile.id,
    })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { error: null }
}


// =============================================================================
// INVENTORY OVERVIEW ACTION
// =============================================================================

// Fetch the transaction history for a specific item.
// Called on-demand when a user clicks an item row to expand it.
export async function getItemTransactions(itemId: string): Promise<{
  data: Array<{
    id: string
    transaction_type: string
    quantity: number
    notes: string | null
    created_at: string
    profiles: { full_name: string | null; email: string } | null
  }> | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('id, transaction_type, quantity, notes, created_at, profiles(full_name, email)')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(50) // Show the 50 most recent transactions

  if (error) return { data: null, error: error.message }

  // Cast the joined profile data to the expected shape.
  // Supabase infers profiles as an array type, but since created_by is a single FK
  // it's always one object (or null). We cast through 'unknown' to satisfy TypeScript.
  return {
    data: data as unknown as Array<{
      id: string
      transaction_type: string
      quantity: number
      notes: string | null
      created_at: string
      profiles: { full_name: string | null; email: string } | null
    }>,
    error: null,
  }
}


// =============================================================================
// LEVEL ZERO RESET ACTION
// =============================================================================
// One-time tool to clear all test data before the warehouse team starts.
// Deletes all transactions (which zeros out all quantities via the view),
// then inserts a single audit trail record. Items, KitTypes, and item Notes
// are preserved. Uses the admin client for bulk operations that bypass RLS.

export async function levelZeroReset(): Promise<{ error: string | null }> {
  // Only admins can perform a system reset
  const profile = await requireAdmin()
  const adminSupabase = createAdminClient()

  // Step 1: Delete ALL inventory transactions.
  // This automatically sets every item's quantity_on_hand to 0 because
  // the current_inventory view calculates stock by summing transactions.
  const { error: deleteError } = await adminSupabase
    .from('inventory_transactions')
    .delete()
    .gte('created_at', '1970-01-01') // match all rows (Supabase requires a filter for delete)

  if (deleteError) return { error: `Failed to clear transactions: ${deleteError.message}` }

  // Step 2: Find or create a SYSTEM item to anchor the audit trail transaction.
  // Transactions require a valid item_id foreign key.
  let systemItemId: string

  const { data: existingItem } = await adminSupabase
    .from('items')
    .select('id')
    .eq('sku', 'SYSTEM')
    .single()

  if (existingItem) {
    systemItemId = existingItem.id
  } else {
    // Create a hidden SYSTEM item (inactive so it won't appear in normal lists)
    const { data: newItem, error: itemError } = await adminSupabase
      .from('items')
      .insert({
        sku: 'SYSTEM',
        name: 'System Audit Item',
        description: 'Internal item used for system-level audit trail records.',
        unit_of_measure: 'each',
        reorder_point: 0,
        is_active: false,
      })
      .select('id')
      .single()

    if (itemError || !newItem) {
      return { error: `Failed to create SYSTEM audit item: ${itemError?.message}` }
    }
    systemItemId = newItem.id
  }

  // Step 3: Insert a single audit trail transaction so we have a record of the reset.
  const { error: insertError } = await adminSupabase
    .from('inventory_transactions')
    .insert({
      item_id: systemItemId,
      transaction_type: 'adjust',
      quantity: 0,
      notes: 'SYSTEM RESET: Inventory initialized to zero.',
      created_by: profile.id,
    })

  if (insertError) return { error: `Failed to create audit record: ${insertError.message}` }

  // Step 4: Clear all alert deduplication timestamps so alerts can re-fire cleanly.
  // This ensures "Low Stock" alerts won't be suppressed by stale last_alert_sent values.
  const { error: alertError } = await adminSupabase
    .from('alert_settings')
    .update({ last_alert_sent: null })
    .gte('created_at', '1970-01-01') // match all rows

  if (alertError) {
    // Non-fatal — the reset itself succeeded, just log the warning
    console.warn('Failed to clear alert timestamps:', alertError.message)
  }

  // Revalidate all pages so dashboard counters, inventory views, and
  // transaction history all reflect the zeroed-out state immediately.
  revalidatePath('/dashboard')
  revalidatePath('/warehouse')
  revalidatePath('/inventory')
  revalidatePath('/transactions')

  return { error: null }
}
