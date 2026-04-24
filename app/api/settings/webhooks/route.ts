import { db, notificationConfig } from '@/lib/db'
import { type NextRequest } from 'next/server'

export async function GET() {
  try {
    const configs = await db.select().from(notificationConfig).orderBy(notificationConfig.createdAt)
    return Response.json(configs)
  } catch {
    return Response.json([])
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, type, config = {}, minSeverity = 'niedrig' } = body

  if (!name || !type) {
    return Response.json({ error: 'name and type required' }, { status: 400 })
  }

  const [created] = await db
    .insert(notificationConfig)
    .values({
      type,
      name,
      webhookUrl: config.webhookUrl ?? null,
      config,
      minSeverity,
      enabled: true,
      createdAt: new Date(),
    })
    .returning()

  return Response.json(created, { status: 201 })
}
