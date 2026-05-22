// CR-004: Rediger hero.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminHeroById } from '@/lib/queries/adminQueries'
import { HeroForm } from '../HeroForm'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Rediger hero' }

type Props = { params: { id: string } }

export default async function EditHeroPage({ params }: Props) {
  await requireAdminAuth()
  const hero = await getAdminHeroById(params.id)
  if (!hero) notFound()

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Rediger hero</h1>
        <Link href="/admin/heroes" className={styles.secondaryBtn}>← Tilbake</Link>
      </div>
      <HeroForm hero={hero} />
    </div>
  )
}
