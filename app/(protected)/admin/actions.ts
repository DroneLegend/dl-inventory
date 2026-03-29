'use server'

// -----------------------------------------------------------------------------
// Admin Server Actions
// -----------------------------------------------------------------------------
// Server actions for managing kit types and user roles.
// These run on the server and can be called from client components.
// Each action verifies the user is an admin before doing anything.
// -----------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'


// =============================================================================
// KIT TYPE ACTIONS
// =============================================================================

// Add a brand new kit type to the system
export async function addKitType(
  name: string,
  description: string
): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('kit_types').insert({
    name: name.trim(),
    description: description.trim(),
    is_active: true,
  })

  if (error) return { error: error.message }

  // Refresh both the kits page and the dashboard (which also shows kit data)
  revalidatePath('/kits')
  revalidatePath('/dashboard')
  return { error: null }
}

// Update an existing kit type's name and description
export async function updateKitType(
  id: string,
  name: string,
  description: string
): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('kit_types')
    .update({ name: name.trim(), description: description.trim() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/kits')
  revalidatePath('/dashboard')
  return { error: null }
}

// Deactivate or reactivate a kit type.
// isActive = true → reactivate; isActive = false → deactivate
export async function toggleKitTypeActive(
  id: string,
  isActive: boolean
): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('kit_types')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/kits')
  revalidatePath('/dashboard')
  return { error: null }
}


// Delete a kit type and all its associated BOM items.
// Deletes BOM items first to respect foreign key constraints.
export async function deleteKitType(
  id: string
): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = await createClient()

  // 1. Delete all BOM items that reference this kit type
  const { error: bomError } = await supabase
    .from('bom_items')
    .delete()
    .eq('kit_type_id', id)

  if (bomError) return { error: bomError.message }

  // 2. Delete the kit type itself
  const { error: kitError } = await supabase
    .from('kit_types')
    .delete()
    .eq('id', id)

  if (kitError) return { error: kitError.message }

  revalidatePath('/kits')
  revalidatePath('/dashboard')
  return { error: null }
}


// Update the sort_order for multiple kit types at once (used for drag-and-drop reordering)
export async function reorderKitTypes(
  orderedIds: string[]
): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = await createClient()

  // Set each kit's sort_order to its index in the array
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('kit_types')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])

    if (error) return { error: error.message }
  }

  revalidatePath('/kits')
  revalidatePath('/dashboard')
  return { error: null }
}


// =============================================================================
// USER MANAGEMENT ACTIONS
// =============================================================================

// Archive or restore a user. Archived users are hidden from the default list
// but can be shown with the "Show Archived" toggle.
export async function toggleUserArchived(
  profileId: string,
  archived: boolean
): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ archived })
    .eq('id', profileId)

  if (error) return { error: error.message }

  revalidatePath('/users')
  return { error: null }
}

// Change a user's role between 'admin' and 'warehouse'
export async function updateUserRole(
  profileId: string,
  role: 'admin' | 'warehouse'
): Promise<{ error: string | null }> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', profileId)

  if (error) return { error: error.message }

  revalidatePath('/users')
  return { error: null }
}
