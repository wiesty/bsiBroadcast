import type { NotificationPayload, NotificationProvider } from './types'

const SEVERITY_COLORS: Record<string, string> = {
  kritisch: 'EF4444',
  hoch: 'F97316',
  mittel: 'EAB308',
  niedrig: '22C55E',
}

export class TeamsNotificationProvider implements NotificationProvider {
  constructor(private webhookUrl: string) {}

  async send(payload: NotificationPayload): Promise<void> {
    const color = SEVERITY_COLORS[payload.classification ?? ''] ?? '718096'

    const body = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: color,
      summary: payload.title,
      sections: [
        {
          activityTitle: payload.title,
          activitySubtitle: payload.name,
          facts: [
            { name: 'Schweregrad', value: payload.classification ?? '—' },
            { name: 'CVSS Score', value: String(payload.basescore ?? '—') },
            { name: 'Status', value: payload.status ?? '—' },
            ...(payload.noPatch ? [{ name: 'Patch', value: '⚠ Kein Patch verfügbar' }] : []),
            ...(payload.cves.length > 0 ? [{ name: 'CVEs', value: payload.cves.slice(0, 5).join(', ') }] : []),
            ...(payload.productNames.length > 0 ? [{ name: 'Produkte', value: payload.productNames.slice(0, 4).join(', ') }] : []),
          ],
        },
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'BSI Advisory öffnen',
          targets: [{ os: 'default', uri: payload.url }],
        },
      ],
    }

    const res = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`Teams webhook error ${res.status}`)
  }
}
