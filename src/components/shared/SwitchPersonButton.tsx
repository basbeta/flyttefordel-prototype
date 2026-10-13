'use client'
// CR-028: "Bytt person" — logs out of the simulated login and goes back to the login page.
// Shared by the app (profile) and the web flow (header), so it imports from neither.

import { useState } from 'react'
import { LOGIN_PATH } from '@/lib/identity/safeNext'
import { Button } from './Button'

type Props = { variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'md' | 'lg'; fullWidth?: boolean }

export function SwitchPersonButton({ variant = 'secondary', size = 'sm', fullWidth }: Props) {
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    setBusy(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      // Full navigation so every client-side store starts clean for the next person.
      window.location.assign(LOGIN_PATH)
    }
  }

  return (
    <Button type="button" variant={variant} size={size} fullWidth={fullWidth} loading={busy} onClick={handleClick}>
      Bytt person
    </Button>
  )
}
