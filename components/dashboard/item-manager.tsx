'use client'

// -----------------------------------------------------------------------------
// Item Manager
// -----------------------------------------------------------------------------
// Lets admins manage the inventory items catalog. Features:
//   - View all items (active and inactive)
//   - Add new items
//   - Edit existing item details
//   - Deactivate items (soft delete — keeps history intact)
//   - Reactivate previously deactivated items
//
// The "description" field in the database stores structured info as:
//   "Source: Amazon | Unit cost: $25.00 | Some extra notes"
// The form breaks this into separate Source, Unit Cost, and Notes fields
// for easier editing, then reassembles the string before saving.
// -----------------------------------------------------------------------------

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Plus, X, Check, ToggleLeft, ToggleRight } from 'lucide-react'
import { addItem, updateItem, deactivateItem, reactivateItem } from '@/app/(protected)/dashboard/actions'

// ---- Type definitions --------------------------------------------------------

type Item = {
  id: string
  sku: string
  name: string
  description: string | null
  unit_of_measure: string
  reorder_point: number
  is_active: boolean
}

// The fields shown in the add/edit form
type ItemFormData = {
  sku: string
  name: string
  source: string        // e.g. "Amazon"
  unitCost: string      // e.g. "25.00" (no dollar sign in the input)
  notes: string         // anything else to store in description
  unit_of_measure: string
  reorder_point: string // stored as string so the number input works cleanly
}

const emptyForm: ItemFormData = {
  sku: '',
  name: '',
  source: '',
  unitCost: '',
  notes: '',
  unit_of_measure: 'each',
  reorder_point: '0',
}

type Props = {
  items: Item[]
}

// ---- Description parse/build helpers -----------------------------------------

// Parse the description string into its three structured components.
// Expected format: "Source: Amazon | Unit cost: $25.00 | Optional notes"
function parseDescription(description: string | null): { source: string; unitCost: string; notes: string } {
  if (!description) return { source: '', unitCost: '', notes: '' }

  // Extract the Source value (everything between "Source:" and the next "|" or end)
  const sourceMatch = description.match(/Source:\s*([^|]+)/)
  const source = sourceMatch ? sourceMatch[1].trim() : ''

  // Extract the Unit cost value (digits, commas, periods after "Unit cost: $")
  const costMatch = description.match(/Unit cost:\s*\$?([\d,.]+)/)
  const unitCost = costMatch ? costMatch[1].trim() : ''

  // Notes = whatever remains after stripping the source and unit cost parts
  let remaining = description
  if (sourceMatch) remaining = remaining.replace(sourceMatch[0], '')
  if (costMatch) remaining = remaining.replace(/Unit cost:\s*\$?[\d,.]+/, '')

  // Clean up the remaining string: remove leading/trailing pipes, spaces
  const notes = remaining
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' | ')

  return { source, unitCost, notes }
}

// Reassemble the description string from the three form fields.
// Only includes non-empty parts, joined with " | ".
function buildDescription(source: string, unitCost: string, notes: string): string {
  const parts: string[] = []

  if (source.trim()) parts.push(`Source: ${source.trim()}`)
  if (unitCost.trim()) parts.push(`Unit cost: $${unitCost.trim()}`)
  if (notes.trim()) parts.push(notes.trim())

  return parts.join(' | ')
}

// ---- Main component ----------------------------------------------------------

