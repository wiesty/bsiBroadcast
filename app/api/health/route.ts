import { db, advisories, syncLog } from '@/lib/db'
import { count, desc } from 'drizzle-orm'

export async function GET() {
  try {
    const [{ total }] = await db.select({ total: count() }).from(advisories)
    const lastSync = await db.select().from(syncLog).orderBy(desc(syncLog.startedAt)).limit(1)

    return Response.json({
      status: 'ok',
      advisories: total,
      lastSync: lastSync[0] ?? null,
    })
  } catch {
    return Response.json({ status: 'error' }, { status: 500 })
  }
}
