// CR-025: Admin, place a benefit on a page in the web flow, or remove the placement.
// The placement lives on the web_card/standard BenefitView row (CR-022). Removing it
// ("Ikke i løpet") sets pageId to null and keeps the row (overrides from CR-026 stay).

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/client'
import { authCheck } from '@/lib/admin/apiAuth'
import { webPlacementSchema } from '@/lib/admin/flowSchemas'

type Params = { params: Promise<{ id: string }> }

const WEB_CARD = 'web_card'
const STANDARD = 'standard'

export async function PUT(request: NextRequest, { params }: Params) {
  if (!(await authCheck(request))) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = webPlacementSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0]?.message ?? 'Ugyldig input' }, { status: 400 })
  }
  const { pageId, sortOrder } = parsed.data

  try {
    const { id } = await params
    const benefit = await prisma.benefit.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
    if (!benefit) return NextResponse.json({ message: 'Fordel ikke funnet' }, { status: 404 })

    if (pageId) {
      const page = await prisma.flowPage.findFirst({ where: { id: pageId, deletedAt: null }, select: { id: true } })
      if (!page) return NextResponse.json({ message: 'Siden finnes ikke' }, { status: 404 })
    }

    const key = { benefitId_format_variant: { benefitId: id, format: WEB_CARD, variant: STANDARD } }
    const existing = await prisma.benefitView.findUnique({ where: key, select: { id: true } })

    // Nothing to remove and nothing to create: do not create an empty row.
    if (!existing && !pageId) return NextResponse.json({ pageId: null, sortOrder })

    await prisma.benefitView.upsert({
      where: key,
      create: { benefitId: id, format: WEB_CARD, variant: STANDARD, pageId, sortOrder },
      update: { pageId, sortOrder },
    })
    return NextResponse.json({ pageId, sortOrder })
  } catch (err) {
    console.error('[admin/benefits/[id]/web-placement PUT] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
