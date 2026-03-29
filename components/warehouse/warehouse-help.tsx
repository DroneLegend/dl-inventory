'use client'

// -----------------------------------------------------------------------------
// Warehouse How-To Guide (Popover)
// -----------------------------------------------------------------------------
// A small "?" icon that opens a bilingual help panel.
// Visibility is persisted to localStorage so it stays hidden once dismissed.
// Receives the current language from the parent so content matches.
// -----------------------------------------------------------------------------

import { useState, useEffect } from 'react'
import { HelpCircle, X } from 'lucide-react'

type Language = 'en' | 'es'

// Storage key used to remember whether the guide starts open or closed
const STORAGE_KEY = 'dl-warehouse-help-visible'

// All guide content in both languages
const content = {
  en: {
    title: 'How-To Guide',
    subtitle: 'Follow these easy steps!',
    receive: {
      heading: '📦 Receive (Stock Arriving)',
      steps: [
        "Step 1: Click 'Receive' at the top.",
        'Step 2: Find the item name in the list.',
        'Step 3: Type how many items you got.',
        "Step 4: Click 'Record All' to save.",
      ],
    },
    ship: {
      heading: '🚀 Ship (Stock Leaving)',
      steps: [
        "Step 1: Click 'Ship Kits' or 'Ship Items' at the top.",
        'Step 2: Pick the kit or item from the list.',
        'Step 3: Tap each item when it is in the box.',
        "Step 4: Click 'Finish' when all items are red.",
      ],
    },
  },
  es: {
    title: 'Guia de Ayuda',
    subtitle: '¡Siga estos pasos faciles!',
    receive: {
      heading: '📦 Recibir (Cosas que Llegan)',
      steps: [
        "Paso 1: Presione 'Recibir' arriba.",
        'Paso 2: Busque el nombre del objeto en la lista.',
        'Paso 3: Escriba cuantas cosas recibio.',
        "Paso 4: Presione 'Guardar Todo' para guardar.",
      ],
    },
    ship: {
      heading: '🚀 Enviar (Cosas que Salen)',
      steps: [
        "Paso 1: Presione 'Enviar Kits' o 'Enviar Objetos' arriba.",
        'Paso 2: Elija el kit o el objeto de la lista.',
        'Paso 3: Toque cada objeto cuando este en la caja.',
        "Paso 4: Presione 'Terminar' cuando todos esten rojos.",
      ],
    },
  },
}

type Props = {
  lang: Language
}

export default function WarehouseHelp({ lang }: Props) {
  // Whether the help panel is open
  const [open, setOpen] = useState(false)

  // On first render, check if help was previously open
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'true') setOpen(true)
  }, [])

  // Toggle and persist
  function toggle() {
    const next = !open
    setOpen(next)
    localStorage.setItem(STORAGE_KEY, String(next))
  }

  const t = content[lang]

  return (
    <>
      {/* Small "?" button — always visible */}
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full border-2 border-slate-300 bg-white
                   flex items-center justify-center text-slate-500
                   hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50
                   transition-colors shrink-0"
        title={lang === 'en' ? 'Help' : 'Ayuda'}
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {/* Help panel — slides in below when open */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
             onClick={toggle}>
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-blue-50 border-t-4
                       border-blue-400 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 space-y-4
                       animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-blue-800">{t.title}</h3>
              <button
                onClick={toggle}
                className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center
                           text-blue-600 hover:bg-blue-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-blue-700 font-medium">{t.subtitle}</p>

            {/* Receive steps */}
            <div className="rounded-xl bg-white border border-blue-100 p-4 space-y-2">
              <h4 className="text-base font-bold text-blue-800">{t.receive.heading}</h4>
              <ol className="space-y-1.5">
                {t.receive.steps.map((step, i) => (
                  <li key={i} className="text-sm text-blue-900 leading-relaxed">{step}</li>
                ))}
              </ol>
            </div>

            {/* Ship steps */}
            <div className="rounded-xl bg-white border border-blue-100 p-4 space-y-2">
              <h4 className="text-base font-bold text-blue-800">{t.ship.heading}</h4>
              <ol className="space-y-1.5">
                {t.ship.steps.map((step, i) => (
                  <li key={i} className="text-sm text-blue-900 leading-relaxed">{step}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
