'use client'

// BottomNavigation — sticky 5-tab navigation for the mobile app.
// Client Component: uses usePathname() to highlight the active tab.
// Touch targets are minimum 44px as per WCAG and PRD requirements.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './BottomNavigation.module.css'

type NavItem = {
  href: string
  label: string
  // SVG path data (viewBox="0 0 24 24")
  icon: string
  // Match any path that starts with this prefix
  matchPrefix?: string
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'Hjem',
    icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    matchPrefix: '/',
  },
  {
    href: '/benefits',
    label: 'Fordeler',
    icon: 'M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z',
    matchPrefix: '/benefits',
  },
  {
    href: '/nearby',
    label: 'Nær deg',
    icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    matchPrefix: '/nearby',
  },
  {
    href: '/saved',
    label: 'Mine',
    icon: 'M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z',
    matchPrefix: '/saved',
  },
  {
    href: '/profile',
    label: 'Profil',
    icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    matchPrefix: '/profile',
  },
]

export function BottomNavigation() {
  const pathname = usePathname()

  function isActive(item: NavItem): boolean {
    // Home: only exact match
    if (item.href === '/') return pathname === '/'
    // Other tabs: match prefix
    return pathname.startsWith(item.matchPrefix ?? item.href)
  }

  return (
    <nav className={styles.nav} aria-label="Hovednavigasjon">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[styles.tab, active ? styles.active : ''].filter(Boolean).join(' ')}
            aria-current={active ? 'page' : undefined}
          >
            <svg
              className={styles.icon}
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path d={item.icon} />
            </svg>
            <span className={styles.label}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
