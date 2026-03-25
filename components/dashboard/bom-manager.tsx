'use client'

// -----------------------------------------------------------------------------
// BOM Manager
// -----------------------------------------------------------------------------
// "BOM" stands for Bill of Materials — the list of items (and quantities)
// needed to build one kit. This tab lets admins:
//   - View all items in a kit's BOM
//   - Edit item name, unit of measure, and required quantity per row
//   - Remove items from the BOM
//   - Add new items to the BOM
//
// Each row has an Edit button that reveals inline inputs for all three
// editable fields: Item Name (from items table), Unit (from items table),
// and Qty/Kit (from bom_items table). Both saves happen on checkmark click.
// -----------------------------------------------------------------------------

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react'
import {
  addBomItem,
  updateBomItem,
  deleteBomItem,
  updateItemNameAndUnit,
} from '@/app/(protected)/dashboard/actions'

// ---- Type definitions --------------------------------------------------------

type KitType = {
  id: string
  name: string
}

// A BOM item with its associated item details (joined from the items table)
type BomItem = {
  id: string
  kit_type_id: string
  item_id: string
  quantity_required: number
  items: {
    sku: string
    name: string
    unit_of_measure: string
  } | null
}

// A basic item (for the "add to BOM" dropdown — shows all active items)
type Item = {
  id: string
  sku: string
  name: string
  unit_of_measure: string
}

type Props = {
  kitTypes: KitType[]
  bomItems: BomItem[]
  allItems: Item[] // All active items available to add to a BOM
}

// ---- Main component ----------------------------------------------------------

