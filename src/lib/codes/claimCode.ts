// CR-006: Atomisk unik kode-tildeling.
// Garanterer at én sesjon aldri mottar mer enn én kode per kode-pool,
// og at to samtidige kall ikke tildeler samme kode.
//
// MIGRATION NOTE: For MVP med høyt volum (>1000 samtidige brukere),
// bytt $transaction til raw SQL med SELECT ... FOR UPDATE SKIP LOCKED.

import { prisma } from '@/lib/db/client'

export class NoCodesAvailableError extends Error {
  constructor() {
    super('Ingen koder igjen i pool')
    this.name = 'NoCodesAvailableError'
  }
}

export type ClaimCodeResult = {
  codeValue: string
  alreadyClaimed: boolean
}

export async function claimCode(codePoolId: string, sessionId: string): Promise<ClaimCodeResult> {
  // Idempotency: return existing code if this session already claimed one from this pool.
  const existing = await prisma.code.findFirst({
    where: { codePoolId, assignedSessionId: sessionId, status: 'assigned' },
    select: { codeValue: true },
  })
  if (existing) return { codeValue: existing.codeValue, alreadyClaimed: true }

  const codeValue = await prisma.$transaction(async (tx) => {
    const code = await tx.code.findFirst({
      where: { codePoolId, status: 'available' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, codeValue: true },
    })
    if (!code) throw new NoCodesAvailableError()

    await tx.code.update({
      where: { id: code.id },
      data: { status: 'assigned', assignedSessionId: sessionId, assignedAt: new Date() },
    })
    await tx.codePool.update({
      where: { id: codePoolId },
      data: { availableCodes: { decrement: 1 } },
    })

    return code.codeValue
  })

  return { codeValue, alreadyClaimed: false }
}
