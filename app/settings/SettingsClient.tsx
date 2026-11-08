'use client'

import { useState, useEffect } from 'react'
import { PROVIDERS, SEVERITY_OPTIONS, type ProviderType, type WebhookConfig } from './notification-providers'
import NotificationChannelForm from './NotificationChannelForm'

export default function SettingsClient() {
  const [showNewOnly, setShowNewOnly] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('showNewOnly') !== 'false'
  })
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [channelError, setChannelError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
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

  async function deleteWebhook(id: number) {
    if (deletingId !== null) return
    setDeletingId(id)
    setChannelError(null)
    try {
      const response = await fetch(`/api/settings/webhooks/${id}`, { method: 'DELETE' })
      const result = await response.json().catch(() => null)
      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error ?? `Kanal konnte nicht gelöscht werden (HTTP ${response.status}).`)
      }
      setWebhooks((previous) => previous.filter((channel) => channel.id !== id))
    } catch (error) {
      setChannelError(error instanceof Error ? error.message : 'Kanal konnte nicht gelöscht werden.')
    } finally {
      setDeletingId(null)
    }
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
        {showAdd && <NotificationChannelForm onCancel={() => setShowAdd(false)} onCreated={(channel) => {
          setWebhooks((previous) => [...previous, channel])
          setShowAdd(false)
        }} />}
        {channelError && <p role="alert" className="mb-3 text-sm text-red-300">{channelError}</p>}

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
                    <button onClick={() => void deleteWebhook(webhook.id)} disabled={deletingId !== null} aria-label={`${webhook.name} löschen`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
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
