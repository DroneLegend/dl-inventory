'use server'

// -----------------------------------------------------------------------------
// Dashboard Server Actions
// -----------------------------------------------------------------------------
// Server actions are functions that run on the server but can be called from
// client components. They handle all data mutations (creates, updates, deletes)
// and refresh the page data when done via revalidatePath().
// -----------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
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
