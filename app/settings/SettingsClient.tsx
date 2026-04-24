'use client'

import { useState, useEffect } from 'react'

interface WebhookConfig {
  id: number
  name: string
  type: string
  config: Record<string, string>
  webhookUrl: string | null
  enabled: boolean
  minSeverity: string
}

const SEVERITY_OPTIONS = [
  { value: 'niedrig', label: 'Alle (ab Niedrig)' },
  { value: 'mittel', label: 'Mittel und höher' },
  { value: 'hoch', label: 'Hoch und höher' },
  { value: 'kritisch', label: 'Nur Kritisch' },
]

type ProviderType = 'discord' | 'slack' | 'teams' | 'telegram' | 'ntfy' | 'webhook'

interface ProviderField { key: string; label: string; placeholder: string; type?: string; optional?: boolean }

const PROVIDERS: Record<ProviderType, { label: string; color: string; icon: React.ReactNode; fields: ProviderField[] }> = {
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

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
  marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase',
}

export default function SettingsClient() {
  const [showNewOnly, setShowNewOnly] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('showNewOnly') !== 'false'
  })
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedType, setSelectedType] = useState<ProviderType | null>(null)
  const [formName, setFormName] = useState('')
  const [formConfig, setFormConfig] = useState<Record<string, string>>({})
  const [formSeverity, setFormSeverity] = useState('mittel')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [fullImporting, setFullImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number; imported: number } | null>(null)
  const [syncResult, setSyncResult] = useState<{ newCount?: number; updatedCount?: number; imported?: number; error?: string } | null>(null)

  useEffect(() => {
    fetch('/api/settings/webhooks')
      .then((r) => (r.ok ? r.json() : []))
      .then(setWebhooks)
      .catch(() => setWebhooks([]))
      .finally(() => setLoading(false))
  }, [])

  function resetForm() {
    setShowAdd(false)
    setSelectedType(null)
    setFormName('')
    setFormConfig({})
    setFormSeverity('mittel')
  }

  async function addWebhook() {
    if (!selectedType || !formName) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, type: selectedType, config: formConfig, minSeverity: formSeverity }),
      })
      const created = await res.json()
      setWebhooks((prev) => [...prev, created])
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  async function deleteWebhook(id: number) {
    await fetch(`/api/settings/webhooks/${id}`, { method: 'DELETE' })
    setWebhooks((prev) => prev.filter((w) => w.id !== id))
  }

  async function toggleWebhook(webhook: WebhookConfig) {
    await fetch(`/api/settings/webhooks/${webhook.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !webhook.enabled }),
    })
    setWebhooks((prev) => prev.map((w) => (w.id === webhook.id ? { ...w, enabled: !w.enabled } : w)))
  }

  async function updateSeverity(webhook: WebhookConfig, minSeverity: string) {
    await fetch(`/api/settings/webhooks/${webhook.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minSeverity }),
    })
    setWebhooks((prev) => prev.map((w) => (w.id === webhook.id ? { ...w, minSeverity } : w)))
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      setSyncResult(await res.json())
    } finally {
      setSyncing(false)
    }
  }

  async function handleFullImport() {
    if (!confirm('Alle ~12.800 BSI-Advisories importieren? Das dauert ca. 2-3 Minuten.')) return
    setFullImporting(true)
    setSyncResult(null)
    setImportProgress(null)
    try {
      const res = await fetch('/api/sync/full', { method: 'POST' })
      if (!res.body) throw new Error('No response body')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'progress') setImportProgress({ done: event.done, total: event.total, imported: event.imported })
            else if (event.type === 'done') { setSyncResult({ imported: event.imported }); setImportProgress(null) }
            else if (event.type === 'error') { setSyncResult({ error: event.message }); setImportProgress(null) }
          } catch {}
        }
      }
    } catch (err) {
      setSyncResult({ error: err instanceof Error ? err.message : String(err) })
    } finally {
      setFullImporting(false)
      setImportProgress(null)
    }
  }

  const provider = selectedType ? PROVIDERS[selectedType] : null
  const formValid = selectedType && formName && provider?.fields.filter(f => !f.optional).every(f => formConfig[f.key])

  return (
    <div className="page-shell narrow-shell" style={{ padding: '32px 36px', maxWidth: 860 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Einstellungen</h1>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 36px' }}>Benachrichtigungen und Sync</p>

      {/* Sync */}
      <Section title="Sync" description="Manueller Daten-Sync vom BSI WID">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <button className="btn-primary" onClick={handleSync} disabled={syncing || fullImporting}>
            {syncing ? <><SpinnerIcon />Läuft…</> : <><SyncIcon />Delta-Sync</>}
          </button>
          <button className="btn-secondary" onClick={handleFullImport} disabled={syncing || fullImporting}>
            {fullImporting ? <><SpinnerIcon />Importiert…</> : 'Vollständiger Import'}
          </button>
          {syncResult && !syncResult.error && (
            <span style={{ fontSize: 13, color: 'var(--green)' }}>
              ✓ {syncResult.imported != null
                ? syncResult.imported > 0 ? `${syncResult.imported.toLocaleString('de-DE')} neue Advisories importiert` : 'Alle Advisories bereits aktuell'
                : `${syncResult.newCount} neue, ${syncResult.updatedCount} aktualisiert`}
            </span>
          )}
          {syncResult?.error && <span style={{ fontSize: 13, color: '#fca5a5' }}>✗ {syncResult.error}</span>}
        </div>
        {importProgress && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Importiere Advisories…</span>
              <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                {importProgress.done.toLocaleString('de-DE')} / {importProgress.total.toLocaleString('de-DE')}
                {importProgress.imported > 0 && <span style={{ color: 'var(--green)', marginLeft: 10 }}>+{importProgress.imported.toLocaleString('de-DE')} neu</span>}
              </span>
            </div>
            <div style={{ height: 5, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round((importProgress.done / importProgress.total) * 100)}%`, background: 'linear-gradient(90deg, var(--blue), var(--blue-light))', borderRadius: 3, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )}
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Automatischer Sync stündlich (via <span className="mono" style={{ fontSize: 12 }}>SYNC_INTERVAL_MS</span>).
        </p>
      </Section>

      <hr className="divider" style={{ margin: '28px 0' }} />

      {/* Dashboard */}
      <Section title="Dashboard" description="Anzeigeeinstellungen für das Dashboard">
        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Standardmäßig nur neue Advisories</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Dashboard zeigt beim Öffnen nur Einträge mit Status <span className="mono" style={{ fontSize: 11 }}>NEU</span> an
            </div>
          </div>
          <Toggle
            checked={showNewOnly}
            onChange={() => {
              const next = !showNewOnly
              setShowNewOnly(next)
              localStorage.setItem('showNewOnly', next ? 'true' : 'false')
            }}
          />
        </div>
      </Section>

      <hr className="divider" style={{ margin: '28px 0' }} />

      {/* Notifications */}
      <Section
        title="Benachrichtigungskanäle"
        description="Notifications nur für Produkte aus deiner Watchlist."
        action={!showAdd ? (
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <PlusIcon /> Kanal hinzufügen
          </button>
        ) : undefined}
      >
        {/* Add Form */}
        {showAdd && (
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            {!selectedType ? (
              <>
                <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Kanal wählen
                </h3>
                <div className="provider-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {(Object.entries(PROVIDERS) as [ProviderType, typeof PROVIDERS[ProviderType]][]).map(([key, p]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedType(key)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        padding: '16px 12px', borderRadius: 8, cursor: 'pointer',
                        background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.background = `${p.color}15` }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                    >
                      {p.icon}
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{p.label}</span>
                    </button>
                  ))}
                </div>
                <button className="btn-ghost" onClick={resetForm} style={{ marginTop: 12 }}>Abbrechen</button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  {PROVIDERS[selectedType].icon}
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                    {PROVIDERS[selectedType].label} konfigurieren
                  </h3>
                  <button onClick={() => setSelectedType(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
                    ← Zurück
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Name</label>
                    <input className="input" placeholder="z.B. Security Team" value={formName} onChange={(e) => setFormName(e.target.value)} />
                  </div>
                  {PROVIDERS[selectedType].fields.map((field) => (
                    <div key={field.key}>
                      <label style={labelStyle}>{field.label}{field.optional && <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 4, opacity: 0.6 }}>(optional)</span>}</label>
                      <input
                        className="input"
                        placeholder={field.placeholder}
                        value={formConfig[field.key] ?? ''}
                        onChange={(e) => setFormConfig((c) => ({ ...c, [field.key]: e.target.value }))}
                        type={field.type ?? 'text'}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={labelStyle}>Mindestschweregrad</label>
                    <select className="select" value={formSeverity} onChange={(e) => setFormSeverity(e.target.value)}>
                      {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="form-actions" style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button className="btn-primary" onClick={addWebhook} disabled={saving || !formValid}>
                      {saving ? 'Speichern…' : 'Hinzufügen'}
                    </button>
                    <button className="btn-secondary" onClick={resetForm}>Abbrechen</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Channel List */}
        {loading ? (
          <div style={{ height: 80, background: 'var(--bg-tertiary)', borderRadius: 8 }} />
        ) : webhooks.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Noch keine Kanäle konfiguriert.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {webhooks.map((webhook) => {
              const p = PROVIDERS[webhook.type as ProviderType]
              const cfg = webhook.config ?? {}
              const primaryUrl = webhook.webhookUrl ?? cfg.webhookUrl ?? cfg.url ?? cfg.serverUrl ?? ''
              const subtitle = cfg.chatId ? `Chat: ${cfg.chatId}` : cfg.topic ? `Topic: ${cfg.topic}` : primaryUrl
              return (
                <div key={webhook.id} className="card webhook-card" style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flexShrink: 0 }}>{p?.icon ?? '📣'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{webhook.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360, fontFamily: 'monospace', marginTop: 2 }}>
                        {p?.label} · {subtitle || '—'}
                      </div>
                    </div>
                    <select className="select" value={webhook.minSeverity} onChange={(e) => updateSeverity(webhook, e.target.value)} style={{ width: 'auto', fontSize: 12 }}>
                      {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <Toggle checked={webhook.enabled} onChange={() => toggleWebhook(webhook)} />
                    <button onClick={() => deleteWebhook(webhook.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{title}</h2>
          {description && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '3px 0 0' }}>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{ width: 44, height: 24, borderRadius: 12, background: checked ? 'var(--blue)' : 'var(--bg-tertiary)', border: `1px solid ${checked ? 'var(--blue)' : 'var(--border-strong)'}`, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', padding: 0, flexShrink: 0 }}>
      <span style={{ display: 'block', width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: checked ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </button>
  )
}

function PlusIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> }
function SyncIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 7A5 5 0 1 1 2.5 4.5M2 2v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function SpinnerIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 1s linear infinite' }}><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 15" strokeLinecap="round"/></svg> }
function TrashIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.8 7.5h6.4L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> }
