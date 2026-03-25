'use client'

// -----------------------------------------------------------------------------
// Inventory Overview
// -----------------------------------------------------------------------------
// Shows a table of every item with its current stock level.
// Click any row to expand it and see that item's full transaction history
// (receives, consumes, adjustments, returns).
// -----------------------------------------------------------------------------

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { getItemTransactions } from '@/app/(protected)/dashboard/actions'
import { cn } from '@/lib/utils'

// ---- Type definitions --------------------------------------------------------

// One row from the current_inventory database view
type InventoryItem = {
  item_id: string
  sku: string
  name: string
  description: string | null
  unit_of_measure: string
  reorder_point: number
  is_active: boolean
  quantity_on_hand: number
  is_low_stock: boolean
}

// One transaction record (with the user who created it)
type Transaction = {
  id: string
  transaction_type: string
  quantity: number
  notes: string | null
  created_at: string
  profiles: { full_name: string | null; email: string } | null
}

type Props = {
  inventory: InventoryItem[]
}

// ---- Helper functions --------------------------------------------------------

// Format a date string as a readable local date+time
function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Map a transaction type to a readable label and color
function getTransactionStyle(type: string): { label: string; className: string } {
  switch (type) {
    case 'receive':
      return { label: 'Receive', className: 'bg-green-100 text-green-700' }
    case 'consume':
      return { label: 'Consume', className: 'bg-red-100 text-red-600' }
    case 'adjust':
      return { label: 'Adjust', className: 'bg-blue-100 text-blue-700' }
    case 'return':
      return { label: 'Return', className: 'bg-purple-100 text-purple-700' }
    default:
      return { label: type, className: 'bg-slate-100 text-slate-600' }
  }
}

// ---- Main component ----------------------------------------------------------

