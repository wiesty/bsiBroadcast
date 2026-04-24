import type { NotificationPayload, NotificationProvider } from './types'

const SEVERITY_COLORS: Record<string, string> = {
  kritisch: '#ef4444',
  hoch: '#f97316',
  mittel: '#eab308',
  niedrig: '#22c55e',
}

export class SlackNotificationProvider implements NotificationProvider {
  constructor(private webhookUrl: string) {}

  async send(payload: NotificationPayload): Promise<void> {
    const color = SEVERITY_COLORS[payload.classification ?? ''] ?? '#718096'

    const body = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: payload.title, emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Schweregrad*\n${payload.classification ?? '—'}` },
            { type: 'mrkdwn', text: `*CVSS*\n${payload.basescore ?? '—'}` },
            { type: 'mrkdwn', text: `*Status*\n${payload.status ?? '—'}` },
            { type: 'mrkdwn', text: `*ID*\n\`${payload.name}\`` },
          ],
        },
        ...(payload.cves.length > 0 ? [{
          type: 'section',
          text: { type: 'mrkdwn', text: `*CVEs:* ${payload.cves.slice(0, 5).join(', ')}${payload.cves.length > 5 ? ` +${payload.cves.length - 5}` : ''}` },
        }] : []),
        {
          type: 'actions',
          elements: [{ type: 'button', text: { type: 'plain_text', text: 'BSI Advisory öffnen ↗' }, url: payload.url }],
        },
      ],
      attachments: [{ color }],
    }

    const res = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`Slack webhook error ${res.status}`)
  }
}
