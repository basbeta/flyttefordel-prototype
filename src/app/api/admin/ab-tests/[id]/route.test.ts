// CR-030: admin API for one A/B test (edit, start, end, locking, one running test per scope).
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/client', () => ({
  prisma: {
    abTest: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    benefitView: { findMany: vi.fn() },
  },
}))
vi.mock('@/lib/admin/auth', () => ({
  ADMIN_TOKEN_COOKIE: 'admin_token',
  verifyAdminJWT: vi.fn(),
}))

import { prisma } from '@/lib/db/client'
import { verifyAdminJWT } from '@/lib/admin/auth'
import { PUT } from './route'

const db = prisma as unknown as {
  abTest: Record<string, ReturnType<typeof vi.fn>>
  benefitView: Record<string, ReturnType<typeof vi.fn>>
}
const mockVerify = verifyAdminJWT as unknown as ReturnType<typeof vi.fn>

const ID = '22222222-2222-4222-8222-222222222222'
const BENEFIT = '11111111-1111-4111-8111-111111111111'

function params(id = ID) {
  return { params: Promise.resolve({ id }) }
}

function req(body?: unknown, cookie = true) {
  return new NextRequest(`http://localhost/api/admin/ab-tests/${ID}`, {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie: 'admin_token=valid' } : {}) },
  })
}

function row(over: Record<string, unknown> = {}) {
  return {
    id: ID,
    name: 'Test',
    kind: 'content',
    scope: { benefitId: BENEFIT, format: 'app_card' },
    scopeKey: `content:${BENEFIT}:app_card`,
    status: 'draft',
    variants: [
      { key: 'standard', weight: 1 },
      { key: 'b', weight: 1 },
    ],
    primaryGoal: null,
    startsAt: null,
    endsAt: null,
    ...over,
  }
}

let errorSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue({ email: 'admin@example.test' })
  db.abTest.findUnique.mockResolvedValue(row())
  db.abTest.findFirst.mockResolvedValue(null)
  db.abTest.update.mockImplementation(async ({ data }: { data: object }) => ({ ...row(), ...data }))
  db.benefitView.findMany.mockResolvedValue([{ variant: 'b' }])
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => errorSpy.mockRestore())

describe('PUT /api/admin/ab-tests/[id]', () => {
  it('401 uten admin-cookie og rører ikke databasen', async () => {
    expect((await PUT(req({ name: 'x' }, false), params())).status).toBe(401)
    expect(db.abTest.findUnique).not.toHaveBeenCalled()
  })

  it('404 for ikke-uuid og ukjent test', async () => {
    expect((await PUT(req({ name: 'x' }), params('ikke-uuid'))).status).toBe(404)
    db.abTest.findUnique.mockResolvedValueOnce(null)
    expect((await PUT(req({ name: 'x' }), params())).status).toBe(404)
  })

  it('endrer navn og mål', async () => {
    const res = await PUT(req({ name: 'Nytt navn', primaryGoal: 'redeemed' }), params())
    expect(res.status).toBe(200)
    expect(db.abTest.update.mock.calls[0][0].data).toMatchObject({ name: 'Nytt navn', primaryGoal: 'redeemed', status: 'draft' })
  })

  describe('start', () => {
    it('draft til running når alt er på plass', async () => {
      const res = await PUT(req({ status: 'running' }), params())
      expect(res.status).toBe(200)
      expect(db.abTest.update.mock.calls[0][0].data.status).toBe('running')
      expect(db.benefitView.findMany.mock.calls[0][0].where).toEqual({
        benefitId: BENEFIT,
        format: 'app_card',
        variant: { in: ['b'] },
      })
    })

    it('409 når en annen test kjører på samme scope', async () => {
      db.abTest.findFirst.mockResolvedValueOnce({ id: 'annen' })
      const res = await PUT(req({ status: 'running' }), params())
      expect(res.status).toBe(409)
      expect(db.abTest.findFirst.mock.calls[0][0].where).toEqual({
        scopeKey: `content:${BENEFIT}:app_card`,
        status: 'running',
        id: { not: ID },
      })
      expect(db.abTest.update).not.toHaveBeenCalled()
    })

    it('400 når en variant mangler innhold', async () => {
      db.benefitView.findMany.mockResolvedValueOnce([])
      const res = await PUT(req({ status: 'running' }), params())
      expect(res.status).toBe(400)
      expect((await res.json()).message).toContain('b')
      expect(db.abTest.update).not.toHaveBeenCalled()
    })
  })

  describe('låsing og statusflyt', () => {
    it('409 når varianter eller vekter endres mens testen kjører', async () => {
      db.abTest.findUnique.mockResolvedValueOnce(row({ status: 'running' }))
      const res = await PUT(
        req({ variants: [{ key: 'standard', weight: 1 }, { key: 'b', weight: 9 }] }),
        params()
      )
      expect(res.status).toBe(409)
      expect(db.abTest.update).not.toHaveBeenCalled()
    })

    it('varianter kan endres i draft, og valideres av testtypen', async () => {
      const ok = await PUT(
        req({ variants: [{ key: 'standard', weight: 3 }, { key: 'b', weight: 1 }] }),
        params()
      )
      expect(ok.status).toBe(200)
      expect(db.abTest.update.mock.calls[0][0].data.variants).toEqual([
        { key: 'standard', weight: 3 },
        { key: 'b', weight: 1 },
      ])
      const bad = await PUT(req({ variants: [{ key: 'a', weight: 1 }, { key: 'b', weight: 1 }] }), params())
      expect(bad.status).toBe(400)
    })

    it('running til ended er lov, og navn kan endres mens den kjører', async () => {
      db.abTest.findUnique.mockResolvedValue(row({ status: 'running' }))
      expect((await PUT(req({ name: 'Nytt' }), params())).status).toBe(200)
      expect((await PUT(req({ status: 'ended' }), params())).status).toBe(200)
    })

    it('409 for ulovlige statusendringer (ended er endelig, running tilbake til draft)', async () => {
      db.abTest.findUnique.mockResolvedValueOnce(row({ status: 'ended' }))
      expect((await PUT(req({ status: 'running' }), params())).status).toBe(409)
      db.abTest.findUnique.mockResolvedValueOnce(row({ status: 'running' }))
      expect((await PUT(req({ status: 'draft' }), params())).status).toBe(409)
      db.abTest.findUnique.mockResolvedValueOnce(row({ status: 'ended' }))
      expect((await PUT(req({ name: 'x' }), params())).status).toBe(409)
      expect(db.abTest.update).not.toHaveBeenCalled()
    })

    it('å avslutte en avsluttet test på nytt er en ufarlig gjentakelse (200)', async () => {
      db.abTest.findUnique.mockResolvedValueOnce(row({ status: 'ended' }))
      expect((await PUT(req({ status: 'ended' }), params())).status).toBe(200)
    })
  })

  it('400 for sluttdato før startdato og ukjent status', async () => {
    expect((await PUT(req({ startsAt: '2026-11-02T00:00:00Z', endsAt: '2026-11-01T00:00:00Z' }), params())).status).toBe(400)
    expect((await PUT(req({ status: 'paused' }), params())).status).toBe(400)
  })
})
