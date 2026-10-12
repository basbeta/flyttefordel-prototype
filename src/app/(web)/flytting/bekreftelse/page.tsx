// CR-024: Confirmation after a successful order (reads the browser-only "last order").

import type { Metadata } from 'next'
import { FlowConfirmation } from '@/components/web/FlowConfirmation'

export const metadata: Metadata = { title: 'Bestilling registrert' }

export default function FlowConfirmationPage() {
  return <FlowConfirmation />
}
