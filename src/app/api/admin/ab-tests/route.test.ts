// CR-030: admin API for A/B tests (list, create).
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/client', () => ({
  prisma: { abTest: { findMany: vi.fn(), create: vi.fn() } },
}))
vi.mock('@/lib/admin/auth', () => ({
  ADMIN_TOKEN_COOKIE: 'admin_token',
  verifyAdminJWT: vi.fn(),
}))

import { prisma } from '@/lib/db/client'
import { verifyAdminJWT } from '@/lib/admin/auth'
import { GET, POST } from './route'

const db = prisma as unknown as { abTest: Record<string, ReturnType<typeof vi.fn>> }
const mockVerify = verifyAdminJWT as unknown as ReturnType<typeof vi.fn>

const BENEFIT = '11111111-1111-4111-8111-111111111111'

function req(method: string, body?: unknown, { cookie = true, query = '' } = {}) {
  return new NextRequest(`http://localhost/api/admin/ab-tests${query}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie: 'admin_token=valid' } : {}) },
  })
}

function valid(over: Record<string, unknown> = {}) {
  return {
    name: 'Ny tittel mot gammel',
    kind: 'content',
    scope: { benefitId: BENEFIT, format: 'app_card' },
    variants: [
      { key: 'standard', weight: 1 },
      { key: 'b', weight: 1 },
    ],
    ...over,
  }
}

let errorSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue({ email: 'admin@example.test' })
  db.abTest.create.mockImplementation(async ({ data }: { data: object }) => ({ id: 't1', ...data }))
  db.abTest.findMany.mockResolvedValue([])
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => errorSpy.mockRestore())

describe('GET /api/admin/ab-tests', () => {
  it('401 uten admin-cookie', async () => {
    expect((await GET(req('GET', undefined, { cookie: false }))).status).toBe(401)
    expect(db.abTest.findMany).not.toHaveBeenCalled()
  })

  it('filtrerer på benefitId', async () => {
    const res = await GET(req('GET', undefined, { query: `?benefitId=${BENEFIT}` }))
    expect(res.status).toBe(200)
    expect(db.abTest.findMany.mock.calls[0][0].where).toEqual({ scopeKey: { contains: BENEFIT } })
  })
})

describe('POST /api/admin/ab-tests', () => {
  it('401 uten admin-cookie og rører ikke databasen', async () => {
    expect((await POST(req('POST', valid(), { cookie: false }))).status).toBe(401)
    expect(db.abTest.create).not.toHaveBeenCalled()
  })

  it('oppretter som draft med utledet scopeKey', async () => {
    const res = await POST(req('POST', valid({ primaryGoal: 'opened' })))
    expect(res.status).toBe(201)
    const data = db.abTest.create.mock.calls[0][0].data
    expect(data.status).toBe('draft')
    expect(data.kind).toBe('content')
    expect(data.scopeKey).toBe(`content:${BENEFIT}:app_card`)
    expect(data.primaryGoal).toBe('opened')
  })

  it('status i body ignoreres: en ny test er alltid draft', async () => {
    await POST(req('POST', valid({ status: 'running' })))
    expect(db.abTest.create.mock.calls[0][0].data.status).toBe('draft')
  })

  it.each([
    ['ukjent testtype', valid({ kind: 'placement' })],
    ['ukjent format', valid({ scope: { benefitId: BENEFIT, format: 'plakat' } })],
    ['standard mangler', valid({ variants: [{ key: 'a', weight: 1 }, { key: 'b', weight: 1 }] })],
    ['bare én variant', valid({ variants: [{ key: 'standard', weight: 1 }] })],
    ['mangler navn', valid({ name: '  ' })],
    ['sluttdato før startdato', valid({ startsAt: '2026-11-02T00:00:00Z', endsAt: '2026-11-01T00:00:00Z' })],
    ['ugyldig dato', valid({ startsAt: 'i morgen' })],
  ])('400: %s', async (_name, body) => {
    expect((await POST(req('POST', body))).status).toBe(400)
    expect(db.abTest.create).not.toHaveBeenCalled()
  })

  it('400 for ugyldig JSON', async () => {
    const r = new NextRequest('http://localhost/api/admin/ab-tests', {
      method: 'POST',
      body: '{ikke json',
      headers: { cookie: 'admin_token=valid' },
    })
    expect((await POST(r)).status).toBe(400)
  })

  it('500 uten å lekke detaljer ved databasefeil', async () => {
    db.abTest.create.mockRejectedValueOnce(new Error('hemmelig intern feil'))
    const res = await POST(req('POST', valid()))
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('hemmelig')
  })
})
