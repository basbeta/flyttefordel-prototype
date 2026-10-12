// CR-025: Admin, list and create pages in the web flow.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/client'
import { authCheck } from '@/lib/admin/apiAuth'
import { flowPageSchema } from '@/lib/admin/flowSchemas'
import { getAdminFlowPages } from '@/lib/queries/adminQueries'

export async function GET(request: NextRequest) {
  if (!(await authCheck(request))) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  try {
    return NextResponse.json(await getAdminFlowPages())
  } catch (err) {
    console.error('[admin/flow-pages GET] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await authCheck(request))) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = flowPageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0]?.message ?? 'Ugyldig input' }, { status: 400 })
  }

  try {
    const page = await prisma.flowPage.create({ data: parsed.data, select: { id: true } })
    return NextResponse.json({ id: page.id }, { status: 201 })
  } catch (err) {
    console.error('[admin/flow-pages POST] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
