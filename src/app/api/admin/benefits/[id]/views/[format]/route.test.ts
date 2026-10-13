// CR-027: admin API for content overrides of a benefit on a surface.
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/client', () => ({
  prisma: {
    benefit: { findFirst: vi.fn() },
    benefitView: { upsert: vi.fn() },
  },
}))
vi.mock('@/lib/admin/auth', () => ({
  ADMIN_TOKEN_COOKIE: 'admin_token',
  verifyAdminJWT: vi.fn(),
}))

import { prisma } from '@/lib/db/client'
import { verifyAdminJWT } from '@/lib/admin/auth'
import { PUT } from './route'

const mockPrisma = prisma as unknown as {
  benefit: Record<string, ReturnType<typeof vi.fn>>
  benefitView: Record<string, ReturnType<typeof vi.fn>>
}
const mockVerify = verifyAdminJWT as unknown as ReturnType<typeof vi.fn>

function params(format: string) {
  return { params: Promise.resolve({ id: 'b1', format }) }
}

function req(body?: unknown, cookie = true) {
  return new NextRequest('http://localhost/api/admin/benefits/b1/views/web_card', {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie: 'admin_token=valid' } : {}) },
  })
}

const KEY = (format: string) => ({
  benefitId_format_variant: { benefitId: 'b1', format, variant: 'standard' },
})

let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue({ email: 'admin@example.test' })
  mockPrisma.benefit.findFirst.mockResolvedValue({ id: 'b1' })
  mockPrisma.benefitView.upsert.mockResolvedValue({})
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => errorSpy.mockRestore())

