'use client'

// -----------------------------------------------------------------------------
// Warehouse UI — Main Client Component ("Digital Worksheet")
// -----------------------------------------------------------------------------
// Manages the segmented control tabs, language toggle, and help icon.
// Uses Drone Legends brand colors (navy + orange) for the segmented control.
// -----------------------------------------------------------------------------

import { useState } from 'react'
import { Globe } from 'lucide-react'
import WarehouseHelp from './warehouse-help'
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

export type Language = 'en' | 'es'

// ---- Tab definitions --------------------------------------------------------

type TabId = 'receive' | 'ship-kits' | 'ship-items' | 'stock'

type Tab = {
  id: TabId
  emoji: string
  labels: { en: string; es: string }
}

const TABS: Tab[] = [
  { id: 'receive',    emoji: '📦', labels: { en: 'Receive',    es: 'Recibir' } },
  { id: 'ship-kits',  emoji: '🚀', labels: { en: 'Ship Kits',  es: 'Enviar Kits' } },
  { id: 'ship-items', emoji: '📤', labels: { en: 'Ship Items', es: 'Enviar Objetos' } },
  { id: 'stock',      emoji: '📋', labels: { en: 'Stock',      es: 'Inventario' } },
]

// ---- Main component ----------------------------------------------------------

export default function WarehouseUI({ items, kitTypes, bomItems, inventory }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('receive')
  const [lang, setLang] = useState<Language>('en')

  const inventoryForForms = inventory.map((i) => ({
    item_id: i.item_id,
    quantity_on_hand: i.quantity_on_hand,
  }))

  return (
    <div style={{ maxWidth: 720 }}>

      {/* ---- Top bar: Language toggle + Help --------------------------------- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button
          onClick={() => setLang((p) => (p === 'en' ? 'es' : 'en'))}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 999,
            border: '2px solid #cbd5e1', background: '#fff',
            fontSize: 14, fontWeight: 600, color: '#334155', cursor: 'pointer',
          }}
        >
          <Globe style={{ width: 16, height: 16 }} />
          {lang === 'en' ? 'Español' : 'English'}
        </button>

        <WarehouseHelp lang={lang} />
      </div>

      {/* ---- Segmented Control Tabs ------------------------------------------ */}
      {/* A single rounded bar with four segments, Drone Legends branding */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderRadius: 16,
          overflow: 'hidden',
          border: '2px solid #1B2A4A',
          marginBottom: 20,
        }}
      >
        {TABS.map((tab, i) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 2,
                padding: '14px 4px',
                minHeight: 72,
                background: isActive ? '#1B2A4A' : '#fff',
                color: isActive ? '#fff' : '#1B2A4A',
                border: 'none',
                borderLeft: i > 0 ? '1px solid #1B2A4A' : 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{tab.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>
                {tab.labels[lang]}
              </span>
            </button>
          )
        })}
      </div>

      {/* ---- Tab content ----------------------------------------------------- */}
      {activeTab === 'receive' && (
        <ReceiveForm items={items} lang={lang} />
      )}

      {activeTab === 'ship-kits' && (
        <ShipKitsForm
          kitTypes={kitTypes}
          bomItems={bomItems}
          inventory={inventoryForForms}
          lang={lang}
        />
      )}

      {activeTab === 'ship-items' && (
        <ShipItemsForm
          items={items}
          inventory={inventoryForForms}
          lang={lang}
        />
      )}

      {activeTab === 'stock' && (
        <StockView inventory={inventory} />
      )}
    </div>
  )
}
