import { db, advisories, syncLog } from '@/lib/db'
import { desc, eq, sql } from 'drizzle-orm'

export async function GET() {
  const [
    [{ total }],
    bySeverity,
    lastSync,
    recentAdvisories,
  ] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(advisories),
    db
      .select({ classification: advisories.classification, count: sql<number>`count(*)` })
      .from(advisories)
      .groupBy(advisories.classification),
    db.select().from(syncLog).orderBy(desc(syncLog.startedAt)).limit(1),
    db.select().from(advisories).orderBy(desc(advisories.published)).limit(5),
  ])

  return Response.json({
    total,
    bySeverity: Object.fromEntries(bySeverity.map((r) => [r.classification ?? 'unknown', r.count])),
    lastSync: lastSync[0] ?? null,
    recentAdvisories,
  })
}
