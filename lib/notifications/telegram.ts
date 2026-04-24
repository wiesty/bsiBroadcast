import type { NotificationPayload, NotificationProvider } from './types'

const SEVERITY_EMOJI: Record<string, string> = {
  kritisch: '🔴',
  hoch: '🟠',
  mittel: '🟡',
  niedrig: '🟢',
}

export class TelegramNotificationProvider implements NotificationProvider {
  constructor(private botToken: string, private chatId: string) {}

  async send(payload: NotificationPayload): Promise<void> {
    const emoji = SEVERITY_EMOJI[payload.classification ?? ''] ?? '⚪'

    const lines = [
      `${emoji} *${escMd(payload.title)}*`,
      `\`${payload.name}\``,
      '',
      `📊 Schweregrad: *${payload.classification ?? '—'}*`,
      payload.basescore != null ? `📈 CVSS: *${payload.basescore}*` : null,
      payload.status ? `🔖 Status: \`${payload.status}\`` : null,
      payload.noPatch ? `⚠️ *Kein Patch verfügbar*` : null,
      payload.cves.length > 0 ? `\n🛡 CVEs: ${payload.cves.slice(0, 5).map((c) => `\`${c}\``).join(', ')}` : null,
      payload.productNames.length > 0 ? `📦 Produkte: ${escMd(payload.productNames.slice(0, 3).join(', '))}` : null,
      `\n[🔗 BSI Advisory öffnen](${payload.url})`,
    ].filter(Boolean).join('\n')

    const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: this.chatId, text: lines, parse_mode: 'Markdown', disable_web_page_preview: true }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Telegram error ${res.status}: ${err.description ?? ''}`)
    }
  }
}

function escMd(s: string) {
  return s.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
}