describe('PUT /api/admin/benefits/[id]/views/[format]', () => {
  it('401 uten admin-cookie og rører ikke databasen', async () => {
    expect((await PUT(req({ title: 'x' }, false), params('app_card'))).status).toBe(401)
    expect(mockPrisma.benefitView.upsert).not.toHaveBeenCalled()
  })

  it('404 for ukjent format, også for formater som finnes i docs men ikke i registeret', async () => {
    for (const format of ['app_hero', 'email', 'toString', '']) {
      expect((await PUT(req({ title: 'x' }), params(format))).status).toBe(404)
    }
    expect(mockPrisma.benefitView.upsert).not.toHaveBeenCalled()
  })

  it('404 for ukjent fordel', async () => {
    mockPrisma.benefit.findFirst.mockResolvedValueOnce(null)
    expect((await PUT(req({ title: 'x' }), params('app_card'))).status).toBe(404)
    expect(mockPrisma.benefit.findFirst.mock.calls[0][0].where).toEqual({ id: 'b1', deletedAt: null })
    expect(mockPrisma.benefitView.upsert).not.toHaveBeenCalled()
  })

  it('setter overstyringer, oppretter raden om den mangler og trimmer', async () => {
    const res = await PUT(
      req({ title: '  Ny tittel ', text: 'Tekst', imageUrl: 'https://example.test/a.jpg', imageAlt: 'Alt', badgeText: 'Ny' }),
      params('app_card')
    )
    expect(res.status).toBe(200)
    const content = {
      title: 'Ny tittel',
      text: 'Tekst',
      imageUrl: 'https://example.test/a.jpg',
      imageAlt: 'Alt',
      badgeText: 'Ny',
    }
    expect(mockPrisma.benefitView.upsert).toHaveBeenCalledWith({
      where: KEY('app_card'),
      create: { benefitId: 'b1', format: 'app_card', variant: 'standard', ...content },
      update: content,
    })
    expect(await res.json()).toEqual({ format: 'app_card', variant: 'standard', ...content })
  })

  it('tomme strenger, bare mellomrom og manglende felt blir null (arv)', async () => {
    await PUT(req({ title: '', text: '   ', badgeText: null }), params('web_card'))
    expect(mockPrisma.benefitView.upsert.mock.calls[0][0].update).toEqual({
      title: null,
      text: null,
      imageUrl: null,
      imageAlt: null,
      badgeText: null,
    })
  })

  it('«Tilbakestill» (alle felt null) er et vanlig PUT', async () => {
    const res = await PUT(
      req({ title: null, text: null, imageUrl: null, imageAlt: null, badgeText: null }),
      params('app_card')
    )
    expect(res.status).toBe(200)
    expect(Object.values(mockPrisma.benefitView.upsert.mock.calls[0][0].update).every((v) => v === null)).toBe(true)
  })

  it('RØRER ALDRI plassering: update og create har ikke pageId eller sortOrder (web_card)', async () => {
    await PUT(req({ title: 'Web-tittel' }), params('web_card'))
    const call = mockPrisma.benefitView.upsert.mock.calls[0][0]
    expect(Object.keys(call.update).sort()).toEqual(['badgeText', 'imageAlt', 'imageUrl', 'text', 'title'])
    expect(call.create).not.toHaveProperty('pageId')
    expect(call.create).not.toHaveProperty('sortOrder')
    expect(call.where).toEqual(KEY('web_card'))
  })

  it('CR-030: en variant i body skriver den raden og bare den (standard urørt)', async () => {
    const res = await PUT(req({ title: 'Tittel B', variant: 'b' }), params('web_card'))
    expect(res.status).toBe(200)
    const call = mockPrisma.benefitView.upsert.mock.calls[0][0]
    expect(call.where).toEqual({ benefitId_format_variant: { benefitId: 'b1', format: 'web_card', variant: 'b' } })
    expect(call.create.variant).toBe('b')
    expect(call).not.toHaveProperty('create.pageId')
    expect((await res.json()).variant).toBe('b')
  })

  it('CR-030: ugyldig variantnøkkel gir 400 og rører ikke databasen', async () => {
    for (const variant of ['Stor', '', 'a b', 5, 'x'.repeat(41)]) {
      expect((await PUT(req({ title: 'x', variant }), params('app_card'))).status).toBe(400)
    }
    expect(mockPrisma.benefitView.upsert).not.toHaveBeenCalled()
  })

  it('bruker variant standard når ingen variant er oppgitt', async () => {
    await PUT(req({ title: 'x' }), params('app_card'))
    expect(mockPrisma.benefitView.upsert.mock.calls[0][0].create.variant).toBe('standard')
  })

  it('400 for for lange felt (grenseverdier)', async () => {
    expect((await PUT(req({ title: 'a'.repeat(120) }), params('app_card'))).status).toBe(200)
    expect((await PUT(req({ title: 'a'.repeat(121) }), params('app_card'))).status).toBe(400)
    expect((await PUT(req({ text: 'a'.repeat(501) }), params('app_card'))).status).toBe(400)
    expect((await PUT(req({ badgeText: 'a'.repeat(41) }), params('app_card'))).status).toBe(400)
    expect((await PUT(req({ imageAlt: 'a'.repeat(201) }), params('app_card'))).status).toBe(400)
  })

  it('400 for ugyldig bilde-URL og ikke-tekst, men godtar https og relativ', async () => {
    expect((await PUT(req({ imageUrl: 'javascript:alert(1)' }), params('app_card'))).status).toBe(400)
    expect((await PUT(req({ imageUrl: 'ftp://x.test/a.jpg' }), params('app_card'))).status).toBe(400)
    expect((await PUT(req({ title: 5 }), params('app_card'))).status).toBe(400)
    expect((await PUT(req({ imageUrl: 'https://example.test/a.jpg' }), params('app_card'))).status).toBe(200)
    expect((await PUT(req({ imageUrl: '/bilder/a.jpg' }), params('app_card'))).status).toBe(200)
  })

  it('400 for ukjente felt (strict) og ugyldig JSON, uten å røre databasen', async () => {
    mockPrisma.benefitView.upsert.mockClear()
    expect((await PUT(req({ pageId: 'x' }), params('web_card'))).status).toBe(400)
    expect((await PUT(req({ sortOrder: 5 }), params('web_card'))).status).toBe(400)
    const bad = new NextRequest('http://localhost/x', {
      method: 'PUT',
      body: '{ikke json',
      headers: { cookie: 'admin_token=valid' },
    })
    expect((await PUT(bad, params('app_card'))).status).toBe(400)
    expect(mockPrisma.benefitView.upsert).not.toHaveBeenCalled()
  })

  it('500 ved databasefeil', async () => {
    mockPrisma.benefitView.upsert.mockRejectedValueOnce(new Error('db'))
    expect((await PUT(req({ title: 'x' }), params('app_card'))).status).toBe(500)
  })
})