export default function InventoryOverview({ inventory }: Props) {
  // ID of the currently expanded item row (null = none expanded)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  // Loaded transaction history, keyed by item_id
  const [transactionCache, setTransactionCache] = useState<Record<string, Transaction[]>>({})

  // isPending = true while transactions are being loaded
  const [isPending, startTransition] = useTransition()

  // Search/filter state
  const [search, setSearch] = useState('')

  // Filter: 'all', 'low', 'active', 'inactive'
  const [filter, setFilter] = useState<'all' | 'low' | 'active' | 'inactive'>('active')

  // Apply filters and search
  const displayedItems = inventory
    .filter((item) => {
      if (filter === 'active') return item.is_active
      if (filter === 'inactive') return !item.is_active
      if (filter === 'low') return item.is_low_stock && item.is_active
      return true // 'all'
    })
    .filter((item) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return item.sku.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
    })
    .sort((a, b) => a.sku.localeCompare(b.sku))

  // Count low-stock items for the filter badge
  const lowStockCount = inventory.filter((i) => i.is_low_stock && i.is_active).length

  // Toggle a row's expanded state, loading transactions on first open
  function toggleRow(itemId: string) {
    if (expandedItemId === itemId) {
      // Close the currently open row
      setExpandedItemId(null)
      return
    }

    // Open this row
    setExpandedItemId(itemId)

    // Load transactions if we haven't already (cache them to avoid repeated fetches)
    if (!transactionCache[itemId]) {
      startTransition(async () => {
        const result = await getItemTransactions(itemId)
        if (result.data) {
          setTransactionCache((prev) => ({ ...prev, [itemId]: result.data! }))
        }
      })
    }
  }

  // ---- Render ----------------------------------------------------------------

  return (
    <div className="space-y-4">

      {/* Search and filter controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search box */}
        <input
          type="text"
          placeholder="Search by SKU or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
        />

        {/* Filter buttons */}
        <div className="flex gap-1">
          {(['active', 'all', 'low', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filter === f
                  ? 'bg-brand-navy text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {f === 'low' ? (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Low stock
                  {lowStockCount > 0 && (
                    <span className="bg-red-500 text-white rounded-full px-1.5 py-0 text-[10px] font-bold">
                      {lowStockCount}
                    </span>
                  )}
                </span>
              ) : (
                f.charAt(0).toUpperCase() + f.slice(1)
              )}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 ml-auto">
          {displayedItems.length} item{displayedItems.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Inventory table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {displayedItems.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-400 text-sm">No items match your search or filter.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {/* Expand chevron column */}
                <th className="w-10" />
                <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">SKU</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Item Name</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">On Hand</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">Reorder Point</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wide">Stock Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedItems.map((item) => {
                // Note: this data comes from the current_inventory VIEW which uses
                // 'item_id' as the primary key field name (not 'id')
                const isExpanded = expandedItemId === item.item_id
                const transactions = transactionCache[item.item_id]

                return (
                  <>
                    {/* Main item row — clickable to expand */}
                    <tr
                      key={item.item_id}
                      onClick={() => toggleRow(item.item_id)}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isExpanded
                          ? 'bg-brand-navy/5 border-b-0'
                          : 'hover:bg-slate-50'
                      )}
                    >
                      {/* Expand/collapse chevron */}
                      <td className="pl-4 py-3 text-slate-400">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </td>

                      {/* SKU */}
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.sku}</td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          'font-medium',
                          item.is_active ? 'text-slate-800' : 'text-slate-400'
                        )}>
                          {item.name}
                        </span>
                        {!item.is_active && (
                          <span className="ml-2 text-xs text-slate-400">(inactive)</span>
                        )}
                      </td>

                      {/* On hand quantity */}
                      <td className={cn(
                        'px-4 py-3 text-right font-semibold',
                        item.is_low_stock ? 'text-red-600' : 'text-slate-700'
                      )}>
                        {item.quantity_on_hand}
                        <span className="font-normal text-slate-400 ml-1 text-xs">
                          {item.unit_of_measure}
                        </span>
                      </td>

                      {/* Reorder point */}
                      <td className="px-4 py-3 text-right text-slate-500">
                        {item.reorder_point}
                      </td>

                      {/* Stock status badge */}
                      <td className="px-4 py-3 text-center">
                        {item.is_low_stock ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">
                            <AlertTriangle className="h-3 w-3" />
                            Low stock
                          </span>
                        ) : (
                          <span className="inline-block bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded transaction history row */}
                    {isExpanded && (
                      <tr key={`${item.item_id}-history`}>
                        <td colSpan={6} className="px-6 pb-4 pt-2 bg-brand-navy/5 border-b border-slate-200">
                          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">

                            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                Transaction History (last 50)
                              </h4>
                            </div>

                            {/* Loading state */}
                            {isPending && !transactions && (
                              <div className="p-6 text-center text-sm text-slate-400">
                                Loading transactions…
                              </div>
                            )}

                            {/* No transactions yet */}
                            {!isPending && transactions && transactions.length === 0 && (
                              <div className="p-6 text-center text-sm text-slate-400">
                                No transactions recorded for this item yet.
                              </div>
                            )}

                            {/* Transaction list */}
                            {transactions && transactions.length > 0 && (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-slate-100 text-slate-500">
                                    <th className="px-4 py-2 text-left">Date</th>
                                    <th className="px-4 py-2 text-left">Type</th>
                                    <th className="px-4 py-2 text-right">Qty</th>
                                    <th className="px-4 py-2 text-left">Notes</th>
                                    <th className="px-4 py-2 text-left">By</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {transactions.map((tx) => {
                                    const style = getTransactionStyle(tx.transaction_type)
                                    return (
                                      <tr key={tx.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                                          {formatDate(tx.created_at)}
                                        </td>
                                        <td className="px-4 py-2">
                                          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${style.className}`}>
                                            {style.label}
                                          </span>
                                        </td>
                                        <td className={cn(
                                          'px-4 py-2 text-right font-semibold',
                                          tx.quantity > 0 ? 'text-green-600' : 'text-red-500'
                                        )}>
                                          {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                                        </td>
                                        <td className="px-4 py-2 text-slate-500 max-w-xs truncate">
                                          {tx.notes ?? <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-2 text-slate-400">
                                          {tx.profiles?.full_name ?? tx.profiles?.email ?? '—'}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
