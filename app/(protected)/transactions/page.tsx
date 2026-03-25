// -----------------------------------------------------------------------------
// Transactions Page
// -----------------------------------------------------------------------------
// Shows a log of the last 200 inventory transactions.
// Admins can see every receive, consume, adjust, and return event.
// Includes who made each transaction, what item was affected, and any notes.
// -----------------------------------------------------------------------------

import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import TransactionLog from '@/components/admin/transaction-log'

export const metadata = {
  title: 'Transactions — DL Inventory',
}

// Type for one transaction row with joined data
type Transaction = {
  id: string
  transaction_type: string
  quantity: number
  notes: string | null
  created_at: string
  items: { sku: string; name: string } | null
  profiles: { full_name: string | null; email: string } | null
}

export default async function TransactionsPage() {
  // Only admins can view this page
  await requireAdmin()

  // Create a Supabase client for server-side data fetching
  const supabase = await createClient()

  // Fetch the last 200 transactions, joined with item and user info.
  // - items(sku, name): which item was involved
  // - profiles(full_name, email): who made the transaction
  // Ordered newest first so the most recent activity shows at the top.
  const { data: rawTransactions } = await supabase
    .from('inventory_transactions')
    .select('id, transaction_type, quantity, notes, created_at, items(sku, name), profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(200)

  // Supabase infers joined tables as arrays, but they're actually single objects
  // (or null) when coming from a foreign key. Cast through unknown to fix this.
  const transactions = (rawTransactions ?? []) as unknown as Transaction[]

  return (
    <div className="space-y-6">

      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Transaction Log</h2>
        <p className="text-slate-500 mt-1">
          Last 200 inventory transactions. Filter by type to focus on a specific activity.
        </p>
      </div>

      {/* Transaction table with client-side filtering */}
      <TransactionLog transactions={transactions} />

    </div>
  )
}
