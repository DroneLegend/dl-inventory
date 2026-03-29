'use client'

// -----------------------------------------------------------------------------
// Level Zero Reset
// -----------------------------------------------------------------------------
// A one-time admin tool that clears all transaction history and sets every
// item's stock to 0. Items, KitTypes, and Notes are preserved.
//
// Safety features:
//   - Only visible to admin users
//   - Requires typing "RESET" to confirm
//   - Shows a danger modal with clear explanation of what will happen
// -----------------------------------------------------------------------------

import { useState, useTransition } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { levelZeroReset } from '@/app/(protected)/dashboard/actions'

export default function LevelZeroReset() {
  // Whether the confirmation modal is open
  const [showModal, setShowModal] = useState(false)

  // What the user has typed into the confirmation field
  const [confirmText, setConfirmText] = useState('')

  // React transition for async loading state
  const [isPending, startTransition] = useTransition()

  // Whether the reset completed successfully (shows success message)
  const [success, setSuccess] = useState(false)

  // Error message if something went wrong
  const [error, setError] = useState<string | null>(null)

  // The execute button is only enabled when the user types exactly "RESET"
  const isConfirmed = confirmText === 'RESET'

  function handleOpen() {
    // Reset all state when opening the modal
    setConfirmText('')
    setError(null)
    setSuccess(false)
    setShowModal(true)
  }

  function handleClose() {
    setShowModal(false)
    setConfirmText('')
    setError(null)
  }

  function handleExecute() {
    if (!isConfirmed) return

    startTransition(async () => {
      const result = await levelZeroReset()

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        // Close modal after a short delay so the user sees the success message
        setTimeout(() => {
          setShowModal(false)
          setSuccess(false)
          setConfirmText('')
        }, 2000)
      }
    })
  }

  return (
    <>
      {/* System Tools section header and reset button */}
      <div className="border-t border-slate-200 pt-8 mt-8">
        <h3 className="text-lg font-semibold text-slate-800 mb-1">System Tools</h3>
        <p className="text-sm text-slate-500 mb-4">
          Dangerous operations that affect the entire inventory system.
        </p>

        <button
          onClick={handleOpen}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Level Zero Reset
        </button>
      </div>

      {/* Confirmation modal (overlay) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">

            {/* Danger icon and title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Level Zero Reset
              </h3>
            </div>

            {/* Warning message explaining what will happen */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 font-medium">
                DANGER: This sets all stock to 0 and clears history.
                SKUs, Kits, and Notes will be saved.
              </p>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              This action cannot be undone. All transaction history will be permanently deleted
              and every item&apos;s quantity will be reset to zero.
            </p>

            {/* Success message shown after reset completes */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-800 font-medium">
                  Reset complete. All stock levels are now at zero.
                </p>
              </div>
            )}

            {/* Error message if something went wrong */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Type-to-confirm input */}
            {!success && (
              <>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type <span className="font-mono font-bold text-red-600">RESET</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type RESET here"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-4"
                  disabled={isPending}
                  autoFocus
                />
              </>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                disabled={isPending}
              >
                Cancel
              </button>

              {!success && (
                <button
                  onClick={handleExecute}
                  disabled={!isConfirmed || isPending}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isConfirmed && !isPending
                      ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isPending ? 'Resetting...' : 'Execute Reset'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
