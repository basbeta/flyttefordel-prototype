// CR-024: submitOrder is idempotent, validates server side, and writes in one transaction.
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'

const tx = {
  order: { create: vi.fn() },
  orderLine: { createMany: vi.fn() },
  benefit: { findMany: vi.fn() },
  lead: { create: vi.fn() },
}

vi.mock('@/lib/db/client', () => ({
  prisma: {
    order: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))
vi.mock('@/lib/queries/flowQueries', () => ({ getWebFlow: vi.fn() }))

import { prisma } from '@/lib/db/client'
import { getWebFlow } from '@/lib/queries/flowQueries'
import { InvalidOrderLinesError, submitOrder } from './submitOrder'
import { CONSENT_TEXTS } from './consentTexts'
import type { OrderInput } from './orderSchema'
import type { WebFlowPage } from '@/types/app'

const mockPrisma = prisma as unknown as {
  order: { findUnique: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}
const mockGetWebFlow = getWebFlow as unknown as ReturnType<typeof vi.fn>

const SUB = '3b241101-e2bb-4255-8caf-4136c566a962'

const flow: WebFlowPage[] = [
  {
    id: 's1',
    name: 'Side',
    text: null,
    imageUrl: null,
    imageAlt: null,
    cards: [
      {
        benefitId: 'b1',
        slug: 'f1',
        title: 'Fordel 1',
        text: 't',
        imageUrl: null,
        imageAlt: null,
        badgeText: null,
        termsText: null,
        advertiser: { name: 'K', logoUrl: null },
        products: [{ id: 'p1', name: 'Digital', text: null, priceText: null }],
      },
      {
        benefitId: 'b2',
        slug: 'f2',
        title: 'Fordel 2',
        text: 't',
        imageUrl: null,
        imageAlt: null,
        badgeText: null,
        termsText: null,
        advertiser: { name: 'K2', logoUrl: null },
        products: [{ id: 'p2', name: 'Strøm', text: null, priceText: null }],
      },
    ],
  },
]

function input(overrides: Partial<OrderInput> = {}): OrderInput {
  return {
    submissionId: SUB,
    name: 'Test Testesen',
    email: 'test@example.test',
    phone: '12345678',
    postcode: '0150',
    consentShare: true,
    consentEmail: true,
    consentMail: false,
    consentSms: false,
    lines: [
      { benefitId: 'b1', productId: 'p1' },
      { benefitId: 'b2', productId: 'p2' },
    ],
    ...overrides,
  }
}

const CTX = { sessionId: 'sess-1', targeting: { postcode: '0150', movingStatus: 'unknown' } }

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.order.findUnique.mockResolvedValue(null)
  mockGetWebFlow.mockResolvedValue(flow)
  mockPrisma.$transaction.mockImplementation(async (cb: (t: typeof tx) => unknown) => cb(tx))
  tx.order.create.mockResolvedValue({ id: 'order-1' })
  tx.orderLine.createMany.mockResolvedValue({ count: 2 })
  tx.benefit.findMany.mockResolvedValue([
    { id: 'b1', advertiserId: 'a1' },
    { id: 'b2', advertiserId: 'a2' },
  ])
  tx.lead.create.mockResolvedValue({})
})

describe('submitOrder', () => {
  it('oppretter ordre, linjer og én lead per fordel i én transaksjon', async () => {
    const r = await submitOrder(input(), CTX)
    expect(r.created).toBe(true)
    expect(r.orderId).toBe('order-1')
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)

    expect(tx.order.create.mock.calls[0][0].data).toMatchObject({
      submissionId: SUB,
      sessionId: 'sess-1',
      name: 'Test Testesen',
      email: 'test@example.test',
      consentShare: true,
      consentEmail: true,
      consentMail: false,
      consentSms: false,
      consentTexts: CONSENT_TEXTS,
    })
    expect(tx.orderLine.createMany.mock.calls[0][0].data).toEqual([
      { orderId: 'order-1', productId: 'p1', benefitId: 'b1', pageId: 's1', productName: 'Digital', benefitTitle: 'Fordel 1' },
      { orderId: 'order-1', productId: 'p2', benefitId: 'b2', pageId: 's1', productName: 'Strøm', benefitTitle: 'Fordel 2' },
    ])
    expect(tx.lead.create).toHaveBeenCalledTimes(2)
    const lead = tx.lead.create.mock.calls[0][0].data
    expect(lead).toMatchObject({
      benefitId: 'b1',
      advertiserId: 'a1',
      sessionId: 'sess-1',
      consentText: CONSENT_TEXTS.share,
      status: 'new',
    })
    expect(lead.formData).toMatchObject({ source: 'web_flow', orderId: 'order-1', productId: 'p1' })
    expect(lead.consentAcceptedAt).toBeInstanceOf(Date)
  })

  it('bruker samtykketeksten fra serveren, ikke fra klienten', async () => {
    await submitOrder(input(), CTX)
    expect(tx.lead.create.mock.calls[0][0].data.consentText).toBe(CONSENT_TEXTS.share)
  })

  it('samme submissionId gir samme ordre uten ny skriving og uten å laste løpet', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({ id: 'order-existing' })
    const r = await submitOrder(input(), CTX)
    expect(r).toEqual({ orderId: 'order-existing', created: false, lines: [] })
    expect(mockGetWebFlow).not.toHaveBeenCalled()
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('kaster InvalidOrderLinesError og skriver ingenting når en linje er ugyldig', async () => {
    const bad = input({ lines: [{ benefitId: 'b1', productId: 'p-feil' }] })
    await expect(submitOrder(bad, CTX)).rejects.toBeInstanceOf(InvalidOrderLinesError)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('feil inne i transaksjonen kastes videre (ingenting lagres av oss)', async () => {
    tx.lead.create.mockRejectedValueOnce(new Error('db feil'))
    await expect(submitOrder(input(), CTX)).rejects.toThrow('db feil')
  })

  it('manglende fordel under lead-opprettelse kaster', async () => {
    tx.benefit.findMany.mockResolvedValueOnce([{ id: 'b1', advertiserId: 'a1' }])
    await expect(submitOrder(input(), CTX)).rejects.toThrow()
  })

  it('samtidig innsending med samme id (P2002) gir den eksisterende ordren', async () => {
    mockPrisma.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('unik', { code: 'P2002', clientVersion: '5' })
    )
    mockPrisma.order.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'order-race' })
    const r = await submitOrder(input(), CTX)
    expect(r).toEqual({ orderId: 'order-race', created: false, lines: [] })
  })

  it('andre Prisma-feil enn P2002 kastes videre', async () => {
    mockPrisma.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('annen', { code: 'P2003', clientVersion: '5' })
    )
    await expect(submitOrder(input(), CTX)).rejects.toThrow()
  })

  it('CR-028: lagrer innlogget person på ordren, og null uten person', async () => {
    await submitOrder(input(), { ...CTX, personId: 'person-1' })
    expect(tx.order.create.mock.calls[0][0].data.personId).toBe('person-1')
    tx.order.create.mockClear()
    await submitOrder(input({ submissionId: '22222222-2222-4222-8222-222222222222' }), CTX)
    expect(tx.order.create.mock.calls[0][0].data.personId).toBeNull()
  })

  it('uten sesjon lagres sessionId som null', async () => {
    await submitOrder(input(), { sessionId: null, targeting: null })
    expect(tx.order.create.mock.calls[0][0].data.sessionId).toBeNull()
    expect(mockGetWebFlow).toHaveBeenCalledWith(null)
  })

  it('løpet lastes med sesjonens targeting', async () => {
    await submitOrder(input(), CTX)
    expect(mockGetWebFlow).toHaveBeenCalledWith(CTX.targeting)
  })
})
