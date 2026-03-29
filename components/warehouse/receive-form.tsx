'use client'

// -----------------------------------------------------------------------------
// Batch Receive Form — "Industrial Grid" Worksheet
// -----------------------------------------------------------------------------
// Uses CSS Grid with exact fractional widths: 1fr 3fr 1fr 1.5fr 2fr
// for SKU | Name | Unit | Qty | Notes — laser-aligned columns.
//
// - White inputs with thin 1px border, bold dark text when filled
// - 60px rows with light-grey ledger lines between them
// - Fixed "Record All" bar at the very bottom of the viewport
// - Bilingual 4th-grade labels
// -----------------------------------------------------------------------------

import { useState, useTransition } from 'react'
import { batchReceiveInventory } from '@/app/(protected)/warehouse/actions'
import { PackagePlus, Search, RotateCcw } from 'lucide-react'
import type { Language } from './warehouse-ui'

type Item = { id: string; sku: string; name: string; unit_of_measure: string }
type Props = { items: Item[]; lang: Language }

// The exact grid template used for both headers and rows
const GRID = '1fr 3fr 1fr 1.5fr 2fr'

const TEXT = {
  en: {
    title: 'How many did you get?',
    subtitle: 'Type a number for each item you received. Then press the button at the bottom.',
    search: 'Search items...',
    noResults: 'No items match your search.',
    countLabel: (n: number) => `${n} item${n !== 1 ? 's' : ''} filled in`,
    submit: (n: number) => `Record All (${n})`,
    saving: 'Saving...',
    emptyError: 'Type a number next to at least one item.',
    successMsg: (c: number, t: number) => `Saved! ${c} item${c > 1 ? 's' : ''}, ${t} total received.`,
  },
  es: {
    title: '¿Cuantos recibio?',
    subtitle: 'Escriba un numero para cada objeto que recibio. Luego presione el boton de abajo.',
    search: 'Buscar objetos...',
    noResults: 'Ningun objeto coincide.',
    countLabel: (n: number) => `${n} objeto${n !== 1 ? 's' : ''} con cantidad`,
    submit: (n: number) => `Guardar Todo (${n})`,
    saving: 'Guardando...',
    emptyError: 'Escriba un numero junto a un objeto.',
    successMsg: (c: number, t: number) => `¡Guardado! ${c} objeto${c > 1 ? 's' : ''}, ${t} piezas.`,
  },
}

const COLS = {
  en: ['SKU', 'Name', 'Unit', 'Qty', 'Notes'],
  es: ['SKU', 'Nombre', 'Unidad', 'Cant.', 'Notas'],
}

// Text alignment per column: left for SKU/Name, center for the rest
const COL_ALIGN: React.CSSProperties['textAlign'][] = ['left', 'left', 'center', 'center', 'center']

