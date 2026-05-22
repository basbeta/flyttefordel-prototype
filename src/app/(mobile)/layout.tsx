// Mobile app layout — wraps all consumer-facing routes.
// Renders MobileShell with sticky bottom navigation.

import { MobileShell } from '@/components/mobile/MobileShell'

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <MobileShell>{children}</MobileShell>
}