export default function ItemManager({ items }: Props) {
  // Which item is being edited (null = none)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  // Whether the "add new item" form is open
  const [isAdding, setIsAdding] = useState(false)

  // Current form field values
  const [form, setForm] = useState<ItemFormData>(emptyForm)

  // Show inactive items in the table?
  const [showInactive, setShowInactive] = useState(false)

  // Validation or server error message
  const [error, setError] = useState<string | null>(null)

  // isPending = true while a server action is running
  const [isPending, startTransition] = useTransition()

  // Items to display, filtered and sorted by SKU
  const displayedItems = items
    .filter((item) => showInactive || item.is_active)
    .sort((a, b) => a.sku.localeCompare(b.sku))

  // ---- Form helpers -----------------------------------------------------------

  // Update a single form field
  function setField(field: keyof ItemFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Validate required fields; returns an error string or null if valid
  function validateForm(): string | null {
    if (!form.sku.trim()) return 'SKU is required.'
    if (!form.name.trim()) return 'Name is required.'
    if (!form.unit_of_measure.trim()) return 'Unit of measure is required.'
    const reorder = parseInt(form.reorder_point)
    if (isNaN(reorder) || reorder < 0) return 'Reorder point must be 0 or a positive number.'
    return null
  }

  // Open the edit form pre-filled with an existing item's data.
  // Parses the description field into separate source/unitCost/notes fields.
  function startEdit(item: Item) {
    const { source, unitCost, notes } = parseDescription(item.description)
    setEditingItemId(item.id)
    setIsAdding(false)
    setForm({
      sku: item.sku,
      name: item.name,
      source,
      unitCost,
      notes,
      unit_of_measure: item.unit_of_measure,
      reorder_point: String(item.reorder_point),
    })
    setError(null)
  }

  // Open the blank "add new item" form
  function startAdd() {
    setEditingItemId(null)
    setIsAdding(true)
    setForm(emptyForm)
    setError(null)
  }

  // Close the form without saving
  function cancelForm() {
    setEditingItemId(null)
    setIsAdding(false)
    setForm(emptyForm)
    setError(null)
  }

  // ---- Action handlers -------------------------------------------------------

  // Save a new item to the database
  function handleAdd() {
    const validationError = validateForm()
    if (validationError) { setError(validationError); return }

    startTransition(async () => {
      const result = await addItem({
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: buildDescription(form.source, form.unitCost, form.notes),
        unit_of_measure: form.unit_of_measure.trim(),
        reorder_point: parseInt(form.reorder_point),
      })
      if (result.error) {
        setError(result.error)
      } else {
        cancelForm()
      }
    })
  }

  // Save edits to an existing item
  function handleUpdate() {
    if (!editingItemId) return
    const validationError = validateForm()
    if (validationError) { setError(validationError); return }

    startTransition(async () => {
      const result = await updateItem(editingItemId, {
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: buildDescription(form.source, form.unitCost, form.notes),
        unit_of_measure: form.unit_of_measure.trim(),
        reorder_point: parseInt(form.reorder_point),
      })
      if (result.error) {
        setError(result.error)
      } else {
        cancelForm()
      }
    })
  }

  // Soft-delete an item (marks it inactive, preserves history)
  function handleDeactivate(item: Item) {
    if (!confirm(`Deactivate "${item.name}"? It will be hidden from active use but its history will be preserved.`)) return

    startTransition(async () => {
      const result = await deactivateItem(item.id)
      if (result.error) setError(result.error)
    })
  }

  // Re-enable a previously deactivated item
  function handleReactivate(itemId: string) {
    startTransition(async () => {
      const result = await reactivateItem(itemId)
      if (result.error) setError(result.error)
    })
  }

  // ---- Item form (shared between add and edit) ---------------------------------

  const ItemForm = () => (
    <div className="border border-brand-orange/30 bg-amber-50 rounded-xl p-5 space-y-4">
      <h4 className="font-semibold text-slate-700 text-sm">
        {isAdding ? 'Add New Item' : 'Edit Item'}
      </h4>

      <div className="grid grid-cols-4 gap-4">

        {/* Row 1: SKU (half) | Unit of Measure (half) */}
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="item-sku">SKU <span className="text-red-500">*</span></Label>
          <Input
            id="item-sku"
            value={form.sku}
            onChange={(e) => setField('sku', e.target.value)}
            placeholder="e.g. STM-205"
          />
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="item-uom">Unit of Measure <span className="text-red-500">*</span></Label>
          <Input
            id="item-uom"
            value={form.unit_of_measure}
            onChange={(e) => setField('unit_of_measure', e.target.value)}
            placeholder="e.g. each, 12-pack, set of 6"
          />
        </div>

        {/* Row 2: Name (full width) */}
        <div className="col-span-4 space-y-1.5">
          <Label htmlFor="item-name">Name <span className="text-red-500">*</span></Label>
          <Input
            id="item-name"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="e.g. 5x Replacement Propellers"
          />
        </div>

        {/* Row 3: Source (half) | Unit Cost (half) */}
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="item-source">Source</Label>
          <Input
            id="item-source"
            value={form.source}
            onChange={(e) => setField('source', e.target.value)}
            placeholder="e.g. Amazon"
          />
        </div>

        <div className="col-span-2 space-y-1.5">
          {/* Unit cost — prefixed with a "$" sign outside the input */}
          <Label htmlFor="item-cost">Unit Cost</Label>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">$</span>
            <Input
              id="item-cost"
              value={form.unitCost}
              onChange={(e) => setField('unitCost', e.target.value)}
              placeholder="e.g. 25.00"
              className="flex-1"
            />
          </div>
        </div>

        {/* Row 4: Reorder Point (quarter width) */}
        <div className="col-span-1 space-y-1.5">
          <Label htmlFor="item-reorder">
            Reorder Point
            <span className="text-slate-400 font-normal ml-1 text-xs">(alert)</span>
          </Label>
          <Input
            id="item-reorder"
            type="number"
            min={0}
            value={form.reorder_point}
            onChange={(e) => setField('reorder_point', e.target.value)}
          />
        </div>

        {/* Row 5: Notes / extra description (full width) */}
        <div className="col-span-4 space-y-1.5">
          <Label htmlFor="item-notes">
            Notes
            <span className="text-slate-400 font-normal ml-1 text-xs">(optional — anything extra)</span>
          </Label>
          <Input
            id="item-notes"
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder="Any additional details"
          />
        </div>

      </div>

      {/* Validation / server error */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Form action buttons */}
      <div className="flex gap-2">
        <Button
          onClick={isAdding ? handleAdd : handleUpdate}
          disabled={isPending}
          className="bg-brand-navy text-white hover:bg-brand-navy/90"
        >
          <Check className="h-4 w-4 mr-1" />
          {isAdding ? 'Add Item' : 'Save Changes'}
        </Button>
        <Button variant="ghost" onClick={cancelForm} disabled={isPending}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  )

  // ---- Render ----------------------------------------------------------------

  return (
    <div className="space-y-5">

      {/* Toolbar: Add button + show inactive toggle */}
      <div className="flex items-center justify-between">
        {!isAdding && !editingItemId && (
          <Button
            onClick={startAdd}
            className="gap-1.5 bg-brand-navy text-white hover:bg-brand-navy/90"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        )}
        {(isAdding || editingItemId) && <div />}

        {/* Toggle to show/hide inactive items */}
        <button
          onClick={() => setShowInactive((v) => !v)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          {showInactive ? (
            <ToggleRight className="h-5 w-5 text-brand-orange" />
          ) : (
            <ToggleLeft className="h-5 w-5" />
          )}
          {showInactive ? 'Hiding inactive items' : 'Showing inactive items'}
          <span className="text-xs text-slate-400">
            ({items.filter((i) => !i.is_active).length} inactive)
          </span>
        </button>
      </div>

      {/* Inline add/edit form */}
      {(isAdding || editingItemId) && <ItemForm />}

      {/* Items table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {displayedItems.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-400 text-sm">No items found. Add your first item above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">SKU</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Unit</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">Reorder Pt.</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayedItems.map((item) => (
                <tr
                  key={item.id}
                  className={item.is_active ? 'hover:bg-slate-50 transition-colors' : 'bg-slate-50/50 opacity-60'}
                >
                  {/* SKU */}
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.sku}</td>

                  {/* Name + description preview */}
                  <td className="px-4 py-3">
                    <div className="text-slate-800 font-medium">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">
                        {item.description}
                      </div>
                    )}
                  </td>

                  {/* Unit of measure */}
                  <td className="px-4 py-3 text-slate-500">{item.unit_of_measure}</td>

                  {/* Reorder point */}
                  <td className="px-4 py-3 text-right text-slate-600">{item.reorder_point}</td>

                  {/* Active/inactive badge */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Action buttons */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Edit button */}
                      <button
                        onClick={() => startEdit(item)}
                        className="text-slate-400 hover:text-brand-navy transition-colors"
                        title="Edit item"
                        disabled={isPending}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      {/* Deactivate / Reactivate button */}
                      {item.is_active ? (
                        <button
                          onClick={() => handleDeactivate(item)}
                          className="text-slate-400 hover:text-red-500 transition-colors text-xs"
                          title="Deactivate item"
                          disabled={isPending}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(item.id)}
                          className="text-slate-400 hover:text-green-600 transition-colors text-xs"
                          title="Reactivate item"
                          disabled={isPending}
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
