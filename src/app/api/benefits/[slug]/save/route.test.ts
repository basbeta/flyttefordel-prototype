// CR-020: benefit_saved / benefit_unsaved are logged with the session id.
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  prisma: {
    userSession: { findUnique: vi.fn() },
    benefit: { findFirst: vi.fn() },
    savedBenefit: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))
vi.mock('@/lib/tracking/trackEvent', () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/session', () => ({
  ANON_ID_HEADER: 'x-anon-id',
}))

import { prisma } from '@/lib/db/client'
import { trackEvent } from '@/lib/tracking/trackEvent'
import { POST, DELETE } from './route'
import { NextRequest } from 'next/server'

const mockPrisma = prisma as unknown as {
  userSession: { findUnique: ReturnType<typeof vi.fn> }
  benefit: { findFirst: ReturnType<typeof vi.fn> }
  savedBenefit: {
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
  }
}

const PARAMS = { params: Promise.resolve({ slug: 'test-slug' }) }

function makeRequest(method: 'POST' | 'DELETE') {
  return new NextRequest('http://localhost/api/benefits/test-slug/save', {
    method,
    headers: { 'x-anon-id': 'anon-1' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.userSession.findUnique.mockResolvedValue({ id: 'session-1' })
  mockPrisma.benefit.findFirst.mockResolvedValue({ id: 'benefit-1' })
})

describe('/api/benefits/[slug]/save', () => {
  it('POST logger benefit_saved med sessionId', async () => {
    mockPrisma.savedBenefit.findFirst.mockResolvedValue(null)
    mockPrisma.savedBenefit.create.mockResolvedValue({})
    const res = await POST(makeRequest('POST'), PARAMS)
    expect(res.status).toBe(201)
    expect(trackEvent).toHaveBeenCalledWith('benefit_saved', 'benefit-1', undefined, {
      sessionId: 'session-1',
    })
  })

  it('POST logger ingen hendelse når fordelen allerede er lagret', async () => {
    mockPrisma.savedBenefit.findFirst.mockResolvedValueOnce({ id: 'saved-1' })
    const res = await POST(makeRequest('POST'), PARAMS)
    expect(res.status).toBe(200)
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('DELETE logger benefit_unsaved med sessionId', async () => {
    mockPrisma.savedBenefit.updateMany.mockResolvedValue({ count: 1 })
    const res = await DELETE(makeRequest('DELETE'), PARAMS)
    expect(res.status).toBe(204)
    expect(trackEvent).toHaveBeenCalledWith('benefit_unsaved', 'benefit-1', undefined, {
      sessionId: 'session-1',
    })
  })
})
