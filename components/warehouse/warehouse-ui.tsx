'use client'

// -----------------------------------------------------------------------------
// Warehouse UI — Main Client Component
// -----------------------------------------------------------------------------
// Manages the tab navigation and renders the correct form or view.
// This is a client component because the tab state needs to update instantly
// without a full page reload.
//
// The server page fetches all the data and passes it in as props.
// -----------------------------------------------------------------------------

import { useState } from 'react'
import { cn } from '@/lib/utils'
import ReceiveForm from './receive-form'
import ShipKitsForm from './ship-kits-form'
import ShipItemsForm from './ship-items-form'
import StockView from './stock-view'

// ---- Type definitions --------------------------------------------------------

type Item = {
  id: string
  sku: string
  name: string
  unit_of_measure: string
}

type KitType = {
  id: string
  name: string
}

type BomItem = {
  kit_type_id: string
  item_id: string
  quantity_required: number
  items: {
    sku: string
    name: string
    unit_of_measure: string
  } | null
}

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
  items: Item[]
  kitTypes: KitType[]
  bomItems: BomItem[]
  inventory: InventoryItem[]
}

// ---- Tab definitions --------------------------------------------------------

type TabId = 'receive' | 'ship-kits' | 'ship-items' | 'stock'

type Tab = {
  id: TabId
  emoji: string   // large emoji icon — easy for non-tech users to recognise quickly
  label: string
  description: string
}

const TABS: Tab[] = [
  {
    id: 'receive',
    emoji: '📦',
    label: 'Receive',
    description: 'Stock arriving',
  },
  {
    id: 'ship-kits',
    emoji: '🚀',
    label: 'Ship Kits',
    description: 'Full kit orders',
  },
  {
    id: 'ship-items',
    emoji: '📤',
    label: 'Ship Items',
    description: 'Individual items',
  },
  {
    id: 'stock',
    emoji: '📋',
    label: 'Stock Levels',
    description: 'View current stock',
  },
]

// ---- Main component ----------------------------------------------------------

export default function WarehouseUI({ items, kitTypes, bomItems, inventory }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('receive')

  // Build a simpler inventory array for forms that only need item_id + quantity
  const inventoryForForms = inventory.map((i) => ({
    item_id: i.item_id,
    quantity_on_hand: i.quantity_on_hand,
  }))

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ---- Tab buttons ----------------------------------------------------- */}
      {/* Large, easy-to-tap buttons designed for warehouse workers */}
      <div className="grid grid-cols-4 gap-3">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                // Base styles: big rounded card-like button
                'flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2',
                'transition-all duration-150 select-none',
                isActive
                  // Active: navy border + light navy background
                  ? 'border-brand-navy bg-brand-navy/8 shadow-sm'
                  // Inactive: light grey, hover to navy border
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              {/* Big emoji icon */}
              <span className="text-2xl leading-none">{tab.emoji}</span>
              {/* Label */}
              <span className={cn(
                'text-sm font-bold leading-tight',
                isActive ? 'text-brand-navy' : 'text-slate-600'
              )}>
                {tab.label}
              </span>
              {/* Description */}
              <span className="text-xs text-slate-400 leading-tight text-center">
                {tab.description}
              </span>
            </button>
          )
        })}
      </div>

      {/* ---- Tab content ----------------------------------------------------- */}
      {activeTab === 'receive' && (
        <ReceiveForm items={items} />
      )}

      {activeTab === 'ship-kits' && (
        <ShipKitsForm
          kitTypes={kitTypes}
          bomItems={bomItems}
          inventory={inventoryForForms}
        />
      )}

      {activeTab === 'ship-items' && (
        <ShipItemsForm
          items={items}
          inventory={inventoryForForms}
        />
      )}

      {activeTab === 'stock' && (
        <StockView inventory={inventory} />
      )}
    </div>
  )
}
