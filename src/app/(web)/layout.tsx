// CR-023: Layout for the web flow. Simple header, responsive content (mobile first).
// Deliberately no MobileShell / bottom navigation.

import Link from 'next/link'
import styles from './layout.module.css'

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/flytting" className={styles.brand}>
          Flyttefordel
        </Link>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
