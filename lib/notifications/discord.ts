import type { NotificationPayload, NotificationProvider } from './types'

const SEVERITY_COLORS: Record<string, number> = {
  kritisch: 0xe53e3e,
  hoch: 0xed8936,
  mittel: 0xecc94b,
  niedrig: 0x48bb78,
}

const SEVERITY_EMOJI: Record<string, string> = {
  kritisch: '🔴',
  hoch: '🟠',
  mittel: '🟡',
  niedrig: '🟢',
}

export class DiscordNotificationProvider implements NotificationProvider {
  constructor(private webhookUrl: string) {}

  async send(payload: NotificationPayload): Promise<void> {
    const severity = payload.classification ?? 'unbekannt'
    const color = SEVERITY_COLORS[severity] ?? 0x718096
    const emoji = SEVERITY_EMOJI[severity] ?? '⚪'

    const fields = []

    if (payload.basescore) {
      fields.push({ name: 'CVSS Score', value: `\`${payload.basescore}\``, inline: true })
    }
    if (payload.status) {
      fields.push({ name: 'Status', value: `\`${payload.status}\``, inline: true })
    }
    if (payload.noPatch) {
      fields.push({ name: '⚠️ Patch', value: 'Kein Patch verfügbar', inline: true })
    }
    if (payload.cves.length > 0) {
      fields.push({
        name: 'CVEs',
        value: payload.cves
          .slice(0, 8)
          .map((c) => `[\`${c}\`](https://nvd.nist.gov/vuln/detail/${c})`)
          .join(' · ')
          + (payload.cves.length > 8 ? ` +${payload.cves.length - 8} weitere` : ''),
        inline: false,
      })
    }
    if (payload.productNames.length > 0) {
      fields.push({
        name: 'Betroffene Produkte',
        value: payload.productNames.slice(0, 6).join(', ')
          + (payload.productNames.length > 6 ? ` +${payload.productNames.length - 6} weitere` : ''),
        inline: false,
      })
    }

    const body = {
      embeds: [
        {
          title: `${emoji} ${payload.title}`,
          url: payload.url,
          color,
          fields,
          footer: {
            text: `${payload.name} · BSI WID`,
          },
          timestamp: payload.published.toISOString(),
        },
      ],
    }

    const res = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Discord webhook error ${res.status}: ${text}`)
    }
  }
}
