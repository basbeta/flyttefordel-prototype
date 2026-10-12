// CR-023: Previous / next links at the bottom of a flow page.
// The last page links to the summary instead of "next".

import Link from 'next/link'
import type { FlowPosition } from '@/lib/flow'
import styles from './FlowNav.module.css'

type Props = { position: FlowPosition }

export function FlowNav({ position }: Props) {
  return (
    <nav className={styles.nav} aria-label="Navigering i løpet">
      {position.previous ? (
        <Link href={`/flytting/${position.previous.id}`} className={styles.secondary}>
          Forrige
        </Link>
      ) : (
        <span />
      )}
      {position.next ? (
        <Link href={`/flytting/${position.next.id}`} className={styles.primary}>
          Neste: {position.next.name}
        </Link>
      ) : (
        <Link href="/flytting/oppsummering" className={styles.primary}>
          Til oppsummering
        </Link>
      )}
    </nav>
  )
}