export default function BomManager({ kitTypes, bomItems, allItems }: Props) {
  // The kit type the user is currently managing
  const [selectedKitId, setSelectedKitId] = useState<string>(kitTypes[0]?.id ?? '')

  // Which BOM item row is currently in "full edit" mode (null = none)
  const [editingBomItemId, setEditingBomItemId] = useState<string | null>(null)

  // Inline edit form values (for the currently edited row)
  const [editName, setEditName] = useState<string>('')
  const [editUnit, setEditUnit] = useState<string>('')
  const [editQty, setEditQty] = useState<string>('')

  // Whether the "add item" form is visible
  const [showAddForm, setShowAddForm] = useState(false)

  // Form state for adding a new BOM item
  const [addItemId, setAddItemId] = useState<string>('')
  const [addQty, setAddQty] = useState<string>('1')

  // Error messages (shown inline)
  const [error, setError] = useState<string | null>(null)

  // isPending = true while a server action is running (disables buttons)
  const [isPending, startTransition] = useTransition()

  // Filter BOM items to the selected kit, sorted by SKU
  const currentBomItems = bomItems
    .filter((bom) => bom.kit_type_id === selectedKitId && bom.items)
    .sort((a, b) => (a.items?.sku ?? '').localeCompare(b.items?.sku ?? ''))

  // Items that are NOT already in this kit's BOM (available to add)
  const existingItemIds = new Set(currentBomItems.map((bom) => bom.item_id))
  const availableItems = allItems.filter((item) => !existingItemIds.has(item.id))

  // ---- Action handlers -------------------------------------------------------

  // Start editing a BOM row — pre-fill all three editable fields
  function startEdit(bom: BomItem) {
    setEditingBomItemId(bom.id)
    setEditName(bom.items?.name ?? '')
    setEditUnit(bom.items?.unit_of_measure ?? '')
    setEditQty(String(bom.quantity_required))
    setError(null)
  }

  // Cancel the current inline edit without saving
  function cancelEdit() {
    setEditingBomItemId(null)
    setEditName('')
    setEditUnit('')
    setEditQty('')
    setError(null)
  }

  // Save the inline edit:
  //   - item name + unit → items table (via updateItemNameAndUnit)
  //   - quantity → bom_items table (via updateBomItem)
  function saveEdit(bom: BomItem) {
    const qty = parseInt(editQty)
    if (isNaN(qty) || qty < 1) {
      setError('Quantity must be a positive number.')
      return
    }
    if (!editName.trim()) {
      setError('Item name cannot be blank.')
      return
    }
    if (!editUnit.trim()) {
      setError('Unit of measure cannot be blank.')
      return
    }

    startTransition(async () => {
      // Run both updates in parallel for speed
      const [nameResult, qtyResult] = await Promise.all([
        // Update the item's name and unit in the items table
        updateItemNameAndUnit(bom.item_id, editName, editUnit),
        // Update the required quantity in the bom_items table
        updateBomItem(bom.id, qty),
      ])

      // Show the first error encountered, if any
      const errorMsg = nameResult.error ?? qtyResult.error
      if (errorMsg) {
        setError(errorMsg)
      } else {
        setEditingBomItemId(null)
        setEditName('')
        setEditUnit('')
        setEditQty('')
        setError(null)
      }
    })
  }

  // Delete a BOM item after confirmation
  function handleDelete(bomItemId: string, itemName: string) {
    if (!confirm(`Remove "${itemName}" from this kit's BOM?`)) return

    startTransition(async () => {
      const result = await deleteBomItem(bomItemId)
      if (result.error) setError(result.error)
    })
  }

  // Add a new item to the BOM
  function handleAddItem() {
    if (!addItemId) {
      setError('Please select an item to add.')
      return
    }
    const qty = parseInt(addQty)
    if (isNaN(qty) || qty < 1) {
      setError('Quantity must be a positive number.')
      return
    }

    startTransition(async () => {
      const result = await addBomItem({
        kitTypeId: selectedKitId,
        itemId: addItemId,
        quantityRequired: qty,
      })
      if (result.error) {
        setError(result.error)
      } else {
        // Reset the add form
        setShowAddForm(false)
        setAddItemId('')
        setAddQty('1')
        setError(null)
      }
    })
  }

  // ---- Render ----------------------------------------------------------------

  return (
    <div className="space-y-5">

      {/* Kit type selector */}
      <div className="flex items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Kit Type</label>
          <select
            value={selectedKitId}
            onChange={(e) => {
              setSelectedKitId(e.target.value)
              setEditingBomItemId(null)
              setShowAddForm(false)
              setError(null)
            }}
            className="h-9 min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
          >
            {kitTypes.map((kit) => (
              <option key={kit.id} value={kit.id}>
                {kit.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* BOM items table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            Bill of Materials ({currentBomItems.length} items)
          </h3>
          {/* Add item button (only shown when form isn't already open) */}
          {!showAddForm && availableItems.length > 0 && (
            <Button
              size="sm"
              onClick={() => {
                setShowAddForm(true)
                setAddItemId(availableItems[0]?.id ?? '')
                setError(null)
              }}
              className="gap-1.5 bg-brand-navy text-white hover:bg-brand-navy/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </Button>
          )}
        </div>

        {/* "Add item" inline form */}
        {showAddForm && (
          <div className="px-4 py-3 border-b border-brand-orange/20 bg-amber-50 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Item</label>
              <select
                value={addItemId}
                onChange={(e) => setAddItemId(e.target.value)}
                className="h-9 min-w-[240px] rounded-lg border border-slate-200 bg-white px-3 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
              >
                {availableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku} — {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Qty per Kit</label>
              <Input
                type="number"
                min={1}
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                className="w-20"
              />
            </div>

            <Button
              size="sm"
              onClick={handleAddItem}
              disabled={isPending}
              className="bg-brand-navy text-white hover:bg-brand-navy/90"
            >
              <Check className="h-4 w-4" />
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setShowAddForm(false); setError(null) }}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}

        {/* Table of existing BOM items */}
        {currentBomItems.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-400 text-sm">
              No items in this kit&apos;s BOM yet. Use the Add Item button above.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">SKU</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Item Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Unit</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wide">Qty / Kit</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentBomItems.map((bom) => {
                const isEditing = editingBomItemId === bom.id

                return (
                  <tr
                    key={bom.id}
                    className={isEditing ? 'bg-amber-50' : 'hover:bg-slate-50 transition-colors'}
                  >
                    {/* SKU — not editable */}
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {bom.items?.sku}
                    </td>

                    {/* Item name — editable when in edit mode */}
                    <td className="px-4 py-3 text-slate-800">
                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                      ) : (
                        bom.items?.name
                      )}
                    </td>

                    {/* Unit of measure — editable when in edit mode */}
                    <td className="px-4 py-3 text-slate-500">
                      {isEditing ? (
                        <Input
                          value={editUnit}
                          onChange={(e) => setEditUnit(e.target.value)}
                          className="h-8 text-sm w-28"
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                      ) : (
                        bom.items?.unit_of_measure
                      )}
                    </td>

                    {/* Qty per kit — editable when in edit mode */}
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <Input
                          type="number"
                          min={1}
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          className="h-8 w-16 text-center text-sm mx-auto"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(bom)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                      ) : (
                        <span className="font-medium text-slate-700">{bom.quantity_required}</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          // Edit mode: save (checkmark) + cancel (X)
                          <>
                            <button
                              onClick={() => saveEdit(bom)}
                              disabled={isPending}
                              className="text-green-600 hover:text-green-700 disabled:opacity-50"
                              title="Save changes"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-slate-400 hover:text-slate-600"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          // View mode: edit + delete buttons
                          <>
                            <button
                              onClick={() => startEdit(bom)}
                              className="text-slate-400 hover:text-brand-navy transition-colors"
                              title="Edit item name, unit, and quantity"
                              disabled={isPending}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(bom.id, bom.items?.name ?? 'this item')}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                              title="Remove from BOM"
                              disabled={isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
