import { Suspense } from 'react'
import DashboardClient from './DashboardClient'

export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient />
    </Suspense>
  )
}

function DashboardSkeleton() {
  return (
    <div className="page-shell" style={{ padding: '32px 36px' }}>
      <div style={{ height: 28, width: 200, background: 'var(--bg-tertiary)', borderRadius: 6, marginBottom: 8 }} />
      <div style={{ height: 16, width: 320, background: 'var(--bg-tertiary)', borderRadius: 4, marginBottom: 32 }} />
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ height: 90, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }} />
        ))}
      </div>
      <div style={{ height: 400, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }} />
    </div>
  )
}
