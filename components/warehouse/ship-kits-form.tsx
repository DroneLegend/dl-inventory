'use client'

// -----------------------------------------------------------------------------
// Ship Kits Form
// -----------------------------------------------------------------------------
// Used when a full kit order is shipped out.
// Select a kit type and enter the number of kits — this automatically
// deducts all the component items from inventory.
//
// If any item would go negative (you'd be shipping more than you have),
// a warning is shown before the user can confirm.
// -----------------------------------------------------------------------------

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { shipKits } from '@/app/(protected)/warehouse/actions'
import { AlertTriangle, Send } from 'lucide-react'

// ---- Type definitions --------------------------------------------------------

type KitType = {
  id: string
  name: string
}

// One item in a kit's bill of materials
type BomItem = {
  kit_type_id: string
  item_id: string
  quantity_required: number
  items: {
    sku: string
    name: string
    unit_of_measure: string
  } | null
}

// Current inventory level for one item
type InventoryItem = {
  item_id: string
  quantity_on_hand: number
}

// A warning about an item that would go negative
type StockWarning = {
  itemName: string
  sku: string
  onHand: number
  needed: number
  shortfall: number
}

type Props = {
  kitTypes: KitType[]
  bomItems: BomItem[]
  inventory: InventoryItem[]
}

// ---- Main component ----------------------------------------------------------

