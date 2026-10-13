// CR-029: loadSelectionExtras reads moved date, housing type and earlier orders for a person.
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  prisma: { user: { findFirst: vi.fn() }, orderLine: { findMany: vi.fn() } },
}))

import { prisma } from '@/lib/db/client'
import { loadSelectionExtras } from './loadPerson'

const db = prisma as unknown as {
  user: { findFirst: ReturnType<typeof vi.fn> }
  orderLine: { findMany: ReturnType<typeof vi.fn> }
}

let errorSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  vi.clearAllMocks()
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => errorSpy.mockRestore())

describe('loadSelectionExtras', () => {
  it('gir flyttedato, boligtype og unike tidligere valg (bare ordre for denne personen)', async () => {
    db.user.findFirst.mockResolvedValueOnce({ movedAt: new Date('2026-10-03T00:00:00Z'), housingType: 'leilighet' })
    db.orderLine.findMany.mockResolvedValueOnce([{ benefitId: 'b1' }, { benefitId: 'b2' }, { benefitId: 'b1' }])
    const r = await loadSelectionExtras('p1')
    expect(r).toEqual({ movedAt: new Date('2026-10-03T00:00:00Z'), housingType: 'leilighet', chosenBenefitIds: ['b1', 'b2'] })
    expect(db.orderLine.findMany.mock.calls[0][0].where).toEqual({ order: { personId: 'p1' } })
    expect(db.user.findFirst.mock.calls[0][0].where).toEqual({ id: 'p1', deletedAt: null })
  })

  it('gir tom liste når personen ikke har bestilt noe', async () => {
    db.user.findFirst.mockResolvedValueOnce({ movedAt: null, housingType: null })
    db.orderLine.findMany.mockResolvedValueOnce([])
    expect(await loadSelectionExtras('p1')).toEqual({ movedAt: null, housingType: null, chosenBenefitIds: [] })
  })

  it('gir null når personen ikke finnes', async () => {
    db.user.findFirst.mockResolvedValueOnce(null)
    db.orderLine.findMany.mockResolvedValueOnce([])
    expect(await loadSelectionExtras('borte')).toBeNull()
  })

  it('kaster aldri: databasefeil gir null (siden skal fortsatt kunne vises), og logges uten melding', async () => {
    db.user.findFirst.mockRejectedValueOnce(new Error('db nede for qa@bas.no'))
    db.orderLine.findMany.mockResolvedValueOnce([])
    expect(await loadSelectionExtras('p1')).toBeNull()
    expect(errorSpy).toHaveBeenCalledTimes(1)
    const logged = JSON.stringify(errorSpy.mock.calls)
    expect(logged).toContain('Error')
    expect(logged).not.toContain('qa@bas.no')
    expect(logged).not.toContain('db nede')
  })
})
