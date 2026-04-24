import { db, products } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { type NextRequest } from 'next/server'

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/products/[id]'>) {
  const { id } = await ctx.params
  const body = await request.json()
  const productId = parseInt(id)

  await db
    .update(products)
    .set({ watched: body.watched })
    .where(eq(products.id, productId))

  return Response.json({ success: true })
}
