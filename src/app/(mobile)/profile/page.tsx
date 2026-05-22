// CR-003: Brukerprofil — postnummer og flyttestatus.

import type { Metadata } from 'next'
import { getOrCreateSession } from '@/lib/session'
import { TopBar } from '@/components/mobile/TopBar'
import { ProfileForm } from './ProfileForm'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Profil' }

export default async function ProfilePage() {
  const session = await getOrCreateSession()

  return (
    <>
      <TopBar variant="title" title="Profil" />
      <div className={styles.page}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Dine preferanser</h2>
          <p className={styles.sectionDesc}>
            Informasjonen lagres lokalt på denne enheten og brukes kun til å tilpasse fordelsvisningen.
          </p>
          <ProfileForm
            initialPostcode={session?.postcode ?? null}
            initialMovingStatus={session?.movingStatus ?? 'unknown'}
          />
        </section>
      </div>
    </>
  )
}
