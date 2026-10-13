// CR-028: simulated Vipps against mocked Prisma. Only test persons (is_test) can be listed or
// logged into, the list has no e-mail, and the e-mail is stored on the person at login.
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  prisma: { user: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() } },
}))

import { prisma } from '@/lib/db/client'
import { orderPersons, simulatedVipps } from './simulatedVipps'

const user = (prisma as unknown as {
  user: Record<'findMany' | 'findFirst' | 'update' | 'create', ReturnType<typeof vi.fn>>
}).user

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    name: 'Test Nylig-Flyttet',
    email: 'qa@bas.no',
    postcode: '0150',
    movingStatus: 'recently_moved',
    movedAt: new Date('2026-10-03T00:00:00Z'),
    fromAddress: 'Testveien 1',
    toAddress: 'Testgata 2',
    housingType: 'leilighet',
    isTest: true,
    seedKey: 'test-nylig-flyttet',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('orderPersons', () => {
  it('sorterer seedede først i persona-rekkefølge, så nye etter opprettelsestid', () => {
    const rows = [
      row({ id: 'ny2', seedKey: null, createdAt: new Date('2026-10-05T00:00:00Z') }),
      row({ id: 'nord', seedKey: 'test-nord-norge' }),
      row({ id: 'ny1', seedKey: null, createdAt: new Date('2026-10-02T00:00:00Z') }),
      row({ id: 'nylig', seedKey: 'test-nylig-flyttet' }),
    ]
    expect(orderPersons(rows).map((r) => r.id)).toEqual(['nylig', 'nord', 'ny1', 'ny2'])
  })
})

describe('listPersons', () => {
  it('henter bare testpersoner som ikke er slettet, og gir ingen e-post', async () => {
    user.findMany.mockResolvedValueOnce([row()])
    const persons = await simulatedVipps.listPersons()
    expect(user.findMany.mock.calls[0][0].where).toEqual({ isTest: true, deletedAt: null })
    expect(persons).toHaveLength(1)
    expect(persons[0]).not.toHaveProperty('email')
    expect(persons[0]).toMatchObject({ id: 'p1', movedAt: '2026-10-03', seeded: true, isTest: true })
  })

  it('markerer opprettede personer som ikke seedet', async () => {
    user.findMany.mockResolvedValueOnce([row({ seedKey: null })])
    expect((await simulatedVipps.listPersons())[0].seeded).toBe(false)
  })
})

describe('login', () => {
  it('returnerer null for ukjent person eller en som ikke er testperson, uten å skrive', async () => {
    user.findFirst.mockResolvedValueOnce(null)
    expect(await simulatedVipps.login({ personId: 'x', email: 'qa@bas.no' })).toBeNull()
    expect(user.findFirst.mock.calls[0][0].where).toEqual({ id: 'x', isTest: true, deletedAt: null })
    expect(user.update).not.toHaveBeenCalled()
  })

  it('lagrer test-e-posten på personen (siste innlogging vinner) og returnerer personen med e-post', async () => {
    user.findFirst.mockResolvedValueOnce({ id: 'p1' })
    user.update.mockResolvedValueOnce(row({ email: 'ny@bas.no' }))
    const person = await simulatedVipps.login({ personId: 'p1', email: 'ny@bas.no' })
    expect(user.update.mock.calls[0][0].where).toEqual({ id: 'p1' })
    expect(user.update.mock.calls[0][0].data).toEqual({ email: 'ny@bas.no' })
    expect(person?.email).toBe('ny@bas.no')
  })
})

describe('createPerson', () => {
  it('oppretter alltid en testperson uten seedKey og uten e-post', async () => {
    user.create.mockResolvedValueOnce(row({ id: 'ny', seedKey: null, email: null }))
    await simulatedVipps.createPerson({
      name: 'Test Ny',
      postcode: '0150',
      movingStatus: 'unknown',
      movedAt: '2026-10-01',
      fromAddress: null,
      toAddress: null,
      housingType: null,
    })
    const data = user.create.mock.calls[0][0].data
    expect(data.isTest).toBe(true)
    expect(data).not.toHaveProperty('seedKey')
    expect(data).not.toHaveProperty('email')
    expect(data.movedAt).toEqual(new Date('2026-10-01T00:00:00Z'))
  })
})

describe('getPerson', () => {
  it('slår bare opp testpersoner, og gir null når den ikke finnes', async () => {
    user.findFirst.mockResolvedValueOnce(null)
    expect(await simulatedVipps.getPerson('x')).toBeNull()
    expect(user.findFirst.mock.calls[0][0].where).toEqual({ id: 'x', isTest: true, deletedAt: null })
  })
})
