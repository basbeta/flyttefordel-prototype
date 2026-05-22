// CR-004: Opprett ny hero.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminAuth } from '@/lib/admin/auth'
import { HeroForm } from '../HeroForm'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Ny hero' }

export default async function NewHeroPage() {
  await requireAdminAuth()

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Ny hero</h1>
        <Link href="/admin/heroes" className={styles.secondaryBtn}>← Tilbake</Link>
      </div>
      <HeroForm />
    </div>
  )
}
