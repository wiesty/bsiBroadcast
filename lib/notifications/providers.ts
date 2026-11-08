import { DiscordNotificationProvider } from './discord'
import { SlackNotificationProvider } from './slack'
import { TeamsNotificationProvider } from './teams'
import { TelegramNotificationProvider } from './telegram'
import { NtfyNotificationProvider } from './ntfy'
import { WebhookNotificationProvider } from './webhook'
import type { NotificationProvider } from './types'
import type { NotificationConfig } from '@/lib/db/schema'

export function createProvider(config: Pick<NotificationConfig, 'type' | 'config' | 'webhookUrl'>): NotificationProvider {
  const cfg = (config.config as Record<string, string>) ?? {}

  switch (config.type) {
    case 'discord':
      return new DiscordNotificationProvider(config.webhookUrl ?? cfg.webhookUrl ?? '')
    case 'slack':
      return new SlackNotificationProvider(cfg.webhookUrl ?? config.webhookUrl ?? '')
    case 'teams':
      return new TeamsNotificationProvider(cfg.webhookUrl ?? config.webhookUrl ?? '')
    case 'telegram':
      return new TelegramNotificationProvider(cfg.botToken ?? '', cfg.chatId ?? '')
    case 'ntfy':
      return new NtfyNotificationProvider(cfg.serverUrl ?? '', cfg.topic ?? '', cfg.token || undefined)
    case 'webhook': {
      let headers: Record<string, string> = {}
      try { headers = JSON.parse(cfg.headers ?? '{}') } catch {}
      return new WebhookNotificationProvider(cfg.url ?? '', cfg.method ?? 'POST', headers)
    }
    default:
      throw new Error(`Unknown provider type: ${config.type}`)
  }
}