export default function ShipKitsForm({ kitTypes, bomItems, inventory }: Props) {
  // The selected kit type
  const [selectedKitId, setSelectedKitId] = useState(kitTypes[0]?.id ?? '')

  // Number of kits to ship
  const [numKits, setNumKits] = useState('')

  // Notes field
  const [notes, setNotes] = useState('')

  // Warnings calculated before submitting (null = not calculated yet)
  const [warnings, setWarnings] = useState<StockWarning[] | null>(null)

  // Whether the confirmation dialog is showing
  const [showConfirm, setShowConfirm] = useState(false)

  // Success message shown after shipping
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Error message
  const [error, setError] = useState<string | null>(null)

  // isPending = true while the server action is running
  const [isPending, startTransition] = useTransition()

  // The currently selected kit type object
  const selectedKit = kitTypes.find((k) => k.id === selectedKitId)

  // Build a map of item_id → quantity_on_hand for quick lookups
  const inventoryMap = new Map(inventory.map((i) => [i.item_id, i.quantity_on_hand]))

  // Get BOM items for the selected kit
  const currentBomItems = bomItems.filter(
    (b) => b.kit_type_id === selectedKitId && b.items
  )

  // ---- Check stock and submit ------------------------------------------------

  function handleCheckAndSubmit() {
    setSuccessMessage(null)
    setError(null)

    const num = parseInt(numKits)
    if (isNaN(num) || num < 1) {
      setError('Please enter a number of kits greater than 0.')
      return
    }

    if (currentBomItems.length === 0) {
      setError('This kit type has no bill of materials. Add items to it in the admin dashboard first.')
      return
    }

    // Calculate which items (if any) would go negative
    const stockWarnings: StockWarning[] = currentBomItems
      .map((bom) => {
        const onHand = inventoryMap.get(bom.item_id) ?? 0
        const needed = bom.quantity_required * num
        const remaining = onHand - needed
        if (remaining < 0) {
          return {
            itemName: bom.items!.name,
            sku: bom.items!.sku,
            onHand,
            needed,
            shortfall: Math.abs(remaining),
          }
        }
        return null
      })
      .filter((w): w is StockWarning => w !== null)

    setWarnings(stockWarnings)
    setShowConfirm(true)
  }

  // ---- Execute the actual shipment -------------------------------------------

  function handleConfirmShip() {
    const num = parseInt(numKits)

    startTransition(async () => {
      const result = await shipKits({
        kitTypeId: selectedKitId,
        kitName: selectedKit?.name ?? 'Kit',
        numKits: num,
        notes,
      })

      if (result.error) {
        setError(result.error)
        setShowConfirm(false)
        return
      }

      // Success — reset the form
      setShowConfirm(false)
      setWarnings(null)
      setNumKits('')
      setNotes('')
      setSuccessMessage(
        `Shipped ${num} × ${selectedKit?.name}. Inventory updated for all ${currentBomItems.length} components.`
      )
    })
  }

  // ---- Render ----------------------------------------------------------------

  return (
    <div className="space-y-6">

      {/* Success message */}
      {successMessage && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-green-50
                        border-2 border-green-200">
          <span className="text-green-600 text-xl mt-0.5">✓</span>
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Confirmation dialog — shown when user clicks "Ship Kits" */}
      {showConfirm && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 space-y-4">

          <h3 className="text-lg font-bold text-slate-800">
            Confirm Kit Shipment
          </h3>

          {/* Summary */}
          <p className="text-slate-700">
            You are about to ship <strong>{numKits} × {selectedKit?.name}</strong>.
            This will deduct {currentBomItems.length} different items from inventory.
          </p>

          {/* Stock warnings (if any items go negative) */}
          {warnings && warnings.length > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-red-700 font-semibold">
                <AlertTriangle className="h-5 w-5" />
                Warning: {warnings.length} item{warnings.length > 1 ? 's' : ''} would go below zero
              </div>
              <div className="space-y-2">
                {warnings.map((w) => (
                  <div key={w.sku} className="flex items-center justify-between text-sm">
                    <span className="text-red-800">
                      <span className="font-mono font-medium">{w.sku}</span> — {w.itemName}
                    </span>
                    <span className="text-red-700 font-medium">
                      Have {w.onHand}, need {w.needed} (short {w.shortfall})
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-red-700 text-sm font-medium">
                You can still proceed — but these items will show negative stock.
              </p>
            </div>
          )}

          {/* No warnings — all good */}
          {warnings && warnings.length === 0 && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3
                            text-green-700 font-medium">
              ✓ All items have enough stock for this shipment.
            </div>
          )}

          {/* Confirm / Cancel buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleConfirmShip}
              disabled={isPending}
              className="flex-1 h-12 text-base font-semibold bg-brand-navy hover:bg-brand-navy/90
                         text-white rounded-xl"
            >
              {isPending ? 'Shipping…' : 'Yes, Ship Kits'}
            </Button>
            <Button
              onClick={() => { setShowConfirm(false); setWarnings(null) }}
              disabled={isPending}
              variant="outline"
              className="flex-1 h-12 text-base rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Main form */}
      {!showConfirm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">

          {/* Kit type selector */}
          <div className="space-y-2">
            <Label className="text-base font-semibold text-slate-700">Kit Type</Label>
            <select
              value={selectedKitId}
              onChange={(e) => {
                setSelectedKitId(e.target.value)
                setError(null)
                setSuccessMessage(null)
              }}
              disabled={isPending || kitTypes.length === 0}
              className="w-full h-12 rounded-xl border-2 border-slate-200 bg-white px-4 text-base
                         text-slate-800 focus:outline-none focus:border-brand-navy transition-colors
                         disabled:opacity-50"
            >
              {kitTypes.length === 0 && <option>No kit types available</option>}
              {kitTypes.map((k) => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
          </div>

          {/* BOM preview (shows what will be deducted) */}
          {currentBomItems.length > 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                This kit contains {currentBomItems.length} items
              </p>
              <div className="space-y-1.5">
                {currentBomItems
                  .sort((a, b) => (a.items?.sku ?? '').localeCompare(b.items?.sku ?? ''))
                  .map((bom) => {
                    const onHand = inventoryMap.get(bom.item_id) ?? 0
                    const needed = bom.quantity_required * (parseInt(numKits) || 0)
                    const wouldGoNegative = needed > 0 && onHand - needed < 0

                    return (
                      <div key={bom.item_id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 truncate">
                          {bom.items?.name}
                        </span>
                        <span className={`shrink-0 ml-4 font-medium ${
                          wouldGoNegative ? 'text-red-500' : 'text-slate-600'
                        }`}>
                          {bom.quantity_required}/kit
                          {numKits && parseInt(numKits) > 0 && (
                            <span className="text-slate-400 font-normal">
                              {' '}→ {needed} total
                              {wouldGoNegative && (
                                <span className="text-red-500"> ⚠</span>
                              )}
                            </span>
                          )}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Number of kits */}
          <div className="space-y-2">
            <Label htmlFor="ship-kits-num" className="text-base font-semibold text-slate-700">
              Number of Kits to Ship <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ship-kits-num"
              type="number"
              min={1}
              value={numKits}
              onChange={(e) => { setNumKits(e.target.value); setError(null); setSuccessMessage(null) }}
              placeholder="e.g. 5"
              disabled={isPending}
              className="h-12 text-lg"
            />
          </div>

          {/* Notes (optional) */}
          <div className="space-y-2">
            <Label htmlFor="ship-kits-notes" className="text-base font-semibold text-slate-700">
              Notes
              <span className="text-slate-400 font-normal text-sm ml-2">(optional)</span>
            </Label>
            <Input
              id="ship-kits-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Order #789, shipped to Springfield"
              disabled={isPending}
              className="h-12"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3
                            text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Submit button */}
          <Button
            onClick={handleCheckAndSubmit}
            disabled={isPending || kitTypes.length === 0}
            size="lg"
            className="w-full h-14 text-base font-semibold bg-brand-navy hover:bg-brand-navy/90
                       text-white rounded-xl gap-2"
          >
            <Send className="h-5 w-5" />
            Ship Kits
          </Button>

        </div>
      )}
    </div>
  )
}
