'use client'

// -----------------------------------------------------------------------------
// Dashboard Tabs
// -----------------------------------------------------------------------------
// This is the client-side wrapper that manages which tab is currently active
// and renders the correct panel underneath. All the actual data (fetched on
// the server) is passed in as props and distributed to each tab component.
// -----------------------------------------------------------------------------

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Calculator,    // Kit Fulfillment Calculator
  ListTree,      // BOM Manager
  Package,       // Item Manager
  LayoutList,    // Inventory Overview
  Bell,          // Alert Settings
  Wrench,        // System Tools
} from 'lucide-react'
import KitCalculator from '@/components/dashboard/kit-calculator'
import BomManager from '@/components/dashboard/bom-manager'
import ItemManager from '@/components/dashboard/item-manager'
import InventoryOverview from '@/components/dashboard/inventory-overview'
import AlertSettingsPanel from '@/components/dashboard/alert-settings-panel'
import LevelZeroReset from '@/components/dashboard/level-zero-reset'

// ---- Type definitions --------------------------------------------------------
// These match the data shapes fetched in the server page and passed in as props.

type KitType = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
}

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

type Item = {
  id: string
  sku: string
  name: string
  description: string | null
  unit_of_measure: string
  reorder_point: number
  is_active: boolean
}

type AlertSetting = {
  id: string
  item_id: string
  alert_enabled: boolean
  override_threshold: number | null
}

// Props = all the data the server fetched, passed down to the right sub-components
type Props = {
  kitTypes: KitType[]
  bomItems: BomItem[]
  inventory: InventoryItem[]
  allItems: Item[]
  alertSettings: AlertSetting[]
  userRole: 'admin' | 'warehouse'  // used to gate admin-only features like System Tools
}

// ---- Tab definitions --------------------------------------------------------

type Tab = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const TABS: Tab[] = [
  {
    id: 'calculator',
    label: 'Kit Calculator',
    icon: Calculator,
    description: 'See what stock you need to build a given number of kits',
  },
  {
    id: 'bom',
    label: 'BOM Manager',
    icon: ListTree,
    description: 'Edit the bill of materials for each kit type',
  },
  {
    id: 'items',
    label: 'Item Manager',
    icon: Package,
    description: 'Add, edit, or deactivate inventory items',
  },
  {
    id: 'inventory',
    label: 'Inventory Overview',
    icon: LayoutList,
    description: 'Current stock levels and transaction history',
  },
  {
    id: 'alerts',
    label: 'Alert Settings',
    icon: Bell,
    description: 'Configure low-stock alert thresholds per item',
  },
  {
    id: 'system',
    label: 'System Tools',
    icon: Wrench,
    description: 'Dangerous system-level operations — admin only',
  },
]

// ---- Main component ----------------------------------------------------------

export default function DashboardTabs({
  kitTypes,
  bomItems,
  inventory,
  allItems,
  alertSettings,
  userRole,
}: Props) {
  // Support deep-linking to a tab via ?tab=bom (or any tab id)
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const kitIdParam = searchParams.get('kitId')

  // Only show the System Tools tab to admin users
  const visibleTabs = TABS.filter(t => t.id !== 'system' || userRole === 'admin')

  // Which tab is currently active (defaults to the Kit Calculator, or URL param)
  const [activeTabId, setActiveTabId] = useState<string>(
    visibleTabs.some(t => t.id === tabParam) ? tabParam! : 'calculator'
  )

  // Update active tab if URL search param changes
  useEffect(() => {
    if (tabParam && visibleTabs.some(t => t.id === tabParam)) {
      setActiveTabId(tabParam)
    }
  }, [tabParam, visibleTabs])

  const activeTab = visibleTabs.find((t) => t.id === activeTabId) ?? visibleTabs[0]

  // Build a simpler inventory array for the Kit Calculator (just item_id + quantity)
  const inventoryForCalc = inventory.map((i) => ({
    item_id: i.item_id,
    quantity_on_hand: i.quantity_on_hand,
  }))

  return (
    <div className="space-y-6">

      {/* Tab navigation bar */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 overflow-x-auto pb-px">
          {visibleTabs.map((tab) => {
            const isActive = tab.id === activeTabId
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={cn(
                  // Base styles: pill-like tab button
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap',
                  'border-b-2 transition-colors -mb-px',
                  isActive
                    // Active tab: brand orange underline + navy text
                    ? 'border-brand-orange text-brand-navy'
                    // Inactive tab: no underline + muted text
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
                )}
              >
                <tab.icon className={cn(
                  'h-4 w-4',
                  isActive ? 'text-brand-orange' : 'text-slate-400'
                )} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Active tab description */}
      <p className="text-sm text-slate-500 -mt-3">{activeTab.description}</p>

      {/* Tab content — each panel is only rendered when its tab is active */}
      {activeTabId === 'calculator' && (
        <KitCalculator
          kitTypes={kitTypes.filter((k) => k.is_active)}
          bomItems={bomItems}
          inventory={inventoryForCalc}
        />
      )}

      {activeTabId === 'bom' && (
        <BomManager
          kitTypes={kitTypes}
          bomItems={bomItems}
          allItems={allItems.filter((i) => i.is_active)}
          initialKitId={kitIdParam ?? undefined}
        />
      )}

      {activeTabId === 'items' && (
        <ItemManager items={allItems} />
      )}

      {activeTabId === 'inventory' && (
        <InventoryOverview inventory={inventory} />
      )}

      {activeTabId === 'alerts' && (
        <AlertSettingsPanel
          items={allItems}
          alertSettings={alertSettings}
        />
      )}

      {/* System Tools tab — only rendered for admin users */}
      {activeTabId === 'system' && userRole === 'admin' && (
        <LevelZeroReset />
      )}

    </div>
  )
}
