'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Package, Clock, Settings } from 'lucide-react'

const nav = [
  { label: 'Dashboard', href: '/', icon: LayoutGrid },
  { label: 'Produkte', href: '/products', icon: Package },
  { label: 'Verlauf', href: '/history', icon: Clock },
  { label: 'Einstellungen', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      width: 220, minHeight: '100vh',
      background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/brudi.png" alt="BSI Broadcast" width={34} height={34} style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.2 }}>BSI Broadcast</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.2 }}>WID Monitor</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 10px 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Navigation
        </div>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 10px', borderRadius: 7, fontSize: 14, fontWeight: 500,
              color: active ? 'var(--blue)' : 'var(--text-secondary)',
              background: active ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
              textDecoration: 'none', transition: 'all 0.12s ease', marginBottom: 2,
            }}>
              <Icon size={15} style={{ color: active ? 'var(--blue)' : 'var(--text-muted)', flexShrink: 0 }} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
        <a href="https://wid.cert-bund.de" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
          BSI WID ↗
        </a>
      </div>
    </aside>
  )
}
