// -----------------------------------------------------------------------------
// API Route: Duplicate Kit Type
// -----------------------------------------------------------------------------
// Copies an existing kit type and its BOM (bill of materials) items into a
// new kit type with a different name. Uses the admin client to bypass RLS.
// Only accessible by authenticated admin users.
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // --- Auth check: verify the caller is an authenticated admin ---
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  try {
    const { sourceKitId, newName } = await request.json()

    if (!sourceKitId || !newName) {
      return NextResponse.json(
        { error: 'Required: sourceKitId and newName.' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // 1. Create the new kit type with the given name
    const { data: newKit, error: kitError } = await adminClient
      .from('kit_types')
      .insert([{ name: newName, is_active: true }])
      .select()
      .single()

    if (kitError) throw kitError

    // 2. Fetch all BOM items from the source kit
    const { data: originalItems, error: fetchError } = await adminClient
      .from('bom_items')
      .select('item_id, quantity_required')
      .eq('kit_type_id', sourceKitId)

    if (fetchError) {
      console.error('BOM fetch error:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    console.log(`Found ${originalItems?.length ?? 0} BOM items to copy from kit ${sourceKitId}`)

    // 3. Copy those BOM items to the new kit type
    if (originalItems && originalItems.length > 0) {
      const itemsToInsert = originalItems.map(item => ({
        kit_type_id: newKit.id,
        item_id: item.item_id,
        quantity_required: item.quantity_required,
      }))

      const { error: insertError } = await adminClient
        .from('bom_items')
        .insert(itemsToInsert)

      if (insertError) {
        console.error('BOM insert error:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 400 })
      }

      console.log(`Copied ${itemsToInsert.length} BOM items to new kit ${newKit.id}`)
    }

    return NextResponse.json({ success: true, newKitId: newKit.id })
  } catch (error: unknown) {
    console.error('Duplicate kit error:', error)
    const message = error instanceof Error ? error.message
      : (error && typeof error === 'object' && 'message' in error) ? String((error as { message: unknown }).message)
      : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
