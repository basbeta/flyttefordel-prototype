// CR-025: Admin, get, update and soft-delete one page in the web flow.
// Delete is soft (deletedAt): placements on the page stay, but the page and its cards
// drop out of the flow (getWebFlow only reads pages that are not deleted).

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/client'
import { authCheck } from '@/lib/admin/apiAuth'
import { flowPagePatchSchema } from '@/lib/admin/flowSchemas'
import { getAdminFlowPageById } from '@/lib/queries/adminQueries'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  if (!(await authCheck(request))) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  try {
    const { id } = await params
    const page = await getAdminFlowPageById(id)
    if (!page) return NextResponse.json({ message: 'Ikke funnet' }, { status: 404 })
    return NextResponse.json(page)
  } catch (err) {
    console.error('[admin/flow-pages/[id] GET] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!(await authCheck(request))) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = flowPagePatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0]?.message ?? 'Ugyldig input' }, { status: 400 })
  }

  try {
    const { id } = await params
    const existing = await prisma.flowPage.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
    if (!existing) return NextResponse.json({ message: 'Ikke funnet' }, { status: 404 })

    await prisma.flowPage.update({ where: { id }, data: parsed.data })
    return NextResponse.json({ id })
  } catch (err) {
    console.error('[admin/flow-pages/[id] PATCH] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!(await authCheck(request))) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  try {
    const { id } = await params
    const existing = await prisma.flowPage.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
    if (!existing) return NextResponse.json({ message: 'Ikke funnet' }, { status: 404 })

    await prisma.flowPage.update({ where: { id }, data: { deletedAt: new Date() } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[admin/flow-pages/[id] DELETE] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