export default function ReceiveForm({ items, lang }: Props) {
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const t = TEXT[lang]
  const cols = COLS[lang]
  const filledCount = Object.values(quantities).filter((v) => v && parseInt(v) > 0).length

  const filtered = search.trim()
    ? items.filter((item) => {
        const q = search.toLowerCase()
        return item.sku.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
      })
    : items

  function setQty(id: string, val: string) {
    setQuantities((p) => ({ ...p, [id]: val })); setError(null); setSuccess(null)
  }
  function setNote(id: string, val: string) {
    setItemNotes((p) => ({ ...p, [id]: val }))
  }
  function handleReset() {
    setQuantities({}); setItemNotes({}); setError(null); setSuccess(null)
  }
  function handleSubmit() {
    setError(null); setSuccess(null)
    const entries = Object.entries(quantities)
      .map(([itemId, val]) => ({ itemId, quantity: parseInt(val) || 0 }))
      .filter((e) => e.quantity > 0)
    if (entries.length === 0) { setError(t.emptyError); return }
    const noteParts = entries.map((e) => {
      const note = itemNotes[e.itemId]?.trim()
      if (!note) return null
      const item = items.find((i) => i.id === e.itemId)
      return `${item?.sku ?? '?'}: ${note}`
    }).filter(Boolean)
    startTransition(async () => {
      const result = await batchReceiveInventory({ entries, notes: noteParts.join(' | ') })
      if (result.error) { setError(result.error); return }
      const total = entries.reduce((s, e) => s + e.quantity, 0)
      setSuccess(t.successMsg(entries.length, total))
      setQuantities({}); setItemNotes({})
    })
  }

  // Shared row grid style
  const rowGrid: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: GRID, alignItems: 'center',
    minHeight: 60, borderBottom: '1px solid #e5e7eb',
  }

  return (
    // Extra bottom padding so the fixed footer doesn't cover the last rows
    <div style={{ paddingBottom: 100 }}>

      {/* Success */}
      {success && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 12,
                       background: '#f0fdf4', border: '2px solid #bbf7d0', marginBottom: 12 }}>
          <span style={{ color: '#16a34a', fontSize: 18 }}>✓</span>
          <p style={{ color: '#166534', fontWeight: 700, fontSize: 14, margin: 0 }}>{success}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: '#fef2f2',
                       border: '1px solid #fecaca', color: '#b91c1c', fontWeight: 700,
                       fontSize: 14, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Header card */}
      <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #1B2A4A',
                     padding: 16, marginBottom: 12 }}>
        <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>{t.title}</h3>
        <p style={{ fontSize: 14, color: '#475569', margin: '0 0 12px', lineHeight: 1.5 }}>{t.subtitle}</p>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                           width: 18, height: 18, color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t.search}
            style={{ width: '100%', height: 44, paddingLeft: 40, paddingRight: 16,
                     borderRadius: 12, border: '1px solid #d1d5db', background: '#fff',
                     fontSize: 14, fontWeight: 500, color: '#0f172a', fontFamily: 'inherit',
                     outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Worksheet grid */}
      <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #1B2A4A', overflow: 'hidden' }}>

        {/* Dark header row */}
        <div style={{ ...rowGrid, minHeight: 40, background: '#1B2A4A', borderBottom: '2px solid #F5A623' }}>
          {cols.map((label, i) => (
            <span key={i} style={{
              padding: '0 10px', color: '#fff', fontSize: 11, fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              textAlign: COL_ALIGN[i],
            }}>
              {label}
            </span>
          ))}
        </div>

        {/* Scrollable rows */}
        <div style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
          {filtered.map((item) => {
            const val = quantities[item.id] ?? ''
            const hasValue = val && parseInt(val) > 0

            return (
              <div key={item.id} style={{ ...rowGrid, background: hasValue ? '#f9fafb' : '#fff' }}>
                {/* SKU */}
                <span style={{ padding: '0 10px', fontSize: 12, fontFamily: 'monospace',
                                color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap' }}>
                  {item.sku}
                </span>

                {/* Name */}
                <span style={{ padding: '0 10px', fontSize: 14, fontWeight: 700, color: '#111827',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </span>

                {/* Unit */}
                <span style={{ padding: '0 6px', fontSize: 12, color: '#6b7280',
                                textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {item.unit_of_measure}
                </span>

                {/* Qty input — white bg, thin border, bold when filled */}
                <div style={{ padding: '0 6px', display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="number" inputMode="numeric" min={0}
                    value={val}
                    onChange={(e) => setQty(item.id, e.target.value)}
                    placeholder="0"
                    disabled={isPending}
                    style={{
                      width: '100%', maxWidth: 70, height: 42, boxSizing: 'border-box',
                      border: hasValue ? '2px solid #1B2A4A' : '1px solid #d1d5db',
                      borderRadius: 8, background: '#fff', textAlign: 'center',
                      fontSize: hasValue ? 18 : 16,
                      fontWeight: hasValue ? 900 : 400,
                      color: '#111827', fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                </div>

                {/* Notes input — white bg, thin border */}
                <div style={{ padding: '0 6px' }}>
                  <input
                    type="text"
                    value={itemNotes[item.id] ?? ''}
                    onChange={(e) => setNote(item.id, e.target.value)}
                    placeholder="—"
                    disabled={isPending}
                    style={{
                      width: '100%', height: 36, boxSizing: 'border-box',
                      border: '1px solid #d1d5db', borderRadius: 8,
                      background: '#fff', textAlign: 'center',
                      fontSize: 12, fontWeight: 500, color: '#374151',
                      fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            {t.noResults}
          </div>
        )}
      </div>

      {/* Fixed footer bar — stuck to the bottom of the viewport */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: '#fff', borderTop: '2px solid #1B2A4A',
        padding: '10px 16px', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Count */}
          <span style={{ fontSize: 14, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>{filledCount}</span>{' '}
            {t.countLabel(filledCount)}
          </span>

          <div style={{ flex: 1 }} />

          {/* Reset */}
          <button
            onClick={handleReset}
            disabled={isPending || filledCount === 0}
            style={{
              width: 48, height: 48, borderRadius: 10,
              border: '1px solid #d1d5db', background: '#fff',
              color: '#6b7280', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: filledCount === 0 ? 0.3 : 1,
            }}
          >
            <RotateCcw style={{ width: 18, height: 18 }} />
          </button>

          {/* Record All */}
          <button
            onClick={handleSubmit}
            disabled={isPending || filledCount === 0}
            style={{
              height: 48, borderRadius: 10, padding: '0 24px',
              border: 'none', background: '#1B2A4A', color: '#fff',
              fontSize: 15, fontWeight: 900, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: filledCount === 0 ? 0.3 : 1,
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            <PackagePlus style={{ width: 18, height: 18 }} />
            {isPending ? t.saving : t.submit(filledCount)}
          </button>
        </div>
      </div>
    </div>
  )
}
