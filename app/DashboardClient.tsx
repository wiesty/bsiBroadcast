'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import SeverityBadge from '@/components/SeverityBadge'

interface Advisory {
  uuid: string
  name: string
  title: string
  published: number
  basescore: number | null
  classification: string | null
  status: string | null
  productNames: string[]
  cves: string[]
  noPatch: boolean
}

interface Stats {
  total: number
  bySeverity: Record<string, number>
  lastSync: { status: string; finishedAt: number | null; newCount: number } | null
}

const SEVERITY_ORDER = ['kritisch', 'hoch', 'mittel', 'niedrig']

const STAT_CARDS = [
  { key: 'kritisch', label: 'Kritisch', color: '#ef4444' },
  { key: 'hoch', label: 'Hoch', color: '#f97316' },
  { key: 'mittel', label: 'Mittel', color: '#eab308' },
  { key: 'niedrig', label: 'Niedrig', color: '#22c55e' },
]

export default function DashboardClient() {
  const [advisories, setAdvisories] = useState<Advisory[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [searchPending, setSearchPending] = useState(false)
  const [classification, setClassification] = useState('')
  const [status, setStatus] = useState<string>(() => {
    if (typeof window === 'undefined') return 'NEU'
    return localStorage.getItem('showNewOnly') === 'false' ? '' : 'NEU'
  })
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 50

  useEffect(() => {
    setSearchPending(true)
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(0)
      setSearchPending(false)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(PAGE_SIZE),
        ...(search && { search }),
        ...(classification && { classification }),
        ...(status && { status }),
      })
      const [advisoriesRes, statsRes] = await Promise.all([
        fetch(`/api/advisories?${params}`),
        fetch('/api/stats'),
      ])
      const [advisoriesData, statsData] = await Promise.all([
        advisoriesRes.json(),
        statsRes.json(),
      ])
      setAdvisories(advisoriesData.data ?? [])
      setTotal(advisoriesData.total ?? 0)
      setStats(statsData)
    } finally {
      setLoading(false)
    }
  }, [page, search, classification, status])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSync() {
    setSyncing(true)
    try {
      await fetch('/api/sync', { method: 'POST' })
      await fetchData()
    } finally {
      setSyncing(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  function formatRelative(ts: number) {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Gerade eben'
    if (mins < 60) return `vor ${mins} Min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `vor ${hours} Std`
    return `vor ${Math.floor(hours / 24)} Tagen`
  }

  return (
    <div className="page-shell" style={{ padding: '32px 36px' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            BSI WID Sicherheitshinweise — {total.toLocaleString('de-DE')} gesamt
          </p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {stats?.lastSync && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Sync {stats.lastSync.finishedAt ? formatRelative(stats.lastSync.finishedAt) : '…'}
            </span>
          )}
          <button className="btn-primary" onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <>
                <SpinnerIcon />
                Syncing…
              </>
            ) : (
              <>
                <SyncIcon />
                Sync
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {STAT_CARDS.map((card) => (
          <button
            key={card.key}
            onClick={() => { setClassification(c => c === card.key ? '' : card.key); setPage(0) }}
            style={{
              background: classification === card.key ? `rgba(${hexToRgb(card.color)}, 0.12)` : 'var(--bg-secondary)',
              border: `1px solid ${classification === card.key ? card.color + '55' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              padding: '18px 20px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 700, color: card.color, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {stats?.bySeverity[card.key]?.toLocaleString('de-DE') ?? '—'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 500 }}>
              {card.label}
            </div>
          </button>
        ))}
      </div>

      {/* Total card */}
      <div className="card summary-card" style={{ padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats?.total?.toLocaleString('de-DE') ?? '—'}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>Advisories gesamt</span>
        </div>
        {stats?.lastSync && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: stats.lastSync.status === 'success' ? 'var(--green)' : stats.lastSync.status === 'running' ? 'var(--blue)' : 'var(--red)',
              }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {stats.lastSync.status === 'running' ? 'Sync läuft…' : `Letzter Sync: ${stats.lastSync.newCount} neue`}
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filters-row" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 200 }}>
          {searchPending || (loading && searchInput) ? (
            <SpinnerSearchIcon style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--blue)', pointerEvents: 'none' }} />
          ) : (
            <SearchIcon style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          )}
          <input
            className="input"
            placeholder="Suche nach Titel, CVE, Produkt…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ paddingLeft: 34 }}
          />
        </div>
        <select
          className="select"
          value={classification}
          onChange={(e) => { setClassification(e.target.value); setPage(0) }}
          style={{ width: 160 }}
        >
          <option value="">Alle Schweregrade</option>
          <option value="kritisch">Kritisch</option>
          <option value="hoch">Hoch</option>
          <option value="mittel">Mittel</option>
          <option value="niedrig">Niedrig</option>
        </select>
        <select
          className="select"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0) }}
          style={{ width: 140 }}
        >
          <option value="">Alle Status</option>
          <option value="NEU">Neu</option>
          <option value="UPDATE">Update</option>
          <option value="UNGEPATCHT">Ungepacht</option>
        </select>
        {(searchInput || classification || status) && (
          <button
            className="btn-ghost"
            onClick={() => { setSearchInput(''); setSearch(''); setClassification(''); setStatus(''); setPage(0) }}
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card table-card" style={{ overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Advisory', 'Schweregrad', 'Score', 'Produkte', 'Status', 'Datum'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '11px 16px',
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    background: 'var(--bg-tertiary)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} style={{ padding: '14px 16px' }}>
                      <div style={{ height: 14, background: 'var(--bg-tertiary)', borderRadius: 4, width: j === 0 ? '80%' : '60%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : advisories.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                  {total === 0 ? 'Noch keine Advisories. Sync starten um Daten zu laden.' : 'Keine Ergebnisse für diese Filterung.'}
                </td>
              </tr>
            ) : (
              advisories.map((a) => (
                <tr
                  key={a.uuid}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '12px 16px', maxWidth: 380 }}>
                    <Link
                      href={`/advisories/${a.uuid}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 3 }}>
                        {a.title}
                      </div>
                      <div
                        className="mono"
                        style={{ fontSize: 11, color: 'var(--blue)', letterSpacing: '0.02em' }}
                      >
                        {a.name}
                      </div>
                    </Link>
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <SeverityBadge severity={a.classification} />
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    {a.basescore != null ? (
                      <span
                        className="mono"
                        style={{ fontSize: 13, color: 'var(--text-secondary)' }}
                      >
                        {a.basescore}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: 200 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {a.productNames?.length > 0
                        ? a.productNames.slice(0, 2).join(', ') + (a.productNames.length > 2 ? ` +${a.productNames.length - 2}` : '')
                        : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    {a.status ? (
                      <span
                        className="mono"
                        style={{
                          fontSize: 11,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'var(--bg-tertiary)',
                          color: a.status === 'NEU' ? 'var(--blue)' : a.status === 'UNGEPATCHT' ? '#fca5a5' : 'var(--text-secondary)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {a.status}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatDate(a.published)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-row" style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} von {total.toLocaleString('de-DE')}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page === 0} style={{ padding: '5px 12px' }}>
                ←
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 500,
                      background: p === page ? 'var(--blue)' : 'var(--bg-tertiary)',
                      color: p === page ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${p === page ? 'var(--blue)' : 'var(--border)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    {p + 1}
                  </button>
                )
              })}
              <button className="btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} style={{ padding: '5px 12px' }}>
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function SyncIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M12 7A5 5 0 1 1 2.5 4.5M2 2v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 15" strokeLinecap="round"/>
    </svg>
  )
}

function SearchIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={style}>
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function SpinnerSearchIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spinSearch 0.7s linear infinite', ...style }}>
      <style>{`@keyframes spinSearch { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 15" strokeLinecap="round"/>
    </svg>
  )
}
