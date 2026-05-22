// CR-007: Opprett ny kategori.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminAuth } from '@/lib/admin/auth'
import { CategoryForm } from '../CategoryForm'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Ny kategori' }

export default async function NewCategoryPage() {
  await requireAdminAuth()
  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Ny kategori</h1>
        <Link href="/admin/categories" className={styles.secondaryBtn}>← Tilbake</Link>
      </div>
      <CategoryForm />
    </div>
  )
}
