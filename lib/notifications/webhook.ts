import type { NotificationPayload, NotificationProvider } from './types'

export class WebhookNotificationProvider implements NotificationProvider {
  constructor(
    private url: string,
    private method: string,
    private extraHeaders: Record<string, string>,
  ) {}

  async send(payload: NotificationPayload): Promise<void> {
    const res = await fetch(this.url, {
      method: this.method || 'POST',
      headers: { 'Content-Type': 'application/json', ...this.extraHeaders },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`Webhook error ${res.status}: ${this.url}`)
  }
}
