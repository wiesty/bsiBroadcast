'use client'

import { useState, type FormEvent } from 'react'
import { PROVIDERS, SEVERITY_OPTIONS, type ProviderType, type WebhookConfig } from './notification-providers'

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]'

export default function NotificationChannelForm({ onCreated, onCancel }: {
  onCreated: (channel: WebhookConfig) => void
  onCancel: () => void
}) {
  const [type, setType] = useState<ProviderType | null>(null)
  const [name, setName] = useState('')
  const [config, setConfig] = useState<Record<string, string>>({})
  const [minSeverity, setMinSeverity] = useState('mittel')
  const [pending, setPending] = useState<'save' | 'test' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [testSent, setTestSent] = useState(false)
  const provider = type ? PROVIDERS[type] : null
  const configValid = provider?.fields.filter((field) => !field.optional).every((field) => config[field.key]?.trim())

  function updateConfig(key: string, value: string) {
    setConfig((previous) => ({ ...previous, [key]: value }))
    setTestSent(false)
    setError(null)
  }

  async function submit(action: 'save' | 'test') {
    if (pending || !type || !configValid || (action === 'save' && !name.trim())) return
    setPending(action)
    setError(null)
    setTestSent(false)
    try {
      const response = await fetch(`/api/settings/webhooks${action === 'test' ? '/test' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name, config, minSeverity }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result || (action === 'save' ? typeof result.id !== 'number' : result.success !== true)) {
        throw new Error(result?.error ?? `Anfrage fehlgeschlagen (HTTP ${response.status}).`)
      }
      if (action === 'test') setTestSent(true)
      else onCreated(result)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Der Kanal konnte nicht erreicht werden.')
    } finally {
      setPending(null)
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submit('save')
  }

  return (
    <div className="card mb-5 p-5">
      {!type || !provider ? (
        <>
          <h3 className="mb-3.5 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Kanal wählen</h3>
          <div className="provider-grid grid grid-cols-3 gap-2.5">
            {(Object.entries(PROVIDERS) as [ProviderType, typeof PROVIDERS[ProviderType]][]).map(([key, item]) => (
              <button key={key} type="button" onClick={() => { setType(key); setConfig({}); setError(null); setTestSent(false) }}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-4 transition-colors hover:border-[var(--blue)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]">
                {item.icon}
                <span className="text-xs font-semibold text-[var(--text-secondary)]">{item.label}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn-ghost mt-3" onClick={onCancel}>Abbrechen</button>
        </>
      ) : (
        <form onSubmit={save}>
          <fieldset disabled={pending !== null} className="min-w-0">
            <div className="mb-4 flex items-center gap-2.5">
              {provider.icon}
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">{provider.label} konfigurieren</h3>
              <button type="button" onClick={() => { setType(null); setError(null); setTestSent(false) }} className="btn-ghost ml-auto text-[13px]">← Zurück</button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="channel-name" className={labelClass}>Name</label>
                <input id="channel-name" className="input" placeholder="z.B. Security Team" value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              {provider.fields.map((field) => (
                <div key={field.key}>
                  <label htmlFor={`channel-${field.key}`} className={labelClass}>
                    {field.label}{field.optional && <span className="ml-1 font-normal normal-case opacity-60">(optional)</span>}
                  </label>
                  <input id={`channel-${field.key}`} className="input" placeholder={field.placeholder}
                    value={config[field.key] ?? ''} onChange={(event) => updateConfig(field.key, event.target.value)}
                    type={field.type ?? 'text'} required={!field.optional} />
                </div>
              ))}
              <div>
                <label htmlFor="channel-severity" className={labelClass}>Mindestschweregrad</label>
                <select id="channel-severity" className="select" value={minSeverity} onChange={(event) => setMinSeverity(event.target.value)}>
                  {SEVERITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              {testSent && <p role="status" className="text-sm text-green-300">Testbenachrichtigung wurde erfolgreich gesendet.</p>}
              <div className="form-actions mt-1 flex flex-wrap gap-2">
                <button type="submit" className="btn-primary" disabled={pending !== null || !configValid || !name.trim()}>
                  {pending === 'save' ? 'Speichern…' : 'Hinzufügen'}
                </button>
                <button type="button" className="btn-secondary" disabled={pending !== null || !configValid} onClick={() => void submit('test')}>
                  {pending === 'test' ? 'Test wird gesendet…' : 'Testbenachrichtigung senden'}
                </button>
                <button type="button" className="btn-secondary" onClick={onCancel}>Abbrechen</button>
              </div>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  )
}
