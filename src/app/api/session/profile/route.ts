// CR-003: Update anonymous session profile (postcode + movingStatus).

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { ANON_ID_HEADER } from '@/lib/session'
import type { UserMovingStatus } from '@prisma/client'

const MOVING_STATUSES: UserMovingStatus[] = [
  'recently_moved',
  'moved_past',
  'not_moving',
  'unknown',
]

const profileSchema = z.object({
  postcode: z
    .string()
    .regex(/^\d{4}$/, 'Postnummer må være 4 siffer')
    .nullable()
    .optional(),
  movingStatus: z
    .enum(MOVING_STATUSES as [UserMovingStatus, ...UserMovingStatus[]])
    .optional(),
})

export async function PATCH(request: NextRequest) {
  const anonymousId = request.headers.get(ANON_ID_HEADER)
  if (!anonymousId) return NextResponse.json({ message: 'Ingen sesjon' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0]?.message ?? 'Ugyldig input' }, { status: 400 })
  }

  const session = await prisma.userSession.upsert({
    where: { anonymousId },
    update: {
      ...(parsed.data.postcode !== undefined ? { postcode: parsed.data.postcode } : {}),
      ...(parsed.data.movingStatus !== undefined ? { movingStatus: parsed.data.movingStatus } : {}),
      lastSeenAt: new Date(),
    },
    create: {
      anonymousId,
      ...(parsed.data.postcode !== undefined ? { postcode: parsed.data.postcode } : {}),
      ...(parsed.data.movingStatus !== undefined ? { movingStatus: parsed.data.movingStatus } : {}),
    },
    select: { id: true, postcode: true, movingStatus: true },
  })

  return NextResponse.json({
    postcode: session.postcode,
    movingStatus: session.movingStatus ?? 'unknown',
  })
}
