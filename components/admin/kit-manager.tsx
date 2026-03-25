'use client'

// -----------------------------------------------------------------------------
// Kit Manager Component
// -----------------------------------------------------------------------------
// Lets admins manage kit types — the templates that define what goes into a kit.
// Features:
//   - View all kit types with their item counts
//   - Add new kit types (name + description)
//   - Edit a kit type's name/description inline
//   - Deactivate or reactivate kit types
// -----------------------------------------------------------------------------

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Plus, X, Check } from 'lucide-react'
import { addKitType, updateKitType, toggleKitTypeActive } from '@/app/(protected)/admin/actions'
import { cn } from '@/lib/utils'

// ---- Type definitions --------------------------------------------------------

type KitType = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  // Number of BOM items associated with this kit type
  bom_item_count: number
}

type Props = {
  kitTypes: KitType[]
}

// ---- Main component ----------------------------------------------------------

export default function KitManager({ kitTypes }: Props) {
  // Whether the "add new kit" form is open
  const [isAdding, setIsAdding] = useState(false)

  // Which kit type is being edited inline (null = none)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form field values for the add/edit form
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')

  // Error message to show below the form
  const [error, setError] = useState<string | null>(null)

  // isPending = true while a server action is in progress
  const [isPending, startTransition] = useTransition()

  // ---- Form helpers -----------------------------------------------------------

  // Open the "add new kit" form with blank fields
  function startAdd() {
    setIsAdding(true)
    setEditingId(null)
    setFormName('')
    setFormDescription('')
    setError(null)
  }

  // Open the inline edit form for an existing kit type
  function startEdit(kit: KitType) {
    setEditingId(kit.id)
    setIsAdding(false)
    setFormName(kit.name)
    setFormDescription(kit.description ?? '')
    setError(null)
  }

  // Close any open form without saving
  function cancelForm() {
    setIsAdding(false)
    setEditingId(null)
    setFormName('')
    setFormDescription('')
    setError(null)
  }

  // ---- Action handlers -------------------------------------------------------

  // Submit the "add new kit" form
  function handleAdd() {
    if (!formName.trim()) { setError('Kit name is required.'); return }

    startTransition(async () => {
      const result = await addKitType(formName, formDescription)
      if (result.error) {
        setError(result.error)
      } else {
        cancelForm()
      }
    })
  }

  // Submit an inline edit
  function handleUpdate(id: string) {
    if (!formName.trim()) { setError('Kit name is required.'); return }

    startTransition(async () => {
      const result = await updateKitType(id, formName, formDescription)
      if (result.error) {
        setError(result.error)
      } else {
        cancelForm()
      }
    })
  }

  // Toggle a kit type between active and inactive
  function handleToggleActive(kit: KitType) {
    const action = kit.is_active ? 'deactivate' : 'reactivate'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} kit type "${kit.name}"?`)) return

    startTransition(async () => {
      const result = await toggleKitTypeActive(kit.id, !kit.is_active)
      if (result.error) setError(result.error)
    })
  }

  // ---- Render ----------------------------------------------------------------

  // Sort kit types: active first, then inactive; alphabetically within each group
  const sorted = [...kitTypes].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="space-y-5">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {!isAdding && !editingId && (
          <Button
            onClick={startAdd}
            className="gap-1.5 bg-brand-navy text-white hover:bg-brand-navy/90"
          >
            <Plus className="h-4 w-4" />
            Add Kit Type
          </Button>
        )}
        {(isAdding || editingId) && <div />}
      </div>

      {/* Add new kit type form */}
      {isAdding && (
        <div className="border border-brand-orange/30 bg-amber-50 rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-slate-700 text-sm">Add New Kit Type</h4>

          <div className="grid grid-cols-1 gap-4">
            {/* Name field */}
            <div className="space-y-1.5">
              <Label htmlFor="kit-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="kit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Starter Kit"
                autoFocus
              />
            </div>

            {/* Description field */}
            <div className="space-y-1.5">
              <Label htmlFor="kit-desc">
                Description
                <span className="text-slate-400 font-normal ml-1 text-xs">(optional)</span>
              </Label>
              <Input
                id="kit-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What goes in this kit?"
              />
            </div>
          </div>

          {/* Validation error */}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Form buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleAdd}
              disabled={isPending}
              className="bg-brand-navy text-white hover:bg-brand-navy/90"
            >
              <Check className="h-4 w-4 mr-1" />
              Add Kit Type
            </Button>
            <Button variant="ghost" onClick={cancelForm} disabled={isPending}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Global error (for toggle errors) */}
      {!isAdding && !editingId && error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Kit types table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-400 text-sm">No kit types yet. Add your first kit type above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Kit Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wide">Items in BOM</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((kit) => {
                const isEditing = editingId === kit.id

                // Inline edit mode — replace the row with input fields
                if (isEditing) {
                  return (
                    <tr key={kit.id} className="bg-amber-50">
                      {/* Inline edit form spanning all columns */}
                      <td colSpan={5} className="px-4 py-3">
                        <div className="flex flex-wrap items-end gap-3">
                          {/* Name input */}
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-slate-600">Name *</label>
                            <Input
                              value={formName}
                              onChange={(e) => setFormName(e.target.value)}
                              className="w-48"
                              autoFocus
                            />
                          </div>

                          {/* Description input */}
                          <div className="flex flex-col gap-1 flex-1">
                            <label className="text-xs font-medium text-slate-600">Description</label>
                            <Input
                              value={formDescription}
                              onChange={(e) => setFormDescription(e.target.value)}
                              className="min-w-[200px]"
                            />
                          </div>

                          {/* Save button */}
                          <button
                            onClick={() => handleUpdate(kit.id)}
                            disabled={isPending}
                            className="text-green-600 hover:text-green-700 disabled:opacity-50"
                            title="Save changes"
                          >
                            <Check className="h-5 w-5" />
                          </button>

                          {/* Cancel button */}
                          <button
                            onClick={cancelForm}
                            className="text-slate-400 hover:text-slate-600"
                            title="Cancel"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>

                        {/* Validation error shown while editing */}
                        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                      </td>
                    </tr>
                  )
                }

                // Normal (view) mode row
                return (
                  <tr
                    key={kit.id}
                    className={cn(
                      'transition-colors',
                      kit.is_active ? 'hover:bg-slate-50' : 'bg-slate-50/50 opacity-60'
                    )}
                  >
                    {/* Kit name */}
                    <td className="px-4 py-3 font-medium text-slate-800">{kit.name}</td>

                    {/* Description */}
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                      {kit.description ?? <span className="text-slate-300">—</span>}
                    </td>

                    {/* BOM item count */}
                    <td className="px-4 py-3 text-center">
                      <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
                        {kit.bom_item_count} item{kit.bom_item_count !== 1 ? 's' : ''}
                      </span>
                    </td>

                    {/* Active/inactive badge */}
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'inline-block text-xs font-medium px-2 py-0.5 rounded-full',
                        kit.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      )}>
                        {kit.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit button */}
                        <button
                          onClick={() => startEdit(kit)}
                          className="text-slate-400 hover:text-brand-navy transition-colors"
                          title="Edit kit type"
                          disabled={isPending}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {/* Deactivate / Reactivate button */}
                        <button
                          onClick={() => handleToggleActive(kit)}
                          className={cn(
                            'text-xs transition-colors',
                            kit.is_active
                              ? 'text-slate-400 hover:text-red-500'
                              : 'text-slate-400 hover:text-green-600'
                          )}
                          disabled={isPending}
                        >
                          {kit.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
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
