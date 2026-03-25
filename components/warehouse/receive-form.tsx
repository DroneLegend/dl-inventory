'use client'

// -----------------------------------------------------------------------------
// Receive Inventory Form
// -----------------------------------------------------------------------------
// Warehouse staff use this to log stock arriving at the warehouse.
// Example: a delivery of 50 batteries arrives → receive 50 of STM-002.
//
// After submitting, a green banner appears with an "Undo" button.
// The undo window lasts 30 seconds, then closes automatically.
// -----------------------------------------------------------------------------

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ItemSearch, { type SearchableItem } from './item-search'
import SuccessToast from './success-toast'
import { receiveInventory, undoTransaction } from '@/app/(protected)/warehouse/actions'
import { PackagePlus } from 'lucide-react'

type Props = {
  items: SearchableItem[]
}

// How many seconds the undo window stays open
const UNDO_WINDOW = 30

export default function ReceiveForm({ items }: Props) {
  // The item the user has selected
  const [selectedItem, setSelectedItem] = useState<SearchableItem | null>(null)

  // Form field values
  const [quantity, setQuantity] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  // Validation error message
  const [error, setError] = useState<string | null>(null)

  // The success toast state (null = hidden)
  const [toast, setToast] = useState<{
    message: string
    transactionId: string
    secondsLeft: number
  } | null>(null)

  // isPending = true while the server action is running
  const [isPending, startTransition] = useTransition()

  // Tick down the toast countdown every second
  useEffect(() => {
    if (!toast || toast.secondsLeft <= 0) return
    const timer = setTimeout(() => {
      setToast((prev) => (prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : null))
    }, 1000)
    return () => clearTimeout(timer)
  }, [toast])

  // ---- Submit handler --------------------------------------------------------

  function handleSubmit() {
    // Validate inputs before sending to the server
    if (!selectedItem) {
      setError('Please select an item.')
      return
    }
    const qty = parseInt(quantity)
    if (isNaN(qty) || qty < 1) {
      setError('Quantity must be a number greater than 0.')
      return
    }

    setError(null)

    startTransition(async () => {
      const result = await receiveInventory({
        itemId: selectedItem.id,
        quantity: qty,
        reference,
        notes,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      // Show success toast with undo
      setToast({
        message: `Received ${qty} × ${selectedItem.name}`,
        transactionId: result.transactionId!,
        secondsLeft: UNDO_WINDOW,
      })

      // Reset the form for the next entry
      setSelectedItem(null)
      setQuantity('')
      setReference('')
      setNotes('')
    })
  }

  // ---- Undo handler ----------------------------------------------------------

  function handleUndo() {
    if (!toast) return
    const transactionId = toast.transactionId

    // Dismiss the toast immediately (optimistic)
    setToast(null)

    startTransition(async () => {
      const result = await undoTransaction(transactionId)
      if (result.error) {
        // Undo failed — show an error
        setError(`Undo failed: ${result.error}`)
      }
    })
  }

  // ---- Render ----------------------------------------------------------------

  return (
    <div className="space-y-6">

      {/* Success toast — appears after a successful submit */}
      {toast && (
        <SuccessToast
          message={toast.message}
          secondsLeft={toast.secondsLeft}
          onUndo={handleUndo}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">

        {/* Item selector */}
        <div className="space-y-2">
          <Label className="text-base font-semibold text-slate-700">
            Item <span className="text-red-500">*</span>
          </Label>
          <ItemSearch
            items={items}
            value={selectedItem}
            onChange={setSelectedItem}
            placeholder="Search by SKU or item name…"
            disabled={isPending}
          />
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="receive-qty" className="text-base font-semibold text-slate-700">
            Quantity Received <span className="text-red-500">*</span>
          </Label>
          <Input
            id="receive-qty"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 50"
            disabled={isPending}
            className="h-12 text-lg"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
          />
          {/* Show units if an item is selected */}
          {selectedItem && (
            <p className="text-sm text-slate-500">
              Unit: {selectedItem.unit_of_measure}
            </p>
          )}
        </div>

        {/* Reference number (optional) */}
        <div className="space-y-2">
          <Label htmlFor="receive-ref" className="text-base font-semibold text-slate-700">
            Reference Number
            <span className="text-slate-400 font-normal text-sm ml-2">(optional — e.g. PO #1234)</span>
          </Label>
          <Input
            id="receive-ref"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. PO-1234"
            disabled={isPending}
            className="h-12"
          />
        </div>

        {/* Notes (optional) */}
        <div className="space-y-2">
          <Label htmlFor="receive-notes" className="text-base font-semibold text-slate-700">
            Notes
            <span className="text-slate-400 font-normal text-sm ml-2">(optional)</span>
          </Label>
          <Input
            id="receive-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Came with March delivery"
            disabled={isPending}
            className="h-12"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 font-medium">
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
          <PackagePlus className="h-5 w-5" />
          {isPending ? 'Saving…' : 'Record Receipt'}
        </Button>

      </div>
    </div>
  )
}
