// CR-004: Rediger hero.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminHeroById, getBenefitOptions } from '@/lib/queries/adminQueries'
import { HeroForm } from '../HeroForm'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Rediger hero' }

type Props = { params: Promise<{ id: string }> }

export default async function EditHeroPage({ params }: Props) {
  const { id } = await params
  await requireAdminAuth()
  const [hero, benefitOptions] = await Promise.all([getAdminHeroById(id), getBenefitOptions()])
  if (!hero) notFound()

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Rediger hero</h1>
        <Link href="/admin/heroes" className={styles.secondaryBtn}>← Tilbake</Link>
      </div>
      <HeroForm hero={hero} benefitOptions={benefitOptions} />
    </div>
  )
}
