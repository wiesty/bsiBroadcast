'use client'

import { useState, useEffect, useCallback } from 'react'

interface Product {
  id: number
  name: string
  watched: boolean
  firstSeenAt: number
  lastSeenAt: number
}

export default function ProductsClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [inputValue, setInputValue] = useState('')
  const [search, setSearch] = useState('')
  const [searchPending, setSearchPending] = useState(false)
  const [filter, setFilter] = useState<'all' | 'watched'>('all')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [toggling, setToggling] = useState<Set<number>>(new Set())
  const PAGE_SIZE = 100

  // Debounce: 350ms after typing, show pending spinner immediately
  useEffect(() => {
    setSearchPending(true)
    const timer = setTimeout(() => {
      setSearch(inputValue)
      setPage(0)
      setSearchPending(false)
    }, 350)
    return () => clearTimeout(timer)
  }, [inputValue])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(PAGE_SIZE),
        ...(search && { search }),
        ...(filter === 'watched' && { watched: 'true' }),
      })
      const res = await fetch(`/api/products?${params}`)
      const data = await res.json()
      setProducts(data.data ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, search, filter])

  useEffect(() => { fetchData() }, [fetchData])

  async function toggleWatch(product: Product) {
    setToggling((s) => new Set(s).add(product.id))
    try {
      await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watched: !product.watched }),
      })
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, watched: !p.watched } : p))
      )
    } finally {
      setToggling((s) => { const n = new Set(s); n.delete(product.id); return n })
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const watchedCount = products.filter((p) => p.watched).length

  return (
    <div style={{ padding: '32px 36px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Produkte</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Alle {total.toLocaleString('de-DE')} erkannten Produkte — {watchedCount} beobachtet
        </p>
      </div>

      {/* Info Banner */}
      <div style={{
        background: 'rgba(0, 122, 255, 0.08)',
        border: '1px solid rgba(0, 122, 255, 0.2)',
        borderRadius: 'var(--radius)',
        padding: '12px 16px',
        fontSize: 13,
        color: 'var(--text-secondary)',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        <span style={{ color: 'var(--blue)', fontSize: 16, lineHeight: 1 }}>ℹ</span>
        <span>
          Aktiviere den Schalter bei Produkten, für die du Discord-Benachrichtigungen erhalten möchtest.
          Neue Produkte werden beim nächsten Sync automatisch erkannt.
        </span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 200 }}>
          {searchPending || (loading && inputValue) ? (
            <SpinnerIcon style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--blue)', pointerEvents: 'none' }} />
          ) : (
            <SearchIcon style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          )}
          <input
            className="input"
            placeholder="Produkt suchen…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            style={{ paddingLeft: 34 }}
          />
        </div>
        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          {(['all', 'watched'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(0) }}
              style={{
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                border: 'none',
                background: filter === f ? 'var(--blue)' : 'transparent',
                color: filter === f ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {f === 'all' ? 'Alle' : 'Beobachtet'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ height: 14, width: '60%', background: 'var(--bg-tertiary)', borderRadius: 4 }} />
              <div style={{ height: 22, width: 44, background: 'var(--bg-tertiary)', borderRadius: 11 }} />
            </div>
          ))
        ) : products.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            {total === 0 ? 'Noch keine Produkte gefunden. Führe einen Sync durch.' : 'Keine Produkte für diese Suche.'}
          </div>
        ) : (
          products.map((product, i) => (
            <div
              key={product.id}
              style={{
                padding: '12px 20px',
                borderBottom: i < products.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '')}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {product.name}
                </span>
              </div>
              {product.watched && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 100,
                  background: 'rgba(0, 122, 255, 0.12)', color: 'var(--blue)',
                  border: '1px solid rgba(0, 122, 255, 0.25)',
                  whiteSpace: 'nowrap',
                }}>
                  Beobachtet
                </span>
              )}
              <Toggle
                checked={product.watched}
                loading={toggling.has(product.id)}
                onChange={() => toggleWatch(product)}
              />
            </div>
          ))
        )}
      </div>

      {/* Numbered Pagination */}
      {totalPages > 1 && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} von {total.toLocaleString('de-DE')}
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button className="btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page === 0} style={{ padding: '5px 10px' }}>←</button>
            {pageNumbers(page, totalPages).map((p, i) =>
              p === -1 ? (
                <span key={`sep-${i}`} style={{ padding: '5px 4px', color: 'var(--text-muted)', fontSize: 13 }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                    minWidth: 32,
                    background: p === page ? 'var(--blue)' : 'var(--bg-tertiary)',
                    color: p === page ? 'white' : 'var(--text-secondary)',
                    border: `1px solid ${p === page ? 'var(--blue)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}
                >
                  {p + 1}
                </button>
              )
            )}
            <button className="btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} style={{ padding: '5px 10px' }}>→</button>
          </div>
        </div>
      )}
    </div>
  )
}

function pageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const pages: number[] = [0]
  if (current > 2) pages.push(-1)
  for (let p = Math.max(1, current - 1); p <= Math.min(total - 2, current + 1); p++) pages.push(p)
  if (current < total - 3) pages.push(-1)
  pages.push(total - 1)
  return pages
}

function Toggle({ checked, loading, onChange }: { checked: boolean; loading: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      aria-label={checked ? 'Beobachten deaktivieren' : 'Beobachten aktivieren'}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: checked ? 'var(--blue)' : 'var(--bg-tertiary)',
        border: `1px solid ${checked ? 'var(--blue)' : 'var(--border-strong)'}`,
        cursor: loading ? 'not-allowed' : 'pointer',
        position: 'relative',
        transition: 'background 0.2s, border-color 0.2s',
        padding: 0, flexShrink: 0,
        opacity: loading ? 0.6 : 1,
      }}
    >
      <span style={{
        display: 'block', width: 18, height: 18, borderRadius: '50%', background: 'white',
        position: 'absolute', top: 2, left: checked ? 22 : 2, transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

function SearchIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={style}>
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function SpinnerIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 0.7s linear infinite', ...style }}>
      <style>{`@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 15" strokeLinecap="round" />
    </svg>
  )
}
