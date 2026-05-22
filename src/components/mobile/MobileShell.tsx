// MobileShell — outer wrapper for all consumer-facing mobile pages.
// Sets max-width, centers on larger screens, and renders BottomNavigation.
// This is a Server Component — BottomNavigation is a Client Component.

import { BottomNavigation } from './BottomNavigation'
import styles from './MobileShell.module.css'

type MobileShellProps = {
  children: React.ReactNode
  showBottomNav?: boolean
}

export function MobileShell({ children, showBottomNav = true }: MobileShellProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.shell}>
        <main className={styles.content}>{children}</main>
        {showBottomNav && <BottomNavigation />}
      </div>
    </div>
  )
}
