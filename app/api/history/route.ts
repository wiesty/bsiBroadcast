import { db, notificationLog, notificationConfig, advisories } from '@/lib/db'
import { desc, eq, sql } from 'drizzle-orm'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0'))
  const size = Math.min(100, Math.max(1, parseInt(searchParams.get('size') ?? '50')))

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: notificationLog.id,
        sentAt: notificationLog.sentAt,
        status: notificationLog.status,
        error: notificationLog.error,
        advisoryUuid: notificationLog.advisoryUuid,
        advisoryName: advisories.name,
        advisoryTitle: advisories.title,
        advisoryClassification: advisories.classification,
        configId: notificationLog.configId,
        configName: notificationConfig.name,
      })
      .from(notificationLog)
      .leftJoin(advisories, eq(notificationLog.advisoryUuid, advisories.uuid))
      .leftJoin(notificationConfig, eq(notificationLog.configId, notificationConfig.id))
      .orderBy(desc(notificationLog.sentAt))
      .limit(size)
      .offset(page * size),
    db.select({ total: sql<number>`count(*)` }).from(notificationLog),
  ])

  return Response.json({ data: rows, total, page, size })
}
