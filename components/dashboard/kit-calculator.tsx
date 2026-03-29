'use client'

// -----------------------------------------------------------------------------
// Kit Fulfillment Calculator
// -----------------------------------------------------------------------------
// The main view on the admin dashboard. You pick a kit type and enter how many
// kits you need, and this shows you:
//   - Every item in that kit's bill of materials
//   - How much total stock you need vs. what you have on hand
//   - Whether you have a shortage (red), tight stock (yellow), or plenty (green)
//   - The estimated cost to buy enough to fill any shortages
//
// There's also an "Export to CSV" button to download the table as a spreadsheet.
// -----------------------------------------------------------------------------

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---- Type definitions --------------------------------------------------------

// One row in the BOM table (item info + calculated fulfillment data)
type BomRow = {
  bomItemId: string
  itemId: string
  sku: string
  name: string
  qtyPerKit: number          // how many of this item go in one kit
  totalNeeded: number        // qtyPerKit × kitsNeeded
  onHand: number             // current stock level
  delta: number              // onHand - totalNeeded (positive = surplus, negative = shortage)
  source: string             // parsed from item description
  unitCost: number | null    // parsed from item description (null if unknown)
  estimatedCostToFill: number | null  // cost to fill shortage (null if no shortage or no cost data)
}

// A kit type the user can select from the dropdown
type KitType = {
  id: string
  name: string
}

// The BOM data passed in: one entry per item in each kit's BOM
type BomItem = {
  id: string
  kit_type_id: string
  item_id: string
  quantity_required: number
  items: {
    sku: string
    name: string
    description: string | null
    unit_of_measure: string
  } | null
}

// Current inventory data for one item
type InventoryItem = {
  item_id: string
  quantity_on_hand: number
}

// Props passed into this component from the parent server page
type Props = {
  kitTypes: KitType[]
  bomItems: BomItem[]
  inventory: InventoryItem[]
}

// ---- Helper functions --------------------------------------------------------

// Parse the source and unit cost out of an item's description field.
// Descriptions are formatted like: "Source: Amazon | Unit cost: $400.00"
function parseDescription(description: string | null): {
  source: string
  unitCost: number | null
} {
  if (!description) return { source: 'N/A', unitCost: null }

  // Match "Source: <anything>" (stops at "|" or end of string)
  const sourceMatch = description.match(/Source:\s*([^|]+)/)
  // Match "Unit cost: $<number>" (with optional commas)
  const costMatch = description.match(/Unit cost:\s*\$?([\d,]+(?:\.\d+)?)/)

  return {
    source: sourceMatch ? sourceMatch[1].trim() : 'N/A',
    unitCost: costMatch ? parseFloat(costMatch[1].replace(/,/g, '')) : null,
  }
}

// Determine the color class for a delta cell based on stock status:
//   Red    = shortage (not enough stock)
//   Yellow = positive but less than 10% buffer above what's needed
//   Green  = plenty of stock (10% or more buffer)
function getDeltaColorClass(delta: number, totalNeeded: number): string {
  if (delta < 0) {
    // Not enough stock
    return 'text-red-600 font-semibold'
  }
  // 10% of total needed = the "buffer zone" threshold
  const bufferThreshold = totalNeeded * 0.1
  if (delta < bufferThreshold) {
    // Positive but less than 10% buffer — getting low
    return 'text-yellow-600 font-semibold'
  }
  // Plenty of stock
  return 'text-green-600 font-semibold'
}

// Format a number as currency: 1234.5 → "$1,234.50"
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

// ---- Main component ----------------------------------------------------------

