// Admin layout — wraps all backoffice routes.
// Auth middleware will be added in CR-002.

import { AdminShell } from '@/components/admin/AdminShell'

export const metadata = {
  title: {
    default: 'Admin',
    template: '%s | Fordelsklubben Admin',
  },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
