// CR-028: Login page (simulated Vipps). Outside (mobile) and (web) so it has neither shell.
// Reads the test persons from the database. A DB failure or an empty list shows a clear message
// instead of an error page, and QA can still create a new test person.

import type { Metadata } from 'next'
import { getIdentityProvider, safeNext } from '@/lib/identity'
import { safeErrorLabel } from '@/lib/identity/safeErrorLabel'
import type { PersonSummary } from '@/lib/identity'
import { LoginClient } from './LoginClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Logg inn' }

type Props = { searchParams: Promise<{ next?: string | string[] }> }

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams
  const target = safeNext(Array.isArray(next) ? next[0] : next)

  let persons: PersonSummary[] = []
  let loadFailed = false
  try {
    persons = await getIdentityProvider().listPersons()
  } catch (err) {
    console.error('[logg-inn] Kunne ikke hente testpersoner:', safeErrorLabel(err))
    loadFailed = true
  }

  return <LoginClient initialPersons={persons} loadFailed={loadFailed} next={target} />
}
