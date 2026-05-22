// CR-006: Unit tests for claimCode — atomisk unik kode-tildeling.
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { claimCode, NoCodesAvailableError } from './claimCode'

vi.mock('@/lib/db/client', () => ({
  prisma: {
    code: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '@/lib/db/client'

const mockPrisma = prisma as unknown as {
  code: { findFirst: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}

const POOL_ID = 'pool-1'
const SESSION_ID = 'session-1'

function makeTx(availableCode: { id: string; codeValue: string } | null) {
  const codeUpdate = vi.fn()
  const poolUpdate = vi.fn()
  const tx = {
    code: { findFirst: vi.fn().mockResolvedValue(availableCode), update: codeUpdate },
    codePool: { update: poolUpdate },
  }
  return { tx, codeUpdate, poolUpdate }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('claimCode', () => {
  it('returns existing code when session already claimed (idempotent)', async () => {
    mockPrisma.code.findFirst.mockResolvedValueOnce({ codeValue: 'EXISTING123' })

    const result = await claimCode(POOL_ID, SESSION_ID)

    expect(result).toEqual({ codeValue: 'EXISTING123', alreadyClaimed: true })
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('claims first available code from pool', async () => {
    mockPrisma.code.findFirst.mockResolvedValueOnce(null)
    const { tx } = makeTx({ id: 'code-1', codeValue: 'NEW456' })
        mockPrisma.$transaction.mockImplementationOnce((fn: (tx: any) => Promise<string>) => fn(tx))

    const result = await claimCode(POOL_ID, SESSION_ID)

    expect(result).toEqual({ codeValue: 'NEW456', alreadyClaimed: false })
  })

  it('throws NoCodesAvailableError when pool is empty', async () => {
    mockPrisma.code.findFirst.mockResolvedValueOnce(null)
    const { tx } = makeTx(null)
        mockPrisma.$transaction.mockImplementationOnce((fn: (tx: any) => Promise<string>) => fn(tx))

    await expect(claimCode(POOL_ID, SESSION_ID)).rejects.toThrow(NoCodesAvailableError)
  })

  it('decrements availableCodes on successful claim', async () => {
    mockPrisma.code.findFirst.mockResolvedValueOnce(null)
    const { tx, poolUpdate } = makeTx({ id: 'code-2', codeValue: 'CODE789' })
        mockPrisma.$transaction.mockImplementationOnce((fn: (tx: any) => Promise<string>) => fn(tx))

    await claimCode(POOL_ID, SESSION_ID)

    expect(poolUpdate).toHaveBeenCalledWith({
      where: { id: POOL_ID },
      data: { availableCodes: { decrement: 1 } },
    })
  })
})
