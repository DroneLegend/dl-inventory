'use client'

// -----------------------------------------------------------------------------
// Ship Individual Items Form
// -----------------------------------------------------------------------------
// Used when individual items are shipped out — not as a full kit.
// Example: sending 10 spare batteries to a school that needs replacements.
//
// Works the same as Receive, but creates a 'consume' transaction
// (which deducts from inventory). Has the same 30-second undo window.
// -----------------------------------------------------------------------------

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ItemSearch, { type SearchableItem } from './item-search'
import SuccessToast from './success-toast'
import { shipIndividualItem, undoTransaction } from '@/app/(protected)/warehouse/actions'
import { Send } from 'lucide-react'

type Props = {
  items: SearchableItem[]
  inventory: { item_id: string; quantity_on_hand: number }[]
}

const UNDO_WINDOW = 30

export default function ShipItemsForm({ items, inventory }: Props) {
  const [selectedItem, setSelectedItem] = useState<SearchableItem | null>(null)
  const [quantity, setQuantity] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    message: string
    transactionId: string
    secondsLeft: number
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Build a map for quick inventory lookups
  const inventoryMap = new Map(inventory.map((i) => [i.item_id, i.quantity_on_hand]))

  // Tick down the toast countdown every second
  useEffect(() => {
    if (!toast || toast.secondsLeft <= 0) return
    const timer = setTimeout(() => {
      setToast((prev) => (prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : null))
    }, 1000)
    return () => clearTimeout(timer)
  }, [toast])

  // How much stock is currently on hand for the selected item
  const onHand = selectedItem ? (inventoryMap.get(selectedItem.id) ?? 0) : null
  const qty = parseInt(quantity)
  const wouldGoNegative = onHand !== null && !isNaN(qty) && qty > 0 && qty > onHand

  // ---- Submit handler --------------------------------------------------------

  function handleSubmit() {
    if (!selectedItem) {
      setError('Please select an item.')
      return
    }
    if (isNaN(qty) || qty < 1) {
      setError('Quantity must be a number greater than 0.')
      return
    }

    setError(null)

    startTransition(async () => {
      const result = await shipIndividualItem({
        itemId: selectedItem.id,
        quantity: qty,
        reference,
        notes,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      setToast({
        message: `Shipped ${qty} × ${selectedItem.name}`,
        transactionId: result.transactionId!,
        secondsLeft: UNDO_WINDOW,
      })

      // Reset form
      setSelectedItem(null)
      setQuantity('')
      setReference('')
      setNotes('')
    })
  }

  // ---- Undo handler ----------------------------------------------------------

  function handleUndo() {
    if (!toast) return
    const id = toast.transactionId
    setToast(null)
    startTransition(async () => {
      const result = await undoTransaction(id)
      if (result.error) setError(`Undo failed: ${result.error}`)
    })
  }

  // ---- Render ----------------------------------------------------------------

  return (
    <div className="space-y-6">

      {/* Success toast */}
      {toast && (
        <SuccessToast
          message={toast.message}
          secondsLeft={toast.secondsLeft}
          onUndo={handleUndo}
          onDismiss={() => setToast(null)}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">

        {/* Item selector */}
        <div className="space-y-2">
          <Label className="text-base font-semibold text-slate-700">
            Item <span className="text-red-500">*</span>
          </Label>
          <ItemSearch
            items={items}
            value={selectedItem}
            onChange={(item) => {
              setSelectedItem(item)
              setError(null)
            }}
            placeholder="Search by SKU or item name…"
            disabled={isPending}
          />
          {/* Show current stock for selected item */}
          {selectedItem && onHand !== null && (
            <p className="text-sm text-slate-500">
              Current stock: <strong className={onHand === 0 ? 'text-red-500' : 'text-slate-700'}>
                {onHand} {selectedItem.unit_of_measure}
              </strong>
            </p>
          )}
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="ship-qty" className="text-base font-semibold text-slate-700">
            Quantity to Ship <span className="text-red-500">*</span>
          </Label>
          <Input
            id="ship-qty"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => { setQuantity(e.target.value); setError(null) }}
            placeholder="e.g. 10"
            disabled={isPending}
            className="h-12 text-lg"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
          />
          {/* Warning if quantity exceeds stock */}
          {wouldGoNegative && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200
                            px-3 py-2 text-amber-800 text-sm font-medium">
              ⚠ This will bring {selectedItem!.name} below zero (only {onHand} in stock).
              You can still proceed if this is intentional.
            </div>
          )}
        </div>

        {/* Reference number (optional) */}
        <div className="space-y-2">
          <Label htmlFor="ship-ref" className="text-base font-semibold text-slate-700">
            Reference Number
            <span className="text-slate-400 font-normal text-sm ml-2">(optional)</span>
          </Label>
          <Input
            id="ship-ref"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. Order #5678"
            disabled={isPending}
            className="h-12"
          />
        </div>

        {/* Notes (optional) */}
        <div className="space-y-2">
          <Label htmlFor="ship-notes" className="text-base font-semibold text-slate-700">
            Notes
            <span className="text-slate-400 font-normal text-sm ml-2">(optional)</span>
          </Label>
          <Input
            id="ship-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Replacement parts for Springfield school"
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
          onClick={handleSubmit}
          disabled={isPending}
          size="lg"
          className="w-full h-14 text-base font-semibold bg-brand-navy hover:bg-brand-navy/90
                     text-white rounded-xl gap-2"
        >
          <Send className="h-5 w-5" />
          {isPending ? 'Saving…' : 'Record Shipment'}
        </Button>

      </div>
    </div>
  )
}
