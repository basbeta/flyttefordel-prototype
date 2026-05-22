// Admin dashboard — Phase 1 placeholder.
// Phase 4 will add DashboardStats, ActiveBenefitsWidget, etc.

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-4)' }}>
        Dashboard
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-sm)' }}>
        Admin-funksjonalitet implementeres i Fase 4. Database og schema er klart.
      </p>
    </div>
  )
}
