import { PROVIDER_TYPES, type ProviderType } from '../db/schema'

const REQUIRED_FIELDS: Record<ProviderType, string[]> = {
  discord: ['webhookUrl'],
  slack: ['webhookUrl'],
  teams: ['webhookUrl'],
  telegram: ['botToken', 'chatId'],
  ntfy: ['serverUrl', 'topic'],
  webhook: ['url'],
}

export function parseNotificationSettings(body: unknown) {
  if (!body || typeof body !== 'object' || !('type' in body) || !('config' in body)) {
    throw new Error('Kanaltyp und Konfiguration sind erforderlich.')
  }
  const { type, config } = body
  if (typeof type !== 'string' || !PROVIDER_TYPES.includes(type as ProviderType)) {
    throw new Error('Ungültiger Kanaltyp.')
  }
  if (!config || typeof config !== 'object' || Array.isArray(config) ||
      !Object.values(config).every((value) => typeof value === 'string')) {
    throw new Error('Die Kanalkonfiguration muss Textwerte enthalten.')
  }
  const settings = { type: type as ProviderType, config: { ...config } as Record<string, string>, webhookUrl: null }
  if (REQUIRED_FIELDS[settings.type].some((key) => !settings.config[key]?.trim())) {
    throw new Error('Bitte alle Pflichtfelder des Kanals ausfüllen.')
  }
  const url = settings.config.webhookUrl ?? settings.config.serverUrl ?? settings.config.url
  if (url) {
    try {
      if (!['https:', 'http:'].includes(new URL(url).protocol)) throw new Error()
    } catch {
      throw new Error('Bitte eine gültige HTTP- oder HTTPS-URL eingeben.')
    }
  }
  if (settings.type === 'webhook') {
    settings.config.method = settings.config.method?.trim().toUpperCase() || 'POST'
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(settings.config.method)) {
      throw new Error('Webhook-Methode muss POST, PUT, PATCH oder DELETE sein.')
    }
    if (settings.config.headers?.trim()) {
      try {
        const headers = JSON.parse(settings.config.headers)
        if (!headers || typeof headers !== 'object' || Array.isArray(headers) ||
            !Object.values(headers).every((value) => typeof value === 'string')) throw new Error()
        new Headers(headers)
      } catch {
        throw new Error('Headers müssen ein gültiges JSON-Objekt mit Textwerten sein.')
      }
    }
  }
  return settings
}
