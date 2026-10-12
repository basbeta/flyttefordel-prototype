// CR-020: trackEvent is backwards compatible and stores the new dimensions.
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  prisma: { benefitEvent: { create: vi.fn() } },
}))

import { prisma } from '@/lib/db/client'
import { trackEvent } from './trackEvent'

const mockCreate = (prisma as unknown as { benefitEvent: { create: ReturnType<typeof vi.fn> } })
  .benefitEvent.create

beforeEach(() => vi.clearAllMocks())

describe('trackEvent', () => {
  it('fungerer med de gamle tre argumentene og setter channel til app', async () => {
    await trackEvent('benefit_viewed', 'b1', { a: 1 })
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        eventType: 'benefit_viewed',
        benefitId: 'b1',
        metadata: { a: 1 },
        channel: 'app',
        viewId: undefined,
        testId: undefined,
        variant: undefined,
        sessionId: undefined,
        userId: undefined,
      },
    })
  })

  it('lagrer channel, viewId, testId, variant og sessionId når de oppgis', async () => {
    await trackEvent('benefit_opened', null, undefined, {
      channel: 'email',
      viewId: 'v1',
      testId: 't1',
      variant: 'B',
      sessionId: 's1',
    })
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'benefit_opened',
        benefitId: undefined,
        channel: 'email',
        viewId: 'v1',
        testId: 't1',
        variant: 'B',
        sessionId: 's1',
      }),
    })
  })

  it('svelger feil fra Prisma', async () => {
    mockCreate.mockRejectedValueOnce(new Error('db nede'))
    await expect(trackEvent('benefit_viewed', 'b1')).resolves.toBeUndefined()
  })
})
