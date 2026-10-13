// CR-029: hero targeting accepts and stores the new selection fields (shared schema).
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  prisma: { hero: { findFirst: vi.fn(), update: vi.fn().mockResolvedValue({}) } },
}))
vi.mock('@/lib/admin/auth', () => ({
  verifyAdminJWT: vi.fn().mockResolvedValue({ email: 'admin@example.com' }),
  ADMIN_TOKEN_COOKIE: 'admin_token',
}))

import { prisma } from '@/lib/db/client'
import { verifyAdminJWT } from '@/lib/admin/auth'
import { PATCH } from './route'
import { NextRequest } from 'next/server'

const hero = (prisma as unknown as { hero: { findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> } }).hero
const mockVerify = verifyAdminJWT as unknown as ReturnType<typeof vi.fn>
const PARAMS = { params: Promise.resolve({ id: 'h1' }) }

function makeRequest(body: unknown, cookie = 'admin_token=valid') {
  return new NextRequest('http://localhost/api/admin/heroes/h1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue({ email: 'admin@example.com' })
  hero.findFirst.mockResolvedValue({ id: 'h1' })
})

describe('PATCH /api/admin/heroes/[id], CR-029', () => {
  it('uten gyldig admin-token gir 401', async () => {
    mockVerify.mockResolvedValueOnce(null)
    const res = await PATCH(makeRequest({ title: 'x' }), PARAMS)
    expect(res.status).toBe(401)
    expect(hero.update).not.toHaveBeenCalled()
  })

  it('lagrer dager siden flytting, boligtype og kryssalg i regelen', async () => {
    const res = await PATCH(
      makeRequest({
        targeting: {
          daysSinceMoveMin: -30,
          daysSinceMoveMax: 0,
          housingTypes: ['enebolig', 'rekkehus'],
          requiresChosenBenefitIds: ['3f2b1c3e-8c58-4a0d-9d3e-111111111111'],
        },
      }),
      PARAMS
    )
    expect(res.status).toBe(200)
    const upsert = hero.update.mock.calls[0][0].data.targeting.upsert
    expect(upsert.update).toMatchObject({
      daysSinceMoveMin: -30,
      daysSinceMoveMax: 0,
      housingTypes: ['enebolig', 'rekkehus'],
    })
    expect(upsert.create).toMatchObject({ daysSinceMoveMin: -30, daysSinceMoveMax: 0 })
  })

  it('avviser fra større enn til (400)', async () => {
    const res = await PATCH(makeRequest({ targeting: { daysSinceMoveMin: 10, daysSinceMoveMax: 5 } }), PARAMS)
    expect(res.status).toBe(400)
    expect(hero.update).not.toHaveBeenCalled()
  })
})
