'use client'

// -----------------------------------------------------------------------------
// Current Stock View
// -----------------------------------------------------------------------------
// A read-only view of all current inventory levels.
// Items that are below their reorder threshold are highlighted in red.
// Staff can use this to quickly check what's running low.
// -----------------------------------------------------------------------------

import { useRouter } from 'next/navigation'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTransition } from 'react'

type InventoryItem = {
  item_id: string
  sku: string
  name: string
  unit_of_measure: string
  reorder_point: number
  quantity_on_hand: number
  is_low_stock: boolean
  is_active: boolean
}

type Props = {
  inventory: InventoryItem[]
}

export default function StockView({ inventory }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Only show active items, sorted by name
  const activeItems = inventory
    .filter((i) => i.is_active)
    .sort((a, b) => a.sku.localeCompare(b.sku))

  const lowStockItems = activeItems.filter((i) => i.is_low_stock)

  // Reload the page to get fresh data from the server
  function handleRefresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">

      {/* Header row: item count + refresh button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-slate-500 text-sm">
            {activeItems.length} active items
          </p>
          {lowStockItems.length > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-red-600
                             bg-red-50 border border-red-200 px-3 py-1 rounded-full">
              <AlertTriangle className="h-4 w-4" />
              {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} low
            </span>
          )}
        </div>

        {/* Refresh button — reloads server data */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isPending}
          className="gap-2 text-slate-600"
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          {isPending ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {/* Low stock alert banner */}
      {lowStockItems.length > 0 && (
        <div className="rounded-2xl bg-red-50 border-2 border-red-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <h3 className="font-bold text-red-800">Items Running Low</h3>
          </div>
          <div className="grid gap-2">
            {lowStockItems.map((item) => (
              <div
                key={item.item_id}
                className="flex items-center justify-between bg-white rounded-xl
                           border border-red-100 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">{item.quantity_on_hand}</p>
                  <p className="text-xs text-slate-500">
                    reorder at {item.reorder_point}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full stock table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

        {activeItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No active items in inventory.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  SKU
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Item
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  On Hand
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeItems.map((item) => (
                <tr
                  key={item.item_id}
                  className={item.is_low_stock ? 'bg-red-50/40' : 'hover:bg-slate-50'}
                >
                  {/* SKU */}
                  <td className="px-5 py-4 font-mono text-sm text-slate-400">
                    {item.sku}
                  </td>

                  {/* Item name */}
                  <td className="px-5 py-4">
                    <span className="font-medium text-slate-800">{item.name}</span>
                  </td>

                  {/* On hand — big and prominent */}
                  <td className="px-5 py-4 text-right">
                    <span className={`text-xl font-bold ${
                      item.is_low_stock ? 'text-red-600' : 'text-slate-700'
                    }`}>
                      {item.quantity_on_hand}
                    </span>
                    <span className="text-slate-400 text-sm ml-1.5">
                      {item.unit_of_measure}
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="px-5 py-4 text-right">
                    {item.is_low_stock ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold
                                       text-red-600 bg-red-100 px-2.5 py-1 rounded-full">
                        <AlertTriangle className="h-3 w-3" />
                        Low
                      </span>
                    ) : (
                      <span className="inline-block text-xs font-medium text-green-700
                                       bg-green-100 px-2.5 py-1 rounded-full">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
