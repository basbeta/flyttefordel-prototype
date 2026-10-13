// CR-003: Brukerprofil.
// CR-028: Postcode and moving status belong to the logged-in person, so the profile is read-only.
// To test another case, switch person.

import type { Metadata } from 'next'
import { getCurrentPerson } from '@/lib/identity/current'
import { describePerson } from '@/lib/identity/labels'
import { SwitchPersonButton } from '@/components/shared/SwitchPersonButton'
import { TopBar } from '@/components/mobile/TopBar'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Profil' }

export default async function ProfilePage() {
  const person = await getCurrentPerson()

  return (
    <>
      <TopBar variant="title" title="Profil" />
      <div className={styles.page}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{person ? person.name : 'Ikke innlogget'}</h2>
          <p className={styles.sectionDesc}>
            Dette er en simulert innlogging. Opplysningene tilhører testpersonen og brukes til å
            tilpasse fordelsvisningen. Vil du teste et annet tilfelle, bytt person.
          </p>
          {person && (
            <dl className={styles.details}>
              <div className={styles.detailRow}>
                <dt className={styles.detailLabel}>E-post (test)</dt>
                <dd className={styles.detailValue}>{person.email ?? 'Ingen'}</dd>
              </div>
              {describePerson(person).map((d) => (
                <div key={d.label} className={styles.detailRow}>
                  <dt className={styles.detailLabel}>{d.label}</dt>
                  <dd className={styles.detailValue}>{d.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <SwitchPersonButton fullWidth size="md" />
        </section>
      </div>
    </>
  )
}
