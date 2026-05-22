// CR-004: Admin innloggingsside.

import type { Metadata } from 'next'
import { LoginForm } from './LoginForm'
import styles from './page.module.css'

export const metadata: Metadata = { title: 'Logg inn | Admin' }

export default function AdminLoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Fordelsklubben</h1>
          <span className={styles.badge}>Admin</span>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
