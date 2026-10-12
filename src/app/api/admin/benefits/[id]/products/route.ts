// CR-025: Admin, list and create products on a benefit.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/client'
import { authCheck } from '@/lib/admin/apiAuth'
import { productSchema } from '@/lib/admin/flowSchemas'
import { getAdminBenefitProducts } from '@/lib/queries/adminQueries'

type Params = { params: Promise<{ id: string }> }

async function benefitExists(id: string): Promise<boolean> {
  const benefit = await prisma.benefit.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
  return benefit !== null
}

export async function GET(request: NextRequest, { params }: Params) {
  if (!(await authCheck(request))) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  try {
    const { id } = await params
    if (!(await benefitExists(id))) return NextResponse.json({ message: 'Fordel ikke funnet' }, { status: 404 })
    return NextResponse.json(await getAdminBenefitProducts(id))
  } catch (err) {
    console.error('[admin/benefits/[id]/products GET] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!(await authCheck(request))) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = productSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0]?.message ?? 'Ugyldig input' }, { status: 400 })
  }

  try {
    const { id } = await params
    if (!(await benefitExists(id))) return NextResponse.json({ message: 'Fordel ikke funnet' }, { status: 404 })

    const product = await prisma.product.create({
      data: { ...parsed.data, benefitId: id },
      select: { id: true },
    })
    return NextResponse.json({ id: product.id }, { status: 201 })
  } catch (err) {
    console.error('[admin/benefits/[id]/products POST] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
