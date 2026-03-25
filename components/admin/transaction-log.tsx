'use client'

// -----------------------------------------------------------------------------
// Transaction Log Component
// -----------------------------------------------------------------------------
// Displays a filterable table of inventory transactions.
// Each transaction records when items were received, consumed, adjusted, or
// returned — along with who did it and any notes they left.
// -----------------------------------------------------------------------------

import { useState } from 'react'
import { cn } from '@/lib/utils'

// ---- Type definitions --------------------------------------------------------

// One transaction record, joined with item and user profile info
type Transaction = {
  id: string
  transaction_type: 'receive' | 'consume' | 'adjust' | 'return' | string
  quantity: number
  notes: string | null
  created_at: string
  // Joined from items table
  items: { sku: string; name: string } | null
  // Joined from profiles table
  profiles: { full_name: string | null; email: string } | null
}

type Props = {
  transactions: Transaction[]
}

// ---- Helper: type badge styling -----------------------------------------------

// Returns a color-coded badge style for each transaction type
function getTypeBadge(type: string): { label: string; className: string } {
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

// Format a date/time string for display in the table
function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// The filter options for the type buttons
type TypeFilter = 'all' | 'receive' | 'consume' | 'adjust' | 'return'

// ---- Main component ----------------------------------------------------------

export default function TransactionLog({ transactions }: Props) {
  // Which transaction type to show (default: all)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  // Filter transactions based on the selected type button
  const displayed = transactions.filter((tx) =>
    typeFilter === 'all' ? true : tx.transaction_type === typeFilter
  )

  // Filter button config: label + value
  const filterButtons: { label: string; value: TypeFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Receive', value: 'receive' },
    { label: 'Consume', value: 'consume' },
    { label: 'Adjust', value: 'adjust' },
    { label: 'Return', value: 'return' },
  ]

  return (
    <div className="space-y-4">

      {/* Filter buttons — one per transaction type + All */}
      <div className="flex flex-wrap gap-2 items-center">
        {filterButtons.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setTypeFilter(value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              typeFilter === value
                ? 'bg-brand-navy text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {label}
          </button>
        ))}

        {/* Count of shown rows */}
        <span className="ml-auto text-xs text-slate-400">
          {displayed.length} transaction{displayed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Transactions table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {displayed.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-400 text-sm">No transactions found for this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">Date / Time</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Item</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">Qty</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Notes</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map((tx) => {
                  const badge = getTypeBadge(tx.transaction_type)
                  // Positive quantities are green (adding stock), negative are red (removing stock)
                  const qtyColor = tx.quantity > 0 ? 'text-green-600' : 'text-red-500'
                  const qtyLabel = tx.quantity > 0 ? `+${tx.quantity}` : String(tx.quantity)

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">

                      {/* Date and time */}
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                        {formatDate(tx.created_at)}
                      </td>

                      {/* SKU + name */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{tx.items?.name ?? '—'}</div>
                        <div className="text-xs text-slate-400 font-mono">{tx.items?.sku ?? ''}</div>
                      </td>

                      {/* Type badge (color-coded) */}
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          'inline-block text-xs font-medium px-2.5 py-0.5 rounded-full',
                          badge.className
                        )}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Quantity — green for positive, red for negative */}
                      <td className={cn('px-4 py-3 text-right font-semibold', qtyColor)}>
                        {qtyLabel}
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                        {tx.notes ?? <span className="text-slate-300">—</span>}
                      </td>

                      {/* Who logged it */}
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {tx.profiles?.full_name ?? tx.profiles?.email ?? '—'}
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
