'use client'

// -----------------------------------------------------------------------------
// Success Toast with Undo
// -----------------------------------------------------------------------------
// A green banner that appears after a successful receive or ship action.
// Shows a countdown and an "Undo" button for 30 seconds.
// After 30 seconds it disappears on its own.
// -----------------------------------------------------------------------------

import { useEffect } from 'react'
import { CheckCircle, RotateCcw } from 'lucide-react'

type Props = {
  message: string          // e.g. "Received 15 × Batteries"
  secondsLeft: number      // countdown (starts at 30, ticks down)
  onUndo: () => void       // called when user clicks Undo
  onDismiss: () => void    // called when timer reaches 0 (or user dismisses)
}

export default function SuccessToast({ message, secondsLeft, onUndo, onDismiss }: Props) {
  // Tick the countdown down every second
  useEffect(() => {
    if (secondsLeft <= 0) {
      onDismiss()
      return
    }
    const timer = setTimeout(() => {
      // This component receives secondsLeft as a prop — the parent manages state.
      // The parent's useEffect drives this by decrementing secondsLeft.
    }, 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft, onDismiss])

  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-xl bg-green-50 border-2
                    border-green-200 animate-in fade-in slide-in-from-top-2 duration-300">

      {/* Check icon */}
      <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />

      {/* Message */}
      <p className="flex-1 text-green-800 font-medium">{message}</p>

      {/* Undo button + countdown */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onUndo}
          className="flex items-center gap-1.5 text-sm font-semibold text-green-700
                     hover:text-green-900 underline underline-offset-2 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Undo ({secondsLeft}s)
        </button>
      </div>
    </div>
  )
}
