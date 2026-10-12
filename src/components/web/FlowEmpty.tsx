// CR-023: Empty state when there is nothing in the flow for this person.

import styles from './FlowEmpty.module.css'

export function FlowEmpty() {
  return (
    <div className={styles.wrapper} role="status">
      <h1 className={styles.title}>Ingen fordeler akkurat nå</h1>
      <p className={styles.text}>
        Det er ingen sider i løpet som passer for deg ennå. Prøv igjen senere.
      </p>
    </div>
  )
}
