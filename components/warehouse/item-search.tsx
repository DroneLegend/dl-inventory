'use client'

// -----------------------------------------------------------------------------
// Item Search Component
// -----------------------------------------------------------------------------
// A searchable dropdown that lets warehouse staff find items by SKU or name.
// Type a few characters → see a filtered list → click to select.
// This is reused by both the Receive and Ship Individual forms.
// -----------------------------------------------------------------------------

import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

export type SearchableItem = {
  id: string
  sku: string
  name: string
  unit_of_measure: string
}

type Props = {
  items: SearchableItem[]
  value: SearchableItem | null       // the currently selected item
  onChange: (item: SearchableItem | null) => void
  placeholder?: string
  disabled?: boolean
}

export default function ItemSearch({
  items,
  value,
  onChange,
  placeholder = 'Type SKU or item name…',
  disabled = false,
}: Props) {
  // The text the user has typed in the search box
  const [query, setQuery] = useState('')

  // Whether the dropdown list is visible
  const [isOpen, setIsOpen] = useState(false)

  // Reference to the whole component so we can detect clicks outside it
  const containerRef = useRef<HTMLDivElement>(null)

  // Close the dropdown when the user clicks somewhere else on the page
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter items based on the search query (matches SKU or name, case-insensitive)
  const filtered = query.trim()
    ? items.filter((item) => {
        const q = query.toLowerCase()
        return item.sku.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
      }).slice(0, 8)  // show at most 8 results
    : items.slice(0, 8)  // no query = show first 8

  // When the user selects an item from the dropdown
  function handleSelect(item: SearchableItem) {
    onChange(item)
    setQuery('')
    setIsOpen(false)
  }

  // Clear the current selection
  function handleClear() {
    onChange(null)
    setQuery('')
    setIsOpen(false)
  }

  // ---- Render ----------------------------------------------------------------

  // If an item is already selected, show it as a "chip" with a clear button
  if (value) {
    return (
      <div className="flex items-center gap-2 h-12 px-4 rounded-xl border-2 border-brand-navy/20
                      bg-brand-navy/5 text-slate-800">
        <div className="flex-1 min-w-0">
          {/* Item name */}
          <p className="font-semibold text-slate-800 truncate">{value.name}</p>
          {/* SKU + unit */}
          <p className="text-xs text-slate-500">{value.sku} · {value.unit_of_measure}</p>
        </div>
        {/* Clear button */}
        {!disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-400 hover:text-slate-700 transition-colors shrink-0"
            title="Clear selection"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    )
  }

  // No item selected — show the search input + dropdown
  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-slate-200 bg-white
                     text-slate-800 placeholder-slate-400 text-base
                     focus:outline-none focus:border-brand-navy
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        />
      </div>

      {/* Dropdown list */}
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white rounded-xl border border-slate-200
                        shadow-lg overflow-hidden">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => {
                // Use onMouseDown instead of onClick so it fires before onBlur
                e.preventDefault()
                handleSelect(item)
              }}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors
                         flex items-center gap-3 border-b border-slate-50 last:border-0"
            >
              {/* SKU badge */}
              <span className="shrink-0 text-xs font-mono font-medium bg-slate-100
                               text-slate-600 px-2 py-0.5 rounded">
                {item.sku}
              </span>
              {/* Item name */}
              <span className="text-slate-800 text-sm truncate">{item.name}</span>
              {/* Unit */}
              <span className="text-slate-400 text-xs ml-auto shrink-0">{item.unit_of_measure}</span>
            </button>
          ))}
        </div>
      )}

      {/* "No results" message */}
      {isOpen && query.trim() && filtered.length === 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white rounded-xl border border-slate-200
                        shadow-lg px-4 py-3 text-slate-400 text-sm">
          No items match &quot;{query}&quot;
        </div>
      )}
    </div>
  )
}