export default function KitCalculator({ kitTypes, bomItems, inventory }: Props) {
  // The kit type the user has selected in the dropdown
  const [selectedKitId, setSelectedKitId] = useState<string>(kitTypes[0]?.id ?? '')

  // How many kits the user wants to build (defaults to 0)
  const [kitsNeeded, setKitsNeeded] = useState<number>(0)

  // Build a map of item_id → quantity_on_hand for quick lookups
  const inventoryMap = new Map<string, number>(
    inventory.map((inv) => [inv.item_id, inv.quantity_on_hand])
  )

  // Filter BOM items to only those belonging to the selected kit,
  // then calculate all the fulfillment data for each row
  const rows: BomRow[] = bomItems
    .filter((bom) => bom.kit_type_id === selectedKitId && bom.items)
    .map((bom) => {
      const item = bom.items!
      const qtyPerKit = bom.quantity_required
      const totalNeeded = qtyPerKit * kitsNeeded
      const onHand = inventoryMap.get(bom.item_id) ?? 0
      const delta = onHand - totalNeeded
      const { source, unitCost } = parseDescription(item.description)

      // Only calculate a cost if there's actually a shortage AND we know the unit cost
      const estimatedCostToFill =
        delta < 0 && unitCost !== null ? Math.abs(delta) * unitCost : null

      return {
        bomItemId: bom.id,
        itemId: bom.item_id,
        sku: item.sku,
        name: item.name,
        qtyPerKit,
        totalNeeded,
        onHand,
        delta,
        source,
        unitCost,
        estimatedCostToFill,
      }
    })
    // Sort rows by SKU for consistent ordering
    .sort((a, b) => a.sku.localeCompare(b.sku))

  // Total estimated cost to fill all shortages across all items
  const totalEstimatedCost = rows.reduce(
    (sum, row) => sum + (row.estimatedCostToFill ?? 0),
    0
  )

  // Count how many items have unknown cost data (so we can show a note)
  const itemsWithUnknownCost = rows.filter(
    (row) => row.delta < 0 && row.unitCost === null
  ).length

  // ---- CSV Export ------------------------------------------------------------

  // Build and download a CSV file from the current calculator results
  function exportToCsv() {
    const selectedKit = kitTypes.find((k) => k.id === selectedKitId)
    const kitName = selectedKit?.name ?? 'Kit'

    // CSV header row
    const headers = [
      'SKU',
      'Item Name',
      'Qty/Kit',
      'Total Needed',
      'On Hand',
      'Delta',
      'Status',
      'Source',
      'Estimated Cost to Fill',
    ]

    // Build one CSV row per BOM item
    const dataRows = rows.map((row) => {
      const status =
        row.delta < 0
          ? 'Shortage'
          : row.delta < row.totalNeeded * 0.1
          ? 'Low buffer'
          : 'OK'

      const cost =
        row.estimatedCostToFill !== null
          ? row.estimatedCostToFill.toFixed(2)
          : row.delta < 0
          ? 'Cost unknown'
          : ''

      // Wrap values in quotes to handle commas in names
      return [
        `"${row.sku}"`,
        `"${row.name}"`,
        row.qtyPerKit,
        row.totalNeeded,
        row.onHand,
        row.delta,
        `"${status}"`,
        `"${row.source}"`,
        `"${cost}"`,
      ].join(',')
    })

    // Summary row at the bottom
    const summaryRow = `"TOTAL ESTIMATED COST TO FILL SHORTAGES",,,,,,,,"${totalEstimatedCost.toFixed(2)}"`

    // Combine everything into one CSV string
    const csvContent = [
      // Title row
      `"Kit Fulfillment Calculator — ${kitName} — ${kitsNeeded} kits"`,
      '',
      headers.join(','),
      ...dataRows,
      '',
      summaryRow,
    ].join('\n')

    // Trigger a browser download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `kit-fulfillment-${kitName.replace(/\s+/g, '-').toLowerCase()}-${kitsNeeded}kits.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // ---- Render ----------------------------------------------------------------

  return (
    <div className="space-y-5">

      {/* Controls: kit selector + kits needed input + export button */}
      <div className="flex flex-wrap items-end gap-4">

        {/* Kit type dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Kit Type</label>
          <select
            value={selectedKitId}
            onChange={(e) => setSelectedKitId(e.target.value)}
            className="h-9 min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
          >
            {kitTypes.length === 0 && (
              <option value="">No kit types found</option>
            )}
            {kitTypes.map((kit) => (
              <option key={kit.id} value={kit.id}>
                {kit.name}
              </option>
            ))}
          </select>
        </div>

        {/* Kits needed number input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Kits Needed</label>
          <Input
            type="number"
            min={0}
            value={kitsNeeded}
            onChange={(e) => setKitsNeeded(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-24"
          />
        </div>

        {/* Spacer pushes export button to the right */}
        <div className="flex-1" />

        {/* Export to CSV button */}
        <Button
          onClick={exportToCsv}
          variant="outline"
          disabled={rows.length === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      {/* No BOM items found message */}
      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-400 text-sm">
            No BOM items found for this kit type. Add items in the BOM Manager tab.
          </p>
        </div>
      )}

      {/* Fulfillment table */}
      {rows.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              {/* Column headers */}
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">SKU</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Item Name</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Qty/Kit</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Total Needed</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">On Hand</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Delta</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Source</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Cost to Fill</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.bomItemId} className="hover:bg-slate-50 transition-colors">

                    {/* SKU */}
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.sku}</td>

                    {/* Item name */}
                    <td className="px-4 py-3 text-slate-800">{row.name}</td>

                    {/* Qty per kit */}
                    <td className="px-4 py-3 text-right text-slate-600">{row.qtyPerKit}</td>

                    {/* Total needed */}
                    <td className="px-4 py-3 text-right text-slate-600">{row.totalNeeded}</td>

                    {/* On hand */}
                    <td className="px-4 py-3 text-right text-slate-600">{row.onHand}</td>

                    {/* Delta — color-coded based on stock status */}
                    <td className={cn('px-4 py-3 text-right', getDeltaColorClass(row.delta, row.totalNeeded))}>
                      {row.delta > 0 ? `+${row.delta}` : row.delta}
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3 text-slate-500">{row.source}</td>

                    {/* Estimated cost to fill shortage */}
                    <td className="px-4 py-3 text-right">
                      {row.estimatedCostToFill !== null ? (
                        <span className="text-red-600 font-medium">
                          {formatCurrency(row.estimatedCostToFill)}
                        </span>
                      ) : row.delta < 0 ? (
                        // There's a shortage but we don't have cost data
                        <span className="text-slate-400 text-xs italic">cost unknown</span>
                      ) : (
                        // No shortage
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Summary footer row */}
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={7} className="px-4 py-3 text-right font-semibold text-slate-700">
                    Total Estimated Cost to Fill All Shortages
                  </td>
                  <td className="px-4 py-3 text-right">
                    {totalEstimatedCost > 0 ? (
                      <span className="font-bold text-red-600">
                        {formatCurrency(totalEstimatedCost)}
                      </span>
                    ) : (
                      <span className="font-bold text-green-600">$0.00</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Note about missing cost data */}
          {itemsWithUnknownCost > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 bg-amber-50">
              <p className="text-xs text-amber-700">
                Note: {itemsWithUnknownCost} item{itemsWithUnknownCost > 1 ? 's have' : ' has'} a
                shortage but no unit cost in the description. Add &quot;Unit cost: $X.XX&quot; to
                those item descriptions for a complete cost estimate.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Color key legend */}
      <div className="flex items-center gap-5 text-xs text-slate-500">
        <span className="font-medium text-slate-600">Delta color key:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
          Shortage (negative)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-yellow-400" />
          Less than 10% buffer
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
          Adequate stock (10%+ buffer)
        </span>
      </div>

    </div>
  )
}
