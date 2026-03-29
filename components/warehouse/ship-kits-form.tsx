'use client'

// -----------------------------------------------------------------------------
// Ship Kits Form — Pick-List with Editable Quantities (Industrial Grid)
// -----------------------------------------------------------------------------
// Uses the same 1fr 3fr 1fr 1.5fr grid as the Receive worksheet for the
// pick-list columns: Check+SKU | Name | Need | Ship Qty
//
// Partial shipments: staff can lower any qty → amber highlight.
// Tap each row to mark "Pulled" → row turns red.
// Fixed footer "Finish" button at the bottom of the viewport.
// -----------------------------------------------------------------------------

import { useState, useEffect, useTransition } from 'react'
import { shipKitPartial } from '@/app/(protected)/warehouse/actions'
import { AlertTriangle, Send, CheckCircle } from 'lucide-react'
import type { Language } from './warehouse-ui'

type KitType = { id: string; name: string }
type BomItem = {
  kit_type_id: string; item_id: string; quantity_required: number
  items: { sku: string; name: string; unit_of_measure: string } | null
}
type InventoryItem = { item_id: string; quantity_on_hand: number }
type StockWarning = { itemName: string; sku: string; onHand: number; shipping: number }

type Props = {
  kitTypes: KitType[]; bomItems: BomItem[]; inventory: InventoryItem[]; lang: Language
}

// Grid for pick-list: check+SKU | Name | Need | Ship Qty
const PICK_GRID = '1.2fr 3fr 1fr 1.5fr'

const TEXT = {
  en: {
    title: 'Ship a Kit',
    subtitle: 'Pick a kit, enter how many, then check each item.',
    kitLabel: 'Kit Type', howMany: 'How many kits?',
    notesLabel: 'Notes', optional: 'optional', noKits: 'No kits',
    pickTitle: 'Pick List — Tap when in the box',
    qtyLabel: 'How many did you find?',
    colSku: 'SKU', colName: 'Name', colNeed: 'Need', colShip: 'Ship Qty',
    allPulled: 'All checked!',
    noBom: 'This kit has no items. Add items in the BOM Manager.',
    tapAll: (n: number) => `Check all ${n} items first`,
    finish: (n: number) => `Finish Shipping (${n} kit${n !== 1 ? 's' : ''})`,
    shipping: 'Shipping...', confirmTitle: 'Confirm Shipment',
    confirmPartial: 'Some items have less than the full amount (partial shipment).',
    warnTitle: (n: number) => `Warning: ${n} item${n !== 1 ? 's' : ''} would go below zero`,
    allGood: 'All items have enough stock.',
    yesShip: 'Yes, Ship It', cancel: 'Cancel',
    qtyError: 'Enter how many kits.', tapError: 'Check every item first!',
    successMsg: (n: number, name: string, items: number) =>
      `Shipped ${n} × ${name}! ${items} items updated.`,
    partial: 'PARTIAL', have: 'have',
  },
  es: {
    title: 'Enviar un Kit',
    subtitle: 'Elija un kit, escriba cuantos, luego revise cada objeto.',
    kitLabel: 'Tipo de Kit', howMany: '¿Cuantos kits?',
    notesLabel: 'Notas', optional: 'opcional', noKits: 'No hay kits',
    pickTitle: 'Lista — Toque cuando este en la caja',
    qtyLabel: '¿Cuantos encontro?',
    colSku: 'SKU', colName: 'Nombre', colNeed: 'Necesita', colShip: 'Enviar',
    allPulled: '¡Todo listo!',
    noBom: 'Este kit no tiene objetos.',
    tapAll: (n: number) => `Revise los ${n} objetos primero`,
    finish: (n: number) => `Terminar Envio (${n} kit${n !== 1 ? 's' : ''})`,
    shipping: 'Enviando...', confirmTitle: 'Confirmar Envio',
    confirmPartial: 'Algunos objetos tienen menos (envio parcial).',
    warnTitle: (n: number) => `Aviso: ${n} objeto${n !== 1 ? 's' : ''} en negativo`,
    allGood: 'Todos tienen suficiente.',
    yesShip: 'Si, Enviar', cancel: 'Cancelar',
    qtyError: 'Escriba cuantos kits.', tapError: '¡Revise cada objeto!',
    successMsg: (n: number, name: string, items: number) =>
      `¡Enviado ${n} × ${name}! ${items} objetos.`,
    partial: 'PARCIAL', have: 'tiene',
  },
}

