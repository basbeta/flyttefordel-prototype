// AdminShell — outer wrapper for all backoffice pages.
// Desktop-first: sidebar left, content right.
// Auth guard will be added in CR-002.

import { AdminSidebar } from './AdminSidebar'
import styles from './AdminShell.module.css'

type AdminShellProps = {
  children: React.ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className={styles.shell}>
      <AdminSidebar />
      <div className={styles.main}>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}
