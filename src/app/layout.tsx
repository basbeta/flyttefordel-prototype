// Root layout — wraps all routes (mobile and admin).
// Keep this minimal: only global styles, metadata and HTML structure.

import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Fordelsklubben',
    template: '%s | Fordelsklubben',
  },
  description: 'Gode fordeler samlet på ett sted.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Fordelsklubben',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1f5c4d',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  )
}
