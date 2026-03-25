// -----------------------------------------------------------------------------
// Root Layout
// -----------------------------------------------------------------------------
// This is the outermost layout that wraps every single page in the app.
// It sets up the font, global styles, and HTML metadata.

import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

// Load the Geist font from the local woff files included by create-next-app
const geist = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-sans',
  weight: '100 900',
})

// Default metadata shown in the browser tab (individual pages can override this)
export const metadata: Metadata = {
  title: 'DL Inventory',
  description: 'Drone Legends Inventory Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
