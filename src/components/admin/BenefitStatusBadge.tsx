// CR-016: Delt statusbadge for fordeler — viser beregnet visningsstatus
// (aktiv/planlagt/kladd/feilet) med farge + valgfri forklaringsliste.

import type { BenefitDisplayStatus } from '@/lib/benefits/displayStatus'
import styles from './BenefitStatusBadge.module.css'

type Props = {
  status: BenefitDisplayStatus
  showReasons?: boolean
}

export function BenefitStatusBadge({ status, showReasons = false }: Props) {
  const title = status.reasons.length > 0 ? status.reasons.join('; ') : undefined

  return (
    <div>
      <span className={`${styles.badge} ${styles[`bucket-${status.bucket}`]}`} title={title}>
        {status.label}
      </span>
      {showReasons && status.reasons.length > 0 && (
        <ul className={styles.reasons}>
          {status.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
