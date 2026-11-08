export interface WebhookConfig {
  id: number
  name: string
  type: string
  config: Record<string, string>
  webhookUrl: string | null
  enabled: boolean
  minSeverity: string
}

export const SEVERITY_OPTIONS = [
  { value: 'niedrig', label: 'Alle (ab Niedrig)' },
  { value: 'mittel', label: 'Mittel und höher' },
  { value: 'hoch', label: 'Hoch und höher' },
  { value: 'kritisch', label: 'Nur Kritisch' },
]


export type ProviderType = 'discord' | 'slack' | 'teams' | 'telegram' | 'ntfy' | 'webhook'

interface ProviderField { key: string; label: string; placeholder: string; type?: string; optional?: boolean }

export const PROVIDERS: Record<ProviderType, { label: string; color: string; icon: React.ReactNode; fields: ProviderField[] }> = {
  discord: {
    label: 'Discord', color: '#5865F2',
    icon: <svg width="18" height="18" viewBox="0 0 127.14 96.36" fill="#5865F2"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/></svg>,
    fields: [{ key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://discord.com/api/webhooks/…' }],
  },
  slack: {
    label: 'Slack', color: '#4A154B',
    icon: <svg width="18" height="18" viewBox="0 0 54 54" fill="none"><path d="M19.712 33.404c0 1.99-1.628 3.596-3.596 3.596s-3.596-1.606-3.596-3.596 1.628-3.596 3.596-3.596H19.712V33.404zM21.539 33.404c0-1.968 1.628-3.596 3.596-3.596s3.596 1.628 3.596 3.596v9.004c0 1.968-1.628 3.596-3.596 3.596s-3.596-1.628-3.596-3.596V33.404z" fill="#E01E5A"/><path d="M25.135 20.64c-1.968 0-3.596-1.628-3.596-3.596s1.628-3.596 3.596-3.596 3.596 1.628 3.596 3.596V20.64H25.135zM25.135 22.49c1.968 0 3.596 1.628 3.596 3.596s-1.628 3.596-3.596 3.596H16.13c-1.968 0-3.596-1.628-3.596-3.596s1.628-3.596 3.596-3.596h9.005z" fill="#36C5F0"/><path d="M37.9 26.086c0-1.968 1.627-3.596 3.595-3.596s3.596 1.628 3.596 3.596-1.628 3.596-3.596 3.596H37.9V26.086zM36.072 26.086c0 1.968-1.628 3.596-3.596 3.596s-3.596-1.628-3.596-3.596v-9.005c0-1.968 1.628-3.596 3.596-3.596s3.596 1.628 3.596 3.596v9.005z" fill="#2EB67D"/><path d="M32.476 38.851c1.968 0 3.596 1.628 3.596 3.596s-1.628 3.596-3.596 3.596-3.596-1.628-3.596-3.596V38.851h3.596zM32.476 37.023c-1.968 0-3.596-1.628-3.596-3.596s1.628-3.596 3.596-3.596h9.005c1.968 0 3.596 1.628 3.596 3.596s-1.628 3.596-3.596 3.596H32.476z" fill="#ECB22E"/></svg>,
    fields: [{ key: 'webhookUrl', label: 'Incoming Webhook URL', placeholder: 'https://hooks.slack.com/services/…' }],
  },
  teams: {
    label: 'Microsoft Teams', color: '#6264A7',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="#6264A7"><path d="M20 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zm-5.5 9.5c0 .83-.67 1.5-1.5 1.5h-2v2H9.5V10H13c.83 0 1.5.67 1.5 1.5v1zm3.5-2H16v6h-1.5V10.5H15V9h3v1.5z"/></svg>,
    fields: [{ key: 'webhookUrl', label: 'Incoming Webhook URL', placeholder: 'https://…webhook.office.com/…' }],
  },
  telegram: {
    label: 'Telegram', color: '#2AABEE',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="#2AABEE"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>,
    fields: [
      { key: 'botToken', label: 'Bot Token', placeholder: '1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ' },
      { key: 'chatId', label: 'Chat ID', placeholder: '-1001234567890' },
    ],
  },
  ntfy: {
    label: 'Ntfy', color: '#6650A4',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="#6650A4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    fields: [
      { key: 'serverUrl', label: 'Server URL', placeholder: 'https://ntfy.sh' },
      { key: 'topic', label: 'Topic', placeholder: 'bsi-alerts' },
      { key: 'token', label: 'Access Token', placeholder: 'optional', optional: true },
    ],
  },
  webhook: {
    label: 'Generic Webhook', color: '#64748B',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    fields: [
      { key: 'url', label: 'URL', placeholder: 'https://example.com/webhook' },
      { key: 'method', label: 'Method', placeholder: 'POST', optional: true },
      { key: 'headers', label: 'Headers (JSON)', placeholder: '{"Authorization":"Bearer …"}', optional: true },
    ],
  },
}