export default function ShipKitsForm({ kitTypes, bomItems, inventory, lang }: Props) {
  const [selectedKitId, setSelectedKitId] = useState(kitTypes[0]?.id ?? '')
  const [numKits, setNumKits] = useState('')
  const [notes, setNotes] = useState('')
  const [pulledItems, setPulledItems] = useState<Set<string>>(new Set())
  const [itemQtys, setItemQtys] = useState<Record<string, string>>({})
  const [showConfirm, setShowConfirm] = useState(false)
  const [warnings, setWarnings] = useState<StockWarning[] | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const t = TEXT[lang]
  const selectedKit = kitTypes.find((k) => k.id === selectedKitId)
  const inventoryMap = new Map(inventory.map((i) => [i.item_id, i.quantity_on_hand]))
  const numKitsParsed = parseInt(numKits) || 0

  const currentBomItems = bomItems
    .filter((b) => b.kit_type_id === selectedKitId && b.items)
    .sort((a, b) => (a.items?.sku ?? '').localeCompare(b.items?.sku ?? ''))

  const totalItems = currentBomItems.length
  const pulledCount = currentBomItems.filter((b) => pulledItems.has(b.item_id)).length
  const allPulled = totalItems > 0 && pulledCount === totalItems

  const hasPartials = currentBomItems.some((bom) => {
    const entered = parseInt(itemQtys[bom.item_id] ?? '0') || 0
    const needed = bom.quantity_required * numKitsParsed
    return entered > 0 && entered < needed
  })

  // Auto-fill quantities when numKits changes
  useEffect(() => {
    if (numKitsParsed > 0) {
      const defaults: Record<string, string> = {}
      for (const bom of currentBomItems) {
        defaults[bom.item_id] = String(bom.quantity_required * numKitsParsed)
      }
      setItemQtys(defaults)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numKits, selectedKitId])

  function togglePulled(itemId: string) {
    setPulledItems((p) => {
      const n = new Set(p)
      if (n.has(itemId)) n.delete(itemId)
      else n.add(itemId)
      return n
    })
  }
  function handleKitChange(kitId: string) {
    setSelectedKitId(kitId); setPulledItems(new Set()); setItemQtys({})
    setError(null); setSuccessMessage(null); setShowConfirm(false); setWarnings(null)
  }

  function handleCheckAndSubmit() {
    setSuccessMessage(null); setError(null)
    if (numKitsParsed < 1) { setError(t.qtyError); return }
    if (!allPulled) { setError(t.tapError); return }

    const stockWarnings: StockWarning[] = currentBomItems
      .map((bom) => {
        const onHand = inventoryMap.get(bom.item_id) ?? 0
        const shipping = parseInt(itemQtys[bom.item_id] ?? '0') || 0
        if (shipping > 0 && onHand - shipping < 0) {
          return { itemName: bom.items!.name, sku: bom.items!.sku, onHand, shipping }
        }
        return null
      })
      .filter((w): w is StockWarning => w !== null)
    setWarnings(stockWarnings)
    setShowConfirm(true)
  }

  function handleConfirmShip() {
    const items = currentBomItems.map((bom) => ({
      itemId: bom.item_id, quantity: parseInt(itemQtys[bom.item_id] ?? '0') || 0,
    }))
    startTransition(async () => {
      const result = await shipKitPartial({
        kitTypeId: selectedKitId, kitName: selectedKit?.name ?? 'Kit',
        numKits: numKitsParsed, items, notes,
      })
      if (result.error) { setError(result.error); setShowConfirm(false); return }
      setShowConfirm(false); setWarnings(null); setNumKits(''); setNotes('')
      setPulledItems(new Set()); setItemQtys({})
      setSuccessMessage(t.successMsg(numKitsParsed, selectedKit?.name ?? 'Kit', totalItems))
    })
  }

  const pickRowGrid: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: PICK_GRID, alignItems: 'center',
    minHeight: 60, borderBottom: '1px solid #fecaca',
  }

  return (
    <div style={{ paddingBottom: 100 }}>

      {/* Success */}
      {successMessage && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 12,
                       background: '#f0fdf4', border: '2px solid #bbf7d0', marginBottom: 12 }}>
          <span style={{ color: '#16a34a', fontSize: 18 }}>✓</span>
          <p style={{ color: '#166534', fontWeight: 700, fontSize: 14, margin: 0 }}>{successMessage}</p>
        </div>
      )}

      {/* Confirmation dialog */}
      {showConfirm && (
        <div style={{ borderRadius: 16, border: '2px solid #ef4444', background: '#fef2f2',
                       padding: 20, marginBottom: 12 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#000', margin: '0 0 8px' }}>{t.confirmTitle}</h3>

          {hasPartials && (
            <p style={{ fontSize: 13, color: '#d97706', fontWeight: 700, margin: '0 0 8px',
                         background: '#fffbeb', border: '1px solid #fde68a', padding: '8px 12px',
                         borderRadius: 8 }}>
              ⚠ {t.confirmPartial}
            </p>
          )}

          <div style={{ marginBottom: 12 }}>
            {currentBomItems.map((bom) => {
              const entered = parseInt(itemQtys[bom.item_id] ?? '0') || 0
              const needed = bom.quantity_required * numKitsParsed
              const isPartial = entered > 0 && entered < needed
              return (
                <div key={bom.item_id} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '4px 0',
                  fontSize: 13, borderBottom: '1px solid #fecaca',
                }}>
                  <span style={{ color: '#1e293b', fontWeight: 600 }}>{bom.items?.name}</span>
                  <span style={{ fontWeight: 800, color: isPartial ? '#d97706' : '#dc2626' }}>
                    {entered}{isPartial ? ` (of ${needed})` : ''}
                  </span>
                </div>
              )
            })}
          </div>

          {warnings && warnings.length > 0 && (
            <div style={{ borderRadius: 10, background: '#fee2e2', border: '1px solid #fca5a5',
                           padding: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800,
                             color: '#991b1b', fontSize: 13, marginBottom: 6 }}>
                <AlertTriangle style={{ width: 16, height: 16 }} />
                {t.warnTitle(warnings.length)}
              </div>
              {warnings.map((w) => (
                <div key={w.sku} style={{ display: 'flex', justifyContent: 'space-between',
                                          fontSize: 13, color: '#991b1b' }}>
                  <span style={{ fontFamily: 'monospace' }}>{w.sku}</span>
                  <span>{t.have} {w.onHand}, ship {w.shipping}</span>
                </div>
              ))}
            </div>
          )}

          {warnings && warnings.length === 0 && (
            <div style={{ borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0',
                           padding: '10px 14px', fontWeight: 700, color: '#15803d', fontSize: 13,
                           marginBottom: 12 }}>
              ✓ {t.allGood}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleConfirmShip} disabled={isPending}
              style={{ flex: 1, height: 52, borderRadius: 10, border: 'none', background: '#dc2626',
                       color: '#fff', fontSize: 15, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}>
              {isPending ? t.shipping : t.yesShip}
            </button>
            <button onClick={() => { setShowConfirm(false); setWarnings(null) }} disabled={isPending}
              style={{ flex: 1, height: 52, borderRadius: 10, border: '2px solid #fca5a5', background: '#fff',
                       color: '#dc2626', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Main form */}
      {!showConfirm && (
        <>
          {/* Kit selector card */}
          <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #dc2626',
                         padding: 16, marginBottom: 12 }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#000', margin: '0 0 4px' }}>{t.title}</h3>
            <p style={{ fontSize: 14, color: '#475569', margin: '0 0 12px', lineHeight: 1.5 }}>{t.subtitle}</p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569',
                               textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                {t.kitLabel}
              </label>
              <select value={selectedKitId} onChange={(e) => handleKitChange(e.target.value)}
                disabled={isPending || kitTypes.length === 0}
                style={{ width: '100%', height: 48, borderRadius: 10, border: '1px solid #fca5a5',
                         background: '#fff', padding: '0 14px', fontSize: 15, fontWeight: 700,
                         color: '#000', fontFamily: 'inherit', outline: 'none' }}>
                {kitTypes.length === 0 && <option>{t.noKits}</option>}
                {kitTypes.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569',
                                 textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  {t.howMany} *
                </label>
                <input type="number" inputMode="numeric" min={1} value={numKits}
                  onChange={(e) => { setNumKits(e.target.value); setError(null); setSuccessMessage(null) }}
                  placeholder="5" disabled={isPending}
                  style={{ width: '100%', height: 44, boxSizing: 'border-box', borderRadius: 10,
                           border: '1px solid #fca5a5', background: '#fff', textAlign: 'center',
                           fontSize: 18, fontWeight: 900, color: '#000', fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569',
                                 textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  {t.notesLabel} <span style={{ fontWeight: 400, color: '#9ca3af' }}>({t.optional})</span>
                </label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Order #789" disabled={isPending}
                  style={{ width: '100%', height: 44, boxSizing: 'border-box', borderRadius: 10,
                           border: '1px solid #fca5a5', background: '#fff', padding: '0 12px',
                           fontSize: 14, fontWeight: 500, color: '#000', fontFamily: 'inherit', outline: 'none' }} />
              </div>
            </div>
          </div>

          {/* Pick-list grid */}
          {currentBomItems.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #dc2626', overflow: 'hidden' }}>

              {/* Red header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                             padding: '8px 14px', background: '#dc2626', color: '#fff' }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{t.pickTitle}</span>
                <span style={{ fontSize: 12, fontWeight: 900, background: 'rgba(255,255,255,0.2)',
                               padding: '3px 10px', borderRadius: 999 }}>
                  {allPulled ? t.allPulled : `${pulledCount}/${totalItems}`}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ height: 4, background: '#fee2e2' }}>
                <div style={{ height: '100%', background: '#dc2626', transition: 'width 0.3s',
                               width: totalItems > 0 ? `${(pulledCount / totalItems) * 100}%` : '0%' }} />
              </div>

              {/* Bilingual label */}
              <div style={{ padding: '6px 14px', background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#991b1b', margin: 0 }}>
                  {t.qtyLabel}
                </p>
              </div>

              {/* Column headers */}
              <div style={{ ...pickRowGrid, minHeight: 32, background: '#fef2f2', borderBottom: '2px solid #fca5a5' }}>
                <span style={{ padding: '0 10px', fontSize: 10, fontWeight: 800, color: '#991b1b',
                                textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.colSku}</span>
                <span style={{ padding: '0 10px', fontSize: 10, fontWeight: 800, color: '#991b1b',
                                textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.colName}</span>
                <span style={{ padding: '0 6px', fontSize: 10, fontWeight: 800, color: '#991b1b',
                                textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>{t.colNeed}</span>
                <span style={{ padding: '0 6px', fontSize: 10, fontWeight: 800, color: '#991b1b',
                                textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>{t.colShip}</span>
              </div>

              {/* Item rows */}
              <div style={{ maxHeight: 'calc(100vh - 440px)', overflowY: 'auto' }}>
                {currentBomItems.map((bom) => {
                  const isPulled = pulledItems.has(bom.item_id)
                  const onHand = inventoryMap.get(bom.item_id) ?? 0
                  const needed = bom.quantity_required * numKitsParsed
                  const enteredStr = itemQtys[bom.item_id] ?? ''
                  const entered = parseInt(enteredStr) || 0
                  const isPartial = numKitsParsed > 0 && entered > 0 && entered < needed

                  return (
                    <div key={bom.item_id} style={{
                      ...pickRowGrid,
                      background: isPulled ? '#dc2626' : '#fff',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}>
                      {/* SKU + tap-to-check */}
                      <div style={{ padding: '0 6px', display: 'flex', alignItems: 'center', gap: 6 }}
                           onClick={() => togglePulled(bom.item_id)}>
                        <div style={{
                          flexShrink: 0, width: 26, height: 26, borderRadius: 999,
                          border: `2px solid ${isPulled ? '#fff' : '#d1d5db'}`,
                          background: isPulled ? 'rgba(255,255,255,0.2)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isPulled && <CheckCircle style={{ width: 16, height: 16, color: '#fff' }} />}
                        </div>
                        <span style={{ fontSize: 11, fontFamily: 'monospace',
                                        color: isPulled ? 'rgba(255,255,255,0.7)' : '#6b7280',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {bom.items?.sku}
                        </span>
                      </div>

                      {/* Name */}
                      <div style={{ padding: '0 8px', overflow: 'hidden' }}
                           onClick={() => togglePulled(bom.item_id)}>
                        <span style={{ fontSize: 13, fontWeight: 700,
                                        color: isPulled ? '#fff' : '#111827',
                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap', display: 'block' }}>
                          {bom.items?.name}
                        </span>
                        <span style={{ fontSize: 10, color: isPulled ? 'rgba(255,255,255,0.6)' : '#9ca3af' }}>
                          {t.have} {onHand}
                        </span>
                      </div>

                      {/* Need (static) */}
                      <div style={{ textAlign: 'center' }}
                           onClick={() => togglePulled(bom.item_id)}>
                        <span style={{ fontSize: 15, fontWeight: 800,
                                        color: isPulled ? 'rgba(255,255,255,0.7)' : '#6b7280' }}>
                          {needed || '—'}
                        </span>
                      </div>

                      {/* Ship Qty (editable) */}
                      <div style={{ padding: '0 6px', display: 'flex', justifyContent: 'center' }}>
                        <input
                          type="number" inputMode="numeric" min={0}
                          value={enteredStr}
                          onChange={(e) => setItemQtys((p) => ({ ...p, [bom.item_id]: e.target.value }))}
                          disabled={isPending}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '100%', maxWidth: 72, height: 42, boxSizing: 'border-box',
                            borderRadius: 8, textAlign: 'center',
                            fontSize: entered > 0 ? 18 : 16,
                            fontWeight: entered > 0 ? 900 : 400,
                            fontFamily: 'inherit', outline: 'none',
                            color: isPulled ? '#fff' : '#111827',
                            background: isPulled ? 'rgba(255,255,255,0.15)' : '#fff',
                            border: isPulled
                              ? '1px solid rgba(255,255,255,0.3)'
                              : isPartial
                                ? '2px solid #f59e0b'
                                : '1px solid #d1d5db',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* No BOM */}
          {currentBomItems.length === 0 && selectedKitId && (
            <div style={{ borderRadius: 12, border: '2px dashed #fca5a5', background: '#fef2f2',
                           padding: 32, textAlign: 'center', marginBottom: 12 }}>
              <p style={{ color: '#ef4444', fontSize: 14, fontWeight: 600, margin: 0 }}>{t.noBom}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca',
                           padding: '12px 16px', color: '#b91c1c', fontWeight: 700, fontSize: 14,
                           marginBottom: 12 }}>
              {error}
            </div>
          )}

          {/* Fixed footer — Finish Shipping */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
            background: '#fff', borderTop: '2px solid #dc2626',
            padding: '10px 16px', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
          }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <button
                onClick={handleCheckAndSubmit}
                disabled={isPending || kitTypes.length === 0 || !allPulled || numKitsParsed < 1}
                style={{
                  width: '100%', height: 52, borderRadius: 10, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 15, fontWeight: 900, fontFamily: 'inherit',
                  background: allPulled && numKitsParsed > 0 ? '#dc2626' : '#e5e7eb',
                  color: allPulled && numKitsParsed > 0 ? '#fff' : '#9ca3af',
                  boxShadow: allPulled && numKitsParsed > 0 ? '0 2px 8px rgba(220,38,38,0.3)' : 'none',
                }}
              >
                <Send style={{ width: 18, height: 18 }} />
                {!allPulled ? t.tapAll(totalItems) : isPending ? t.shipping : t.finish(numKitsParsed)}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
