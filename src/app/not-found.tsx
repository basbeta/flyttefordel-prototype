// Global 404 page.

import Link from 'next/link'

export default function NotFound() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        padding: 'var(--space-6)',
        textAlign: 'center',
        gap: 'var(--space-4)',
      }}
    >
      <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
        Vi fant ikke det du leter etter
      </h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Siden eksisterer ikke eller har blitt flyttet.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          padding: 'var(--space-3) var(--space-6)',
          background: 'var(--color-primary)',
          color: '#fff',
          borderRadius: 'var(--radius-full)',
          fontWeight: 'var(--font-weight-medium)',
          fontSize: 'var(--font-sm)',
        }}
      >
        Gå til forsiden
      </Link>
    </main>
  )
}
