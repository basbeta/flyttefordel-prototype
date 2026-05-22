// CR-004: Admin layout — requires valid JWT (enforced by middleware + requireAdminAuth).

import { requireAdminAuth } from '@/lib/admin/auth'
import { AdminShell } from '@/components/admin/AdminShell'

export const metadata = {
  title: {
    default: 'Admin',
    template: '%s | Fordelsklubben Admin',
  },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAuth()
  return <AdminShell>{children}</AdminShell>
}
