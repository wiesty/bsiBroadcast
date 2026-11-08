import { db, notificationConfig } from '@/lib/db'
import { type NextRequest } from 'next/server'
import { parseNotificationSettings } from '@/lib/notifications/config'

export async function GET() {
  try {
    const configs = await db.select().from(notificationConfig).orderBy(notificationConfig.createdAt)
    return Response.json(configs)
  } catch {
    return Response.json([])
  }
}

export async function POST(request: NextRequest) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Ungültiger JSON-Body.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Ungültiger JSON-Body.' }, { status: 400 })
  }
  const { name, minSeverity = 'niedrig' } = body

  if (typeof name !== 'string' || !name.trim() || !['niedrig', 'mittel', 'hoch', 'kritisch'].includes(minSeverity)) {
    return Response.json({ error: 'Name und gültiger Mindestschweregrad sind erforderlich.' }, { status: 400 })
  }
  let settings
  try {
    settings = parseNotificationSettings(body)
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 })
  }

  try {
    const [created] = await db
      .insert(notificationConfig)
      .values({
        type: settings.type,
        name: name.trim(),
        webhookUrl: settings.config.webhookUrl ?? null,
        config: settings.config,
        minSeverity,
        enabled: true,
        createdAt: new Date(),
      })
      .returning()

    return Response.json(created, { status: 201 })
  } catch (error) {
    console.error('[BSI] Failed to create notification channel:', error)
    return Response.json({ error: 'Benachrichtigungskanal konnte nicht gespeichert werden.' }, { status: 500 })
  }
}
