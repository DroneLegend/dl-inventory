'use client'

// -----------------------------------------------------------------------------
// Alert Settings Panel
// -----------------------------------------------------------------------------
// Lets admins configure low-stock email alerts on a per-item basis:
//   - Toggle alerts on/off for each item
//   - Set a custom threshold (overrides the item's default reorder point)
//   - If no override is set, the item's reorder_point is used as the threshold
// -----------------------------------------------------------------------------

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Bell, BellOff, Check, X, Pencil } from 'lucide-react'
import { upsertAlertSettings } from '@/app/(protected)/dashboard/actions'
import { cn } from '@/lib/utils'

// ---- Type definitions --------------------------------------------------------

type Item = {
  id: string
  sku: string
  name: string
  reorder_point: number
  is_active: boolean
}

type AlertSetting = {
  id: string
  item_id: string
  alert_enabled: boolean
  override_threshold: number | null
}

type Props = {
  items: Item[]
  alertSettings: AlertSetting[]
}

// ---- Main component ----------------------------------------------------------

export default function AlertSettingsPanel({ items, alertSettings }: Props) {
  // Build a map from item_id → alert settings for quick lookup
  const settingsMap = new Map<string, AlertSetting>(
    alertSettings.map((s) => [s.item_id, s])
  )

  // ID of the item currently in "edit threshold" mode (null = none)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  // The threshold value being edited (as a string for the input)
  const [editThreshold, setEditThreshold] = useState<string>('')

  // Error messages
  const [error, setError] = useState<string | null>(null)

  // isPending = true while a save is in progress
  const [isPending, startTransition] = useTransition()

  // Which items to show: active only, or all
  const [showInactive, setShowInactive] = useState(false)

  // Filter items
  const displayedItems = items
    .filter((item) => showInactive || item.is_active)
    .sort((a, b) => a.sku.localeCompare(b.sku))

  // ---- Action handlers -------------------------------------------------------

  // Toggle alerts on/off for an item (saves immediately)
  function handleToggleAlert(item: Item) {
    const current = settingsMap.get(item.id)
    const newEnabled = !(current?.alert_enabled ?? true)
    const threshold = current?.override_threshold ?? null

    startTransition(async () => {
      const result = await upsertAlertSettings(item.id, newEnabled, threshold)
      if (result.error) setError(result.error)
    })
  }

  // Start editing the threshold for an item
  function startEditThreshold(item: Item) {
    const current = settingsMap.get(item.id)
    setEditingItemId(item.id)
    // Pre-fill with current override, or blank if using the default
    setEditThreshold(
      current?.override_threshold !== null && current?.override_threshold !== undefined
        ? String(current.override_threshold)
        : ''
    )
    setError(null)
  }

  // Cancel editing without saving
  function cancelEdit() {
    setEditingItemId(null)
    setEditThreshold('')
    setError(null)
  }

  // Save the threshold edit
  function saveThreshold(item: Item) {
    const current = settingsMap.get(item.id)
    const alertEnabled = current?.alert_enabled ?? true

    // Empty string means "use the default reorder_point" (null override)
    let threshold: number | null = null
    if (editThreshold.trim() !== '') {
      threshold = parseInt(editThreshold)
      if (isNaN(threshold) || threshold < 0) {
        setError('Threshold must be 0 or a positive number (or leave blank to use the default).')
        return
      }
    }

    startTransition(async () => {
      const result = await upsertAlertSettings(item.id, alertEnabled, threshold)
      if (result.error) {
        setError(result.error)
      } else {
        setEditingItemId(null)
        setEditThreshold('')
        setError(null)
      }
    })
  }

  // ---- Render ----------------------------------------------------------------

  return (
    <div className="space-y-5">

      {/* Header note */}
      <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
        <strong>How alerts work:</strong> When an item&apos;s stock falls below its threshold,
        a low-stock alert email is triggered. If no custom threshold is set, the item&apos;s
        reorder point is used.
      </div>

      {/* Show inactive toggle */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowInactive((v) => !v)}
          className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          {showInactive ? 'Hide inactive items' : 'Show inactive items'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Alert settings table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">SKU</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Item Name</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">
                Default Reorder Pt.
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">
                Custom Threshold
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wide">
                Alerts
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {displayedItems.map((item) => {
              const setting = settingsMap.get(item.id)
              const alertEnabled = setting?.alert_enabled ?? true
              const overrideThreshold = setting?.override_threshold ?? null
              const isEditing = editingItemId === item.id

              return (
                <tr
                  key={item.id}
                  className={cn(
                    'transition-colors',
                    item.is_active ? 'hover:bg-slate-50' : 'opacity-50'
                  )}
                >
                  {/* SKU */}
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.sku}</td>

                  {/* Name */}
                  <td className="px-4 py-3 text-slate-800">{item.name}</td>

                  {/* Default reorder point (from the item itself) */}
                  <td className="px-4 py-3 text-right text-slate-500">
                    {item.reorder_point}
                    {overrideThreshold === null && (
                      <span className="ml-1.5 text-xs text-slate-400">(in use)</span>
                    )}
                  </td>

                  {/* Custom threshold — editable inline */}
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      // Edit mode: input + save/cancel
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number"
                          min={0}
                          value={editThreshold}
                          onChange={(e) => setEditThreshold(e.target.value)}
                          placeholder={String(item.reorder_point)}
                          className="w-20 h-7 text-center text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveThreshold(item)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                        <button
                          onClick={() => saveThreshold(item)}
                          disabled={isPending}
                          className="text-green-600 hover:text-green-700"
                          title="Save"
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
                      </div>
                    ) : (
                      // View mode: show threshold (or "—" if using default) + edit button
                      <div className="flex items-center justify-end gap-2">
                        <span className={overrideThreshold !== null ? 'text-brand-navy font-medium' : 'text-slate-300'}>
                          {overrideThreshold !== null ? overrideThreshold : '—'}
                        </span>
                        <button
                          onClick={() => startEditThreshold(item)}
                          className="text-slate-300 hover:text-brand-navy transition-colors"
                          title="Set custom threshold"
                          disabled={isPending}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Alerts enabled toggle */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleAlert(item)}
                      disabled={isPending}
                      title={alertEnabled ? 'Alerts on — click to disable' : 'Alerts off — click to enable'}
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full transition-colors',
                        alertEnabled
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      )}
                    >
                      {alertEnabled ? (
                        <><Bell className="h-3 w-3" /> On</>
                      ) : (
                        <><BellOff className="h-3 w-3" /> Off</>
                      )}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}
