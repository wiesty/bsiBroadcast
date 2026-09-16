import { db, products } from '@/lib/db'
import { and, desc, like, eq, sql, type SQL } from 'drizzle-orm'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const search = searchParams.get('search') ?? ''
  const watchedOnly = searchParams.get('watched') === 'true'
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0'))
  const size = Math.min(200, Math.max(1, parseInt(searchParams.get('size') ?? '100')))

  const conditions: SQL[] = []
  if (search) conditions.push(like(products.name, `%${search}%`))
  if (watchedOnly) conditions.push(eq(products.watched, true))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(products).where(where).orderBy(desc(products.watched), products.name).limit(size).offset(page * size),
    db.select({ total: sql<number>`count(*)` }).from(products).where(where),
  ])

  return Response.json({ data: rows, total, page, size })
}
