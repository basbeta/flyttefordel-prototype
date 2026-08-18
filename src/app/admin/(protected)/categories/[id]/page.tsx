// CR-007: Rediger kategori.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminCategoryById } from '@/lib/queries/adminQueries'
import { CategoryForm } from '../CategoryForm'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Rediger kategori' }

type Props = { params: Promise<{ id: string }> }

export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params
  await requireAdminAuth()
  const category = await getAdminCategoryById(id)
  if (!category) notFound()

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Rediger kategori</h1>
        <Link href="/admin/categories" className={styles.secondaryBtn}>← Tilbake</Link>
      </div>
      <CategoryForm category={category} />
    </div>
  )
}
