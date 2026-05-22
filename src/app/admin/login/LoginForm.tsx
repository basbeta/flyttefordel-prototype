'use client'
// CR-004: Admin login form.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (res.ok) {
      router.push('/admin')
      router.refresh()
    } else {
      const data = (await res.json()) as { message?: string }
      setError(data.message ?? 'Innlogging feilet')
      setLoading(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">E-post</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">Passord</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          className={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" className={styles.submitBtn} disabled={loading}>
        {loading ? 'Logger inn…' : 'Logg inn'}
      </button>
    </form>
  )
}
