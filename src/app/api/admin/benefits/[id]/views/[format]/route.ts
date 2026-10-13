// CR-027: Admin, set the content overrides of a benefit on a surface (format, variant standard).
// PUT replaces all override fields: empty or missing fields become null (inherit from the
// benefit). The row is created if it does not exist.
// IMPORTANT: this route only touches the content fields. For web_card the same row also holds
// the placement (pageId, sortOrder), which only the web-placement route (CR-025) may change.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/client'
import { authCheck } from '@/lib/admin/apiAuth'
import { viewOverrideSchema } from '@/lib/admin/flowSchemas'
import { DEFAULT_VARIANT, VIEW_FORMATS, isViewFormat } from '@/lib/views'

type Params = { params: Promise<{ id: string; format: string }> }

export async function PUT(request: NextRequest, { params }: Params) {
  if (!(await authCheck(request))) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const { id, format } = await params
  if (!isViewFormat(format)) return NextResponse.json({ message: 'Ukjent format' }, { status: 404 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = viewOverrideSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0]?.message ?? 'Ugyldig input' }, { status: 400 })
  }

  // Fields the format does not allow to override are ignored (stored as null).
  const allowed: readonly string[] = VIEW_FORMATS[format].overridable
  const content = {
    title: allowed.includes('title') ? parsed.data.title : null,
    text: allowed.includes('text') ? parsed.data.text : null,
    imageUrl: allowed.includes('imageUrl') ? parsed.data.imageUrl : null,
    imageAlt: allowed.includes('imageAlt') ? parsed.data.imageAlt : null,
    badgeText: allowed.includes('badgeText') ? parsed.data.badgeText : null,
  }

  try {
    const benefit = await prisma.benefit.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
    if (!benefit) return NextResponse.json({ message: 'Fordel ikke funnet' }, { status: 404 })

    await prisma.benefitView.upsert({
      where: { benefitId_format_variant: { benefitId: id, format, variant: DEFAULT_VARIANT } },
      create: { benefitId: id, format, variant: DEFAULT_VARIANT, ...content },
      update: content,
    })
    return NextResponse.json({ format, ...content })
  } catch (err) {
    console.error('[admin/benefits/[id]/views/[format] PUT] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
