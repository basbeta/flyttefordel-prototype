// CR-028: Seed the 5 test persons (simulated Vipps). Idempotent: upsert on seed_key, and the
// moved dates are recomputed on every run, so "recently moved" stays recent. Run again when
// the dates have become old. The e-mail is never touched (it belongs to whoever logged in last).
//
// Usage: npm run db:seed-persons   (needs DATABASE_URL)

import { PrismaClient } from '@prisma/client'
import { PERSONAS, personaFields } from '../src/lib/identity/personas'

async function main() {
  const prisma = new PrismaClient()
  const now = new Date()
  try {
    for (const persona of PERSONAS) {
      const fields = personaFields(persona, now)
      const user = await prisma.user.upsert({
        where: { seedKey: persona.seedKey },
        create: { seedKey: persona.seedKey, ...fields },
        update: fields,
        select: { id: true, name: true },
      })
      console.log(`OK ${persona.seedKey} -> ${user.id} (${user.name})`)
    }
    console.log(`Ferdig: ${PERSONAS.length} testpersoner.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Seed feilet:', err instanceof Error ? err.message : err)
  process.exit(1)
})
