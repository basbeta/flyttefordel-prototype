// TopBar — page header for mobile screens.
// Three variants: default (logo), back (with back button), title (with page title).

import Link from 'next/link'
import styles from './TopBar.module.css'

type TopBarVariant = 'default' | 'back' | 'title'

type TopBarProps = {
  variant?: TopBarVariant
  title?: string
  backHref?: string
  action?: React.ReactNode
}

export function TopBar({ variant = 'default', title, backHref = '/', action }: TopBarProps) {
  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        {variant === 'back' && (
          <Link href={backHref} className={styles.backButton} aria-label="Tilbake">
            {/* Back arrow icon */}
            <svg viewBox="0 0 24 24" fill="currentColor" width={24} height={24} aria-hidden="true">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </Link>
        )}
        {variant === 'default' && (
          <Link href="/" className={styles.logo} aria-label="Fordelsklubben — hjem">
            Fordelsklubben
          </Link>
        )}
        {variant === 'title' && (
          <h1 className={styles.pageTitle}>{title}</h1>
        )}
      </div>
      {action && <div className={styles.right}>{action}</div>}
    </header>
  )
}
