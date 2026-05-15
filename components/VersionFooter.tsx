'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'

interface UpdateInfo {
  currentVersion: string
  currentTag: string
  status: 'ok' | 'unavailable' | 'error'
  updateAvailable: boolean
  latest: {
    latestVersion: string
    latestTag: string
    latestUrl: string
    latestName: string
    source: 'release' | 'tag'
  } | null
}

const fallbackVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'

export default function VersionFooter() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [checking, setChecking] = useState(false)

  const checkForUpdates = useCallback(async () => {
    setChecking(true)
    try {
      const response = await fetch('/api/version', { cache: 'no-store' })
      if (!response.ok) throw new Error('Update check failed')
      setUpdateInfo(await response.json())
    } catch {
      setUpdateInfo((current) => ({
        currentVersion: current?.currentVersion ?? fallbackVersion,
        currentTag: current?.currentTag ?? `v${fallbackVersion}`,
        status: 'error',
        updateAvailable: false,
        latest: current?.latest ?? null,
      }))
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void checkForUpdates() }, 0)
    return () => window.clearTimeout(timer)
  }, [checkForUpdates])

  const currentVersion = updateInfo?.currentVersion ?? fallbackVersion
  const latest = updateInfo?.latest

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          v{currentVersion}
        </span>
        <button
          type="button"
          title="Nach Updates suchen"
          aria-label="Nach Updates suchen"
          onClick={() => { void checkForUpdates() }}
          disabled={checking}
          style={{
            width: 24,
            height: 24,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: checking ? 'var(--blue)' : 'var(--text-muted)',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 6,
            cursor: checking ? 'default' : 'pointer',
          }}
        >
          <RefreshCw size={13} className={checking ? 'spin' : undefined} />
        </button>
      </div>

      {updateInfo?.updateAvailable && latest ? (
        <a
          href={latest.latestUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            color: 'var(--green)',
            textDecoration: 'none',
          }}
        >
          Update {latest.latestTag}
          <ExternalLink size={12} />
        </a>
      ) : (
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {updateInfo?.status === 'error' ? 'Update-Check nicht erreichbar' : 'Aktuell'}
        </span>
      )}
    </div>
  )
}
