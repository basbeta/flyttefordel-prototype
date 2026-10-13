// CR-028: getOrCreateSession keeps a logged-in person's session in step with the person.
import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockHeaders = new Map<string, string>()
vi.mock('next/headers', () => ({
  headers: async () => ({ get: (k: string) => mockHeaders.get(k) ?? null }),
}))
vi.mock('@/lib/db/client', () => ({ prisma: { userSession: { upsert: vi.fn() } } }))
const mockGetPerson = vi.fn()
vi.mock('@/lib/identity', () => ({ getIdentityProvider: () => ({ getPerson: mockGetPerson }) }))
vi.mock('@/lib/identity/linkSession', () => ({ linkSessionToPerson: vi.fn().mockResolvedValue(undefined) }))
const mockExtras = vi.fn()
vi.mock('@/lib/selection/loadPerson', () => ({ loadSelectionExtras: (id: string) => mockExtras(id) }))

import { prisma } from '@/lib/db/client'
import { linkSessionToPerson } from '@/lib/identity/linkSession'
import { getOrCreateSession } from './index'

const upsert = (prisma as unknown as { userSession: { upsert: ReturnType<typeof vi.fn> } }).userSession.upsert

function dbSession(overrides: Record<string, unknown> = {}) {
  return { id: 's1', userId: null, anonymousId: 'anon-1', postcode: null, movingStatus: null, ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockExtras.mockResolvedValue(null)
  mockHeaders.clear()
  mockHeaders.set('x-anon-id', 'anon-1')
})

describe('getOrCreateSession', () => {
  it('gir null uten x-anon-id', async () => {
    mockHeaders.clear()
    expect(await getOrCreateSession()).toBeNull()
  })

  it('uten innlogget person: uendret oppførsel, ingen oppslag av person', async () => {
    upsert.mockResolvedValueOnce(dbSession({ postcode: '0150', movingStatus: 'moved_past' }))
    const s = await getOrCreateSession()
    expect(s).toEqual({ sessionId: 's1', anonymousId: 'anon-1', postcode: '0150', movingStatus: 'moved_past' })
    expect(mockGetPerson).not.toHaveBeenCalled()
  })

  it('person allerede koblet til sesjonen: ingen ny kobling', async () => {
    mockHeaders.set('x-person-id', 'person-1')
    upsert.mockResolvedValueOnce(dbSession({ userId: 'person-1', postcode: '0150', movingStatus: 'recently_moved' }))
    const s = await getOrCreateSession()
    expect(s?.postcode).toBe('0150')
    expect(mockGetPerson).not.toHaveBeenCalled()
    expect(linkSessionToPerson).not.toHaveBeenCalled()
  })

  it('person ikke koblet (anon_id slettet): kobler på nytt og bruker personens postnummer og status', async () => {
    mockHeaders.set('x-person-id', 'person-1')
    upsert.mockResolvedValueOnce(dbSession())
    const person = { id: 'person-1', postcode: '9008', movingStatus: 'recently_moved' }
    mockGetPerson.mockResolvedValueOnce(person)
    const s = await getOrCreateSession()
    expect(linkSessionToPerson).toHaveBeenCalledWith('anon-1', person)
    expect(s).toEqual({ sessionId: 's1', anonymousId: 'anon-1', postcode: '9008', movingStatus: 'recently_moved', personId: 'person-1' })
  })

  it('person finnes ikke lenger: sesjonen returneres som den er', async () => {
    mockHeaders.set('x-person-id', 'borte')
    upsert.mockResolvedValueOnce(dbSession())
    mockGetPerson.mockResolvedValueOnce(null)
    const s = await getOrCreateSession()
    expect(linkSessionToPerson).not.toHaveBeenCalled()
    expect(s).toEqual({ sessionId: 's1', anonymousId: 'anon-1', postcode: null, movingStatus: 'unknown', personId: 'borte' })
  })

  it('CR-029: innlogget person får med flyttedato, boligtype og tidligere valg', async () => {
    mockHeaders.set('x-person-id', 'person-1')
    upsert.mockResolvedValueOnce(dbSession({ userId: 'person-1', postcode: '0150', movingStatus: 'recently_moved' }))
    const extras = { movedAt: new Date('2026-10-03T00:00:00Z'), housingType: 'leilighet', chosenBenefitIds: ['b1'] }
    mockExtras.mockResolvedValueOnce(extras)
    const s = await getOrCreateSession()
    expect(mockExtras).toHaveBeenCalledWith('person-1')
    expect(s).toMatchObject({ postcode: '0150', movingStatus: 'recently_moved', ...extras })
  })

  it('CR-029: også etter ny kobling (anon_id slettet) får personen med ekstradata', async () => {
    mockHeaders.set('x-person-id', 'person-1')
    upsert.mockResolvedValueOnce(dbSession())
    mockGetPerson.mockResolvedValueOnce({ id: 'person-1', postcode: '9008', movingStatus: 'recently_moved' })
    mockExtras.mockResolvedValueOnce({ movedAt: null, housingType: 'enebolig', chosenBenefitIds: [] })
    const s = await getOrCreateSession()
    expect(s).toMatchObject({ postcode: '9008', housingType: 'enebolig', chosenBenefitIds: [] })
  })

  it('CR-029: uten innlogget person leses ingen ekstradata', async () => {
    upsert.mockResolvedValueOnce(dbSession())
    const s = await getOrCreateSession()
    expect(mockExtras).not.toHaveBeenCalled()
    expect(s).not.toHaveProperty('housingType')
  })

  it('CR-029: feiler lasting av ekstradata (null), fungerer sesjonen som før', async () => {
    mockHeaders.set('x-person-id', 'person-1')
    upsert.mockResolvedValueOnce(dbSession({ userId: 'person-1', postcode: '0150', movingStatus: 'recently_moved' }))
    mockExtras.mockResolvedValueOnce(null)
    const s = await getOrCreateSession()
    expect(s).toEqual({ sessionId: 's1', anonymousId: 'anon-1', postcode: '0150', movingStatus: 'recently_moved', personId: 'person-1' })
  })

  it('gir null ved databasefeil (nedgradert, ikke krasj)', async () => {
    upsert.mockRejectedValueOnce(new Error('db'))
    expect(await getOrCreateSession()).toBeNull()
  })
})
