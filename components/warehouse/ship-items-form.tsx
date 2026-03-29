'use client'

// -----------------------------------------------------------------------------
// Ship Individual Items Form
// -----------------------------------------------------------------------------
// Used when single items ship out — not a full kit.
// Red accent styling to match the "Ship" color language.
// Bilingual, 60px+ touch targets, high-contrast text.
// -----------------------------------------------------------------------------

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ItemSearch, { type SearchableItem } from './item-search'
import SuccessToast from './success-toast'
import { shipIndividualItem, undoTransaction } from '@/app/(protected)/warehouse/actions'
import { Send } from 'lucide-react'
import type { Language } from './warehouse-ui'

type Props = {
  items: SearchableItem[]
  inventory: { item_id: string; quantity_on_hand: number }[]
  lang: Language
}

const TEXT = {
  en: {
    title: 'Ship One Item',
    subtitle: 'Pick the item that is leaving. Type how many. Press save.',
    itemLabel: 'Item',
    stockLabel: 'In stock now:',
    qtyLabel: 'How many are leaving?',
    refLabel: 'Reference',
    notesLabel: 'Notes',
    optional: 'optional',
    search: 'Search items...',
    negWarn: (n: number) => `Not enough in stock (only ${n}). You can still save.`,
    submit: 'Save Shipment',
    saving: 'Saving...',
    itemError: 'Pick an item first.',
    qtyError: 'Type how many are leaving.',
  },
  es: {
    title: 'Enviar un Objeto',
    subtitle: 'Elija el objeto que sale. Escriba cuantos. Presione guardar.',
    itemLabel: 'Objeto',
    stockLabel: 'En inventario:',
    qtyLabel: '¿Cuantos salen?',
    refLabel: 'Referencia',
    notesLabel: 'Notas',
    optional: 'opcional',
    search: 'Buscar objetos...',
    negWarn: (n: number) => `No hay suficiente (solo ${n}). Puede guardar si es necesario.`,
    submit: 'Guardar Envio',
    saving: 'Guardando...',
    itemError: 'Elija un objeto primero.',
    qtyError: 'Escriba cuantos salen.',
  },
}

const UNDO_WINDOW = 30

export default function ShipItemsForm({ items, inventory, lang }: Props) {
  const [selectedItem, setSelectedItem] = useState<SearchableItem | null>(null)
  const [quantity, setQuantity] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    message: string; transactionId: string; secondsLeft: number
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  const t = TEXT[lang]
  const inventoryMap = new Map(inventory.map((i) => [i.item_id, i.quantity_on_hand]))

  useEffect(() => {
    if (!toast || toast.secondsLeft <= 0) return
    const timer = setTimeout(() => {
      setToast((prev) => (prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : null))
    }, 1000)
    return () => clearTimeout(timer)
  }, [toast])

  const onHand = selectedItem ? (inventoryMap.get(selectedItem.id) ?? 0) : null
  const qty = parseInt(quantity)
  const wouldGoNegative = onHand !== null && !isNaN(qty) && qty > 0 && qty > onHand

  function handleSubmit() {
    if (!selectedItem) { setError(t.itemError); return }
    if (isNaN(qty) || qty < 1) { setError(t.qtyError); return }
    setError(null)

    startTransition(async () => {
      const result = await shipIndividualItem({
        itemId: selectedItem.id, quantity: qty, reference, notes,
      })
      if (result.error) { setError(result.error); return }

      setToast({
        message: `Shipped ${qty} × ${selectedItem.name}`,
        transactionId: result.transactionId!,
        secondsLeft: UNDO_WINDOW,
      })
      setSelectedItem(null)
      setQuantity('')
      setReference('')
      setNotes('')
    })
  }

  function handleUndo() {
    if (!toast) return
    const id = toast.transactionId
    setToast(null)
    startTransition(async () => {
      const result = await undoTransaction(id)
      if (result.error) setError(`Undo failed: ${result.error}`)
    })
  }

  return (
    <div className="space-y-3">
      {toast && (
        <SuccessToast
          message={toast.message}
          secondsLeft={toast.secondsLeft}
          onUndo={handleUndo}
          onDismiss={() => setToast(null)}
        />
      )}

      <div className="bg-white rounded-2xl border-2 border-red-500 p-4 sm:p-5 space-y-4">
        <h3 className="text-lg font-black text-black">{t.title}</h3>
        <p className="text-sm text-slate-600 leading-snug">{t.subtitle}</p>

        {/* Item selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            {t.itemLabel} *
          </label>
          <ItemSearch
            items={items}
            value={selectedItem}
            onChange={(item) => { setSelectedItem(item); setError(null) }}
            placeholder={t.search}
            disabled={isPending}
          />
          {selectedItem && onHand !== null && (
            <p className="text-sm text-slate-600 font-medium">
              {t.stockLabel}{' '}
              <strong className={onHand === 0 ? 'text-red-600' : 'text-black'}>
                {onHand} {selectedItem.unit_of_measure}
              </strong>
            </p>
          )}
        </div>

        {/* Quantity */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            {t.qtyLabel} *
          </label>
          <Input
            type="number" inputMode="numeric" min={1}
            value={quantity}
            onChange={(e) => { setQuantity(e.target.value); setError(null) }}
            placeholder="10"
            disabled={isPending}
            className="h-14 text-lg font-bold border-2 border-red-200 focus:border-red-500 rounded-xl"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
          />
          {wouldGoNegative && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800 text-sm font-medium">
              ⚠ {t.negWarn(onHand!)}
            </div>
          )}
        </div>

        {/* Reference */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            {t.refLabel} <span className="font-normal text-slate-400">({t.optional})</span>
          </label>
          <Input
            value={reference} onChange={(e) => setReference(e.target.value)}
            placeholder="Order #5678"
            disabled={isPending}
            className="h-12 border-2 border-red-200 focus:border-red-500 rounded-xl"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            {t.notesLabel} <span className="font-normal text-slate-400">({t.optional})</span>
          </label>
          <Input
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Replacement parts"
            disabled={isPending}
            className="h-12 border-2 border-red-200 focus:border-red-500 rounded-xl"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 font-semibold text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={isPending}
          size="lg"
          className="w-full h-16 text-base font-black bg-red-600 hover:bg-red-700
                     text-white rounded-xl gap-2"
        >
          <Send className="h-5 w-5" />
          {isPending ? t.saving : t.submit}
        </Button>
      </div>
    </div>
  )
}
