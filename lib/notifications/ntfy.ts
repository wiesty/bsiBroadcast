import type { NotificationPayload, NotificationProvider } from './types'

const SEVERITY_PRIORITY: Record<string, string> = {
  kritisch: 'urgent',
  hoch: 'high',
  mittel: 'default',
  niedrig: 'low',
}

const SEVERITY_TAGS: Record<string, string> = {
  kritisch: 'rotating_light,skull',
  hoch: 'warning,fire',
  mittel: 'warning',
  niedrig: 'information_source',
}

export class NtfyNotificationProvider implements NotificationProvider {
  constructor(
    private serverUrl: string,
    private topic: string,
    private token?: string,
  ) {}

  async send(payload: NotificationPayload): Promise<void> {
    const headers: Record<string, string> = {
      Title: payload.name,
      Priority: SEVERITY_PRIORITY[payload.classification ?? ''] ?? 'default',
      Tags: SEVERITY_TAGS[payload.classification ?? ''] ?? 'bell',
      'Click': payload.url,
    }
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`

    const body = [
      payload.title,
      payload.classification ? `Schweregrad: ${payload.classification}` : '',
      payload.basescore != null ? `CVSS: ${payload.basescore}` : '',
      payload.cves.length > 0 ? `CVEs: ${payload.cves.slice(0, 3).join(', ')}` : '',
    ].filter(Boolean).join('\n')

    const url = `${this.serverUrl.replace(/\/$/, '')}/${this.topic}`
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`Ntfy error ${res.status}`)
  }
}
