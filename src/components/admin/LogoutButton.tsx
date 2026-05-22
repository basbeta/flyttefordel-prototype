'use client'
// CR-004: Admin logout button.

import { useRouter } from 'next/navigation'
import styles from './AdminShell.module.css'

export function LogoutButton() {
  const router = useRouter()

  async function logout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <button className={styles.logoutBtn} onClick={logout}>
      Logg ut
    </button>
  )
}
