// CR-023: Progress for the web flow ("Side X av N", "Neste: <side>").
// Position is computed from the person's own flow (pages can be skipped).

import type { FlowPosition } from '@/lib/flow'
import styles from './FlowProgress.module.css'

type Props = { position: FlowPosition }

export function FlowProgress({ position }: Props) {
  const percent = Math.round((position.position / position.total) * 100)
  return (
    <div className={styles.wrapper}>
      <div className={styles.row}>
        <span className={styles.step}>
          Side {position.position} av {position.total}
        </span>
        {position.next && <span className={styles.next}>Neste: {position.next.name}</span>}
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-label="Fremdrift i flyttefordel"
        aria-valuemin={1}
        aria-valuemax={position.total}
        aria-valuenow={position.position}
        aria-valuetext={`Side ${position.position} av ${position.total}`}
      >
        <div className={styles.bar} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
