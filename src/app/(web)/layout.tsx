// CR-023: Layout for the web flow. Simple header, responsive content (mobile first).
// Deliberately no MobileShell / bottom navigation.
// CR-028: The header shows who is logged in (simulated Vipps) and a "Bytt person" button.

import Link from 'next/link'
import { getCurrentPerson } from '@/lib/identity/current'
import { SwitchPersonButton } from '@/components/shared/SwitchPersonButton'
import styles from './layout.module.css'

export default async function WebLayout({ children }: { children: React.ReactNode }) {
  const person = await getCurrentPerson()
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/flytting" className={styles.brand}>
            Flyttefordel
          </Link>
          {person && (
            <div className={styles.person}>
              <span className={styles.personName}>{person.name}</span>
              <SwitchPersonButton size="sm" />
            </div>
          )}
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
