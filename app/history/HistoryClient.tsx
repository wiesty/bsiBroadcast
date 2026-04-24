'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SeverityBadge from '@/components/SeverityBadge'

interface LogEntry {
  id: number
  sentAt: number
  status: string
  error: string | null
  advisoryUuid: string
  advisoryName: string | null
  advisoryTitle: string | null
  advisoryClassification: string | null
  configName: string | null
}

export default function HistoryClient() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 50

  useEffect(() => {
    setLoading(true)
    fetch(`/api/history?page=${page}&size=${PAGE_SIZE}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.data ?? [])
        setTotal(data.total ?? 0)
      })
      .finally(() => setLoading(false))
  }, [page])

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  return (
    <div className="page-shell" style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Verlauf</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' }}>
          {total.toLocaleString('de-DE')} gesendete Benachrichtigungen
        </p>
      </div>

      {total === 0 && !loading ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            Noch keine Benachrichtigungen gesendet. Konfiguriere einen Webhook und aktiviere Produkte auf der Watchlist.
          </p>
        </div>
      ) : (
        <div className="card table-card" style={{ overflow: 'hidden' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Advisory', 'Schweregrad', 'Webhook', 'Status', 'Zeitpunkt'].map((h) => (
                  <th key={h} style={{
                    padding: '11px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600,
                    color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase',
                    background: 'var(--bg-tertiary)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} style={{ padding: '14px 16px' }}>
                        <div style={{ height: 14, background: 'var(--bg-tertiary)', borderRadius: 4, width: j === 0 ? '70%' : '50%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '12px 16px', maxWidth: 320 }}>
                      <Link href={`/advisories/${log.advisoryUuid}`} style={{ textDecoration: 'none' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 2 }}>
                          {log.advisoryTitle ?? 'Unbekannt'}
                        </div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--blue)' }}>
                          {log.advisoryName ?? log.advisoryUuid}
                        </div>
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <SeverityBadge severity={log.advisoryClassification} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {log.configName ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {log.status === 'success' ? (
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#86efac' }}>✓ Gesendet</span>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#fca5a5' }} title={log.error ?? ''}>
                          ✗ Fehler
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(log.sentAt)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {total > PAGE_SIZE && (
            <div className="pagination-row" style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} von {total.toLocaleString('de-DE')}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page === 0} style={{ padding: '5px 12px' }}>←</button>
                <button className="btn-secondary" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total} style={{ padding: '5px 12px' }}>→</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
