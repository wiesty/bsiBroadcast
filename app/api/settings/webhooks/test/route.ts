import { parseNotificationSettings } from '@/lib/notifications/config'
import { createProvider } from '@/lib/notifications/providers'
import type { NotificationPayload } from '@/lib/notifications/types'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  let settings
  try {
    settings = parseNotificationSettings(await request.json())
  } catch (error) {
    return Response.json({ error: error instanceof SyntaxError ? 'Ungültiger JSON-Body.' : (error as Error).message }, { status: 400 })
  }

  const payload: NotificationPayload = {
    uuid: crypto.randomUUID(),
    name: 'BSIBROADCAST-TEST',
    title: 'BSI Broadcast: Testbenachrichtigung – Kanal erfolgreich verbunden',
    classification: 'niedrig',
    basescore: null,
    cves: [],
    productNames: ['BSI Broadcast'],
    status: 'TEST',
    noPatch: false,
    published: new Date(),
    url: 'https://wid.cert-bund.de/portal/wid',
  }

  try {
    await createProvider(settings).send(payload)
    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Testbenachrichtigung konnte nicht zugestellt werden. Bitte URL, Zugangsdaten und Erreichbarkeit des Kanals prüfen.' }, { status: 502 })
  }
}
