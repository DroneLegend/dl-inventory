'use client'

// -----------------------------------------------------------------------------
// Current Stock View
// -----------------------------------------------------------------------------
// Read-only ledger of all current inventory levels.
// Uses table-layout:fixed with locked column widths.
// 60px rows, high-contrast, ledger-style borders.
// -----------------------------------------------------------------------------

import { useRouter } from 'next/navigation'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useTransition } from 'react'

type InventoryItem = {
  item_id: string; sku: string; name: string; unit_of_measure: string
  reorder_point: number; quantity_on_hand: number; is_low_stock: boolean; is_active: boolean
}

type Props = { inventory: InventoryItem[] }

export default function StockView({ inventory }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const activeItems = inventory.filter((i) => i.is_active).sort((a, b) => a.sku.localeCompare(b.sku))
  const lowStockItems = activeItems.filter((i) => i.is_low_stock)

  function handleRefresh() {
    startTransition(() => { router.refresh() })
  }

  return (
    <div>

      {/* Header: count + refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>
            {activeItems.length} items
          </span>
          {lowStockItems.length > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 12, fontWeight: 700, color: '#dc2626',
              background: '#fef2f2', border: '1px solid #fecaca',
              padding: '4px 10px', borderRadius: 999,
            }}>
              <AlertTriangle style={{ width: 14, height: 14 }} />
              {lowStockItems.length} low
            </span>
          )}
        </div>

        <button
          onClick={handleRefresh} disabled={isPending}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8,
            border: '2px solid #cbd5e1', background: '#fff',
            fontSize: 13, fontWeight: 600, color: '#475569',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <RefreshCw style={{ width: 14, height: 14, animation: isPending ? 'spin 1s linear infinite' : 'none' }} />
          {isPending ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && (
        <div style={{ borderRadius: 16, background: '#fef2f2', border: '2px solid #fecaca',
                       padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertTriangle style={{ width: 20, height: 20, color: '#dc2626' }} />
            <h3 style={{ fontSize: 16, fontWeight: 900, color: '#991b1b', margin: 0 }}>Items Running Low</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lowStockItems.map((item) => (
              <div key={item.item_id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#fff', borderRadius: 12, border: '1px solid #fecaca',
                padding: '12px 16px', minHeight: 60,
              }}>
                <div>
                  <p style={{ fontWeight: 800, color: '#000', margin: 0, fontSize: 14 }}>{item.name}</p>
                  <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b', margin: 0 }}>{item.sku}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 24, fontWeight: 900, color: '#dc2626', margin: 0 }}>{item.quantity_on_hand}</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>reorder at {item.reorder_point}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock table — table-layout:fixed */}
      <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', overflow: 'hidden' }}>
        {activeItems.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            No active items in inventory.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
              <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '40%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                  {['SKU', 'Item', 'On Hand', 'Status'].map((h, i) => (
                    <th key={h} style={{
                      padding: '10px 12px', fontSize: 11, fontWeight: 800,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      color: '#64748b', textAlign: i >= 2 ? 'right' : 'left',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeItems.map((item) => (
                  <tr key={item.item_id} style={{
                    height: 60, borderBottom: '1px solid #e2e8f0',
                    background: item.is_low_stock ? '#fef2f2' : '#fff',
                  }}>
                    <td style={{ padding: '4px 12px', fontFamily: 'monospace', fontSize: 13,
                                  color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap' }}>
                      {item.sku}
                    </td>
                    <td style={{ padding: '4px 12px', fontSize: 14, fontWeight: 700, color: '#000',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '4px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontSize: 20, fontWeight: 900,
                        color: item.is_low_stock ? '#dc2626' : '#000',
                      }}>
                        {item.quantity_on_hand}
                      </span>
                      <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>
                        {item.unit_of_measure}
                      </span>
                    </td>
                    <td style={{ padding: '4px 12px', textAlign: 'right' }}>
                      {item.is_low_stock ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 700, color: '#dc2626',
                          background: '#fee2e2', padding: '4px 10px', borderRadius: 999,
                        }}>
                          <AlertTriangle style={{ width: 12, height: 12 }} />
                          Low
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-block', fontSize: 11, fontWeight: 700,
                          color: '#15803d', background: '#dcfce7',
                          padding: '4px 10px', borderRadius: 999,
                        }}>
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
