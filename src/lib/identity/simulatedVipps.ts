// CR-028: Simulated Vipps. The prototype's IdentityProvider: the person is chosen from the
// users table (the seeded test persons plus the ones QA creates) and gets a stable person id.
// No real identity check. Real Vipps becomes another implementation of IdentityProvider.
//
// Only rows with is_test = true can be listed or logged into, so a real user row (if one ever
// exists) can never be picked on the simulated login page.

import { prisma } from '@/lib/db/client'
import { PERSONAS } from './personas'
import type { IdentityProvider, NewPersonInput, Person, PersonSummary } from './types'

type UserRow = {
  id: string
  name: string | null
  email: string | null
  postcode: string | null
  movingStatus: PersonSummary['movingStatus']
  movedAt: Date | null
  fromAddress: string | null
  toAddress: string | null
  housingType: string | null
  isTest: boolean
  seedKey: string | null
}

function toSummary(u: UserRow): PersonSummary {
  return {
    id: u.id,
    name: u.name ?? '(uten navn)',
    postcode: u.postcode,
    movingStatus: u.movingStatus,
    movedAt: u.movedAt ? u.movedAt.toISOString().slice(0, 10) : null,
    fromAddress: u.fromAddress,
    toAddress: u.toAddress,
    housingType: u.housingType,
    isTest: u.isTest,
    seeded: u.seedKey !== null,
  }
}

function toPerson(u: UserRow): Person {
  return { ...toSummary(u), email: u.email }
}

// Seeded persons first, in the order of the persona list; then the rest, oldest first.
export function orderPersons<T extends { seedKey: string | null; createdAt: Date }>(rows: T[]): T[] {
  const seedOrder = new Map(PERSONAS.map((p, i) => [p.seedKey, i]))
  const rank = (r: T) => (r.seedKey !== null ? (seedOrder.get(r.seedKey) ?? PERSONAS.length) : Infinity)
  return [...rows].sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    if (ra !== rb) return ra < rb ? -1 : 1
    return a.createdAt.getTime() - b.createdAt.getTime()
  })
}

const SELECT = {
  id: true,
  name: true,
  email: true,
  postcode: true,
  movingStatus: true,
  movedAt: true,
  fromAddress: true,
  toAddress: true,
  housingType: true,
  isTest: true,
  seedKey: true,
} as const

export const simulatedVipps: IdentityProvider = {
  async listPersons() {
    const rows = await prisma.user.findMany({
      where: { isTest: true, deletedAt: null },
      select: { ...SELECT, createdAt: true },
    })
    return orderPersons(rows).map(toSummary)
  },

  async login({ personId, email }) {
    const existing = await prisma.user.findFirst({
      where: { id: personId, isTest: true, deletedAt: null },
      select: { id: true },
    })
    if (!existing) return null
    // The test e-mail belongs to the person; the last login wins (bruker, 2026-10-13).
    const updated = await prisma.user.update({ where: { id: existing.id }, data: { email }, select: SELECT })
    return toPerson(updated)
  },

  async createPerson(input: NewPersonInput) {
    const created = await prisma.user.create({
      data: {
        name: input.name,
        postcode: input.postcode,
        movingStatus: input.movingStatus,
        movedAt: input.movedAt ? new Date(`${input.movedAt}T00:00:00Z`) : null,
        fromAddress: input.fromAddress,
        toAddress: input.toAddress,
        housingType: input.housingType,
        isTest: true,
      },
      select: SELECT,
    })
    return toSummary(created)
  },

  async getPerson(personId) {
    const row = await prisma.user.findFirst({
      where: { id: personId, isTest: true, deletedAt: null },
      select: SELECT,
    })
    return row ? toPerson(row) : null
  },
}
