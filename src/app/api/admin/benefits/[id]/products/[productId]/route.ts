// CR-025: Admin, update and soft-delete one product on a benefit.
// Delete is soft (deletedAt) because order lines reference products (CR-024).

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/client'
import { authCheck } from '@/lib/admin/apiAuth'
import { productPatchSchema } from '@/lib/admin/flowSchemas'

type Params = { params: Promise<{ id: string; productId: string }> }

// The product must belong to the benefit in the URL, so one benefit's id can never be used
// to change another benefit's product.
async function findProduct(benefitId: string, productId: string) {
  return prisma.product.findFirst({
    where: { id: productId, benefitId, deletedAt: null },
    select: { id: true },
  })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!(await authCheck(request))) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = productPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0]?.message ?? 'Ugyldig input' }, { status: 400 })
  }

  try {
    const { id, productId } = await params
    if (!(await findProduct(id, productId))) return NextResponse.json({ message: 'Ikke funnet' }, { status: 404 })

    await prisma.product.update({ where: { id: productId }, data: parsed.data })
    return NextResponse.json({ id: productId })
  } catch (err) {
    console.error('[admin/benefits/[id]/products/[productId] PATCH] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!(await authCheck(request))) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  try {
    const { id, productId } = await params
    if (!(await findProduct(id, productId))) return NextResponse.json({ message: 'Ikke funnet' }, { status: 404 })

    await prisma.product.update({ where: { id: productId }, data: { deletedAt: new Date() } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[admin/benefits/[id]/products/[productId] DELETE] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
