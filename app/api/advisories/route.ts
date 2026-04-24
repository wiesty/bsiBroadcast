import { db, advisories } from '@/lib/db'
import { desc, like, eq, and, sql, type SQL } from 'drizzle-orm'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0'))
  const size = Math.min(100, Math.max(1, parseInt(searchParams.get('size') ?? '50')))
  const search = searchParams.get('search') ?? ''
  const classification = searchParams.get('classification') ?? ''
  const status = searchParams.get('status') ?? ''

  const conditions: SQL[] = []

  if (search) {
    conditions.push(
      sql`(${advisories.title} LIKE ${'%' + search + '%'} OR ${advisories.name} LIKE ${'%' + search + '%'} OR ${advisories.cves} LIKE ${'%' + search + '%'} OR ${advisories.productNames} LIKE ${'%' + search + '%'})`
    )
  }
  if (classification) {
    conditions.push(eq(advisories.classification, classification as 'niedrig' | 'mittel' | 'hoch' | 'kritisch'))
  }
  if (status) {
    conditions.push(eq(advisories.status, status))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(advisories)
      .where(whereClause)
      .orderBy(desc(advisories.published))
      .limit(size)
      .offset(page * size),
    db
      .select({ total: sql<number>`count(*)` })
      .from(advisories)
      .where(whereClause),
  ])

  return Response.json({
    data: rows,
    total,
    page,
    size,
    totalPages: Math.ceil(total / size),
  })
}
