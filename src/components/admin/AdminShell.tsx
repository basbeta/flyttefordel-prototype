// CR-002: AdminShell — outer wrapper for all backoffice pages.
// CR-004: Logout button added.

import { AdminSidebar } from './AdminSidebar'
import { LogoutButton } from './LogoutButton'
import styles from './AdminShell.module.css'

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <AdminSidebar />
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div />
          <LogoutButton />
        </header>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}
