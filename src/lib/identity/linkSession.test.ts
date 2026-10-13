// CR-028: the session is filled from the person so targeting works unchanged.
import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/db/client', () => ({ prisma: { userSession: { upsert: vi.fn().mockResolvedValue({}) } } }))

import { prisma } from '@/lib/db/client'
import { linkSessionToPerson } from './linkSession'

const upsert = (prisma as unknown as { userSession: { upsert: ReturnType<typeof vi.fn> } }).userSession.upsert

const base = {
  id: 'p1',
  name: 'Test',
  movedAt: null,
  fromAddress: null,
  toAddress: null,
  housingType: null,
  isTest: true,
  seeded: true,
}

describe('linkSessionToPerson', () => {
  it('setter userId og kopierer postnummer og flyttestatus til sesjonen', async () => {
    await linkSessionToPerson('anon-1', { ...base, postcode: '0150', movingStatus: 'recently_moved' })
    const arg = upsert.mock.calls[0][0]
    expect(arg.where).toEqual({ anonymousId: 'anon-1' })
    expect(arg.update).toMatchObject({ userId: 'p1', postcode: '0150', movingStatus: 'recently_moved' })
    expect(arg.create).toMatchObject({ anonymousId: 'anon-1', userId: 'p1', postcode: '0150' })
  })

  it('nullstiller postnummer når den nye personen ikke har noe (bytte person)', async () => {
    await linkSessionToPerson('anon-1', { ...base, postcode: null, movingStatus: 'unknown' })
    expect(upsert.mock.calls[1][0].update).toMatchObject({ postcode: null, movingStatus: 'unknown' })
  })
})
