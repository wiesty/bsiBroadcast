import { db, advisories } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SeverityBadge from '@/components/SeverityBadge'
import { fetchAdvisoryContent } from '@/lib/bsi/api'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const [advisory] = await db.select().from(advisories).where(eq(advisories.uuid, id)).limit(1)
  return { title: advisory ? `${advisory.name} — BSI Broadcast` : 'Advisory nicht gefunden' }
}

export default async function AdvisoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [advisory] = await db.select().from(advisories).where(eq(advisories.uuid, id)).limit(1)
  const content = await fetchAdvisoryContent(advisory.name)

  const bsiUrl = `https://wid.cert-bund.de/portal/wid/securityadvisory?name=${advisory.name}`
  const score = content?.scores?.[0]

  const basescore = score?.basescore ?? advisory.basescore
  const temporalscore = score?.temporalscore ?? advisory.temporalscore

  function fmtDate(s: string | Date | null | undefined) {
    if (!s) return '—'
    return new Date(s).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  }
  function fmtDateTime(s: string | Date | null | undefined) {
    if (!s) return '—'
    return new Date(s).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const DAMAGE_LABELS: Record<number, string> = { 1: 'Gering', 2: 'Mittel', 3: 'Hoch', 4: 'Sehr hoch' }
  const PROB_LABELS: Record<number, string> = { 1: 'Gering', 2: 'Mittel', 3: 'Hoch', 4: 'Sehr hoch' }
  const DAMAGE_COLORS: Record<number, string> = { 1: '#22c55e', 2: '#eab308', 3: '#f97316', 4: '#ef4444' }

  return (
    <div className="page-shell detail-shell" style={{ padding: '32px 36px', maxWidth: 960 }}>
      {/* Back */}
      <Link href="/" className="btn-ghost" style={{ marginBottom: 20, display: 'inline-flex' }}>
        <BackIcon /> Zurück
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <SeverityBadge severity={advisory.classification} />
          {advisory.noPatch && <Pill color="red">Kein Patch</Pill>}
          {content?.remotelyExploitable && <Pill color="orange">Remote ausnutzbar</Pill>}
          {advisory.status && (
            <span className="mono" style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 4,
              background: 'var(--bg-tertiary)', color: advisory.status === 'NEU' ? 'var(--blue)' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}>
              {advisory.status}
            </span>
          )}
          {content?.updatetype && content.updatetype !== advisory.status && (
            <span className="mono" style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 4,
              background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}>
              {content.updatetype}
            </span>
          )}
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.35, margin: 0, letterSpacing: '-0.02em' }}>
          {advisory.title}
        </h1>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="mono" style={{ fontSize: 13, color: 'var(--blue)' }}>{advisory.name}</span>
          <span style={{ color: 'var(--border-strong)', fontSize: 13 }}>·</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Veröffentlicht {fmtDate(content?.initialreleasedate ?? advisory.published)}
          </span>
          {content?.currentreleasedate && content.currentreleasedate !== content.initialreleasedate && (
            <>
              <span style={{ color: 'var(--border-strong)', fontSize: 13 }}>·</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Aktualisiert {fmtDate(content.currentreleasedate)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Score Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
        {basescore != null && (
          <ScoreCard label="CVSS Basescore" value={basescore / 10} display={String(basescore / 10)} color={scoreColor(basescore / 10)} />
        )}
        {temporalscore != null && temporalscore > 0 && (
          <ScoreCard label="Temporal Score" value={temporalscore / 10} display={String(temporalscore / 10)} color={scoreColor(temporalscore / 10)} />
        )}
        {content?.damage != null && (
          <ScoreCard
            label="Schadenspotential"
            display={DAMAGE_LABELS[content.damage] ?? String(content.damage)}
            color={DAMAGE_COLORS[content.damage] ?? 'var(--text-muted)'}
            bar={content.damage / 4}
          />
        )}
        {content?.probability != null && (
          <ScoreCard
            label="Wahrscheinlichkeit"
            display={PROB_LABELS[content.probability] ?? String(content.probability)}
            color={DAMAGE_COLORS[content.probability] ?? 'var(--text-muted)'}
            bar={content.probability / 4}
          />
        )}
        <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            BSI WID
          </div>
          <a href={bsiUrl} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ width: 'fit-content', fontSize: 13 }}>
            Originalseite ↗
          </a>
        </div>
      </div>

      {/* Description */}
      {content?.description && (
        <Section title="Beschreibung">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
            {content.description}
          </p>
        </Section>
      )}

      {/* Product Description */}
      {content?.productdescription && (
        <Section title="Über das Produkt">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
            {content.productdescription}
          </p>
        </Section>
      )}

      {/* Attack Info */}
      {(content?.remotelyExploitable != null || content?.operatingsystems?.length) && (
        <Section title="Angriff">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {content.remotelyExploitable != null && (
              <InfoChip
                label="Angriff von remote"
                value={content.remotelyExploitable ? 'Ja' : 'Nein'}
                color={content.remotelyExploitable ? '#f97316' : '#22c55e'}
              />
            )}
            {content.operatingsystems?.map((os) => (
              <InfoChip key={os} label="Betriebssystem" value={os} color="var(--text-secondary)" />
            ))}
          </div>
        </Section>
      )}

      {/* CVEs */}
      {advisory.cves && advisory.cves.length > 0 && (
        <Section title={`CVEs (${advisory.cves.length})`}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {advisory.cves.map((cve) => (
              <a key={cve} href={`https://nvd.nist.gov/vuln/detail/${cve}`} target="_blank" rel="noopener noreferrer" className="mono cve-tag">
                {cve}
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* Products */}
      {advisory.productNames && advisory.productNames.length > 0 && (
        <Section title={`Betroffene Produkte (${advisory.productNames.length})`}>
          <div className="card" style={{ overflow: 'hidden' }}>
            {advisory.productNames.map((product, i) => (
              <div key={product} style={{
                padding: '10px 16px', fontSize: 14, color: 'var(--text-primary)',
                borderBottom: i < advisory.productNames!.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)', flexShrink: 0 }} />
                {product}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Document References */}
      {content?.documentReferences && content.documentReferences.length > 0 && (
        <Section title={`Externe Referenzen (${content.documentReferences.length})`}>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            ...(content.documentReferences.length > 5 ? {
              maxHeight: 460, overflowY: 'auto', paddingRight: 4,
            } : {}),
          }}>
            {content.documentReferences.map((ref, i) => {
              let domain = ''
              let path = ''
              let anchor = ''
              try {
                const u = new URL(ref.url)
                domain = u.hostname.replace(/^www\./, '')
                path = u.pathname
                anchor = u.hash.replace('#', '').replace(/-subject-/gi, ' ').replace(/-(\d+)-/g, ' ').trim()
              } catch {}
              const title = ref.description.replace(/vom \d{4}-\d{2}-\d{2}$/, '').trim()

              return (
                <a
                  key={i}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="doc-ref-link-card"
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: 1,
                    }}>
                      <ExternalLinkIcon />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {title}
                        </span>
                        <span style={{
                          fontSize: 11, padding: '2px 7px', borderRadius: 100, flexShrink: 0,
                          background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
                          border: '1px solid var(--border)', fontFamily: 'monospace',
                        }}>
                          {domain}
                        </span>
                      </div>
                      {anchor && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', lineHeight: 1.4 }}>
                          {anchor}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        </Section>
      )}

      {/* Revision History */}
      {content?.revisions && content.revisions.length > 0 && (
        <Section title={`Revisionshistorie (${content.revisions.length})`}>
          <div className="card" style={{
            overflow: 'hidden',
            ...(content.revisions.length > 8 ? { maxHeight: 380, overflowY: 'auto' } : {}),
          }}>
            {[...content.revisions].reverse().map((rev, i) => (
              <div key={rev.number} className="revision-row" style={{
                display: 'grid', gridTemplateColumns: '32px 100px 1fr',
                gap: 12, padding: '12px 16px', alignItems: 'start',
                borderBottom: i < content.revisions.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 1 }}>
                  v{rev.number}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 1 }}>
                  {fmtDate(rev.date)}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {rev.description}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Technical Metadata */}
      <Section title="Technische Metadaten">
        <div className="card" style={{ overflow: 'hidden' }}>
          {([
            ['Advisory-ID', advisory.name],
            ['UUID', advisory.uuid],
            ['Schweregrad', advisory.classification ?? '—'],
            ['CVSS Version', score?.version ?? '—'],
            ['Status', advisory.status ?? '—'],
            ['Erstmals veröffentlicht', fmtDateTime(content?.initialreleasedate ?? advisory.published)],
            ['Zuletzt aktualisiert', fmtDateTime(content?.currentreleasedate ?? advisory.updatedAt)],
            ['In DB seit', fmtDateTime(advisory.createdAt)],
          ] as [string, string][]).map(([label, value], i, arr) => (
            <div key={label} className="metadata-row" style={{
              display: 'grid', gridTemplateColumns: '200px 1fr',
              padding: '10px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
              <span className="mono" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{value}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function ScoreCard({ label, display, color, value, bar }: {
  label: string; display: string; color: string; value?: number; bar?: number
}) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: bar != null ? 10 : 0 }}>
        {display}
      </div>
      {bar != null && (
        <div style={{ height: 3, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${bar * 100}%`, height: '100%', background: color, borderRadius: 2 }} />
        </div>
      )}
    </div>
  )
}

function Pill({ children, color }: { children: React.ReactNode; color: 'red' | 'orange' | 'blue' }) {
  const colors = {
    red: { bg: 'rgba(239,68,68,0.12)', text: '#fca5a5', border: 'rgba(239,68,68,0.3)' },
    orange: { bg: 'rgba(249,115,22,0.12)', text: '#fdba74', border: 'rgba(249,115,22,0.3)' },
    blue: { bg: 'rgba(0,122,255,0.1)', text: 'var(--blue)', border: 'rgba(0,122,255,0.25)' },
  }
  const c = colors[color]
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 100,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {children}
    </span>
  )
}

function InfoChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', minWidth: 120,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color }}>{value}</div>
    </div>
  )
}

function scoreColor(score: number): string {
  if (score >= 9) return '#ef4444'
  if (score >= 7) return '#f97316'
  if (score >= 4) return '#eab308'
  return '#22c55e'
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M8.5 11L4 7l4.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: 'var(--text-muted)' }}>
      <path d="M5.5 2.5H2a1 1 0 0 0-1 1V11a1 1 0 0 0 1 1h7.5a1 1 0 0 0 1-1V8M8 1.5h3.5v3.5M11.5 1.5 6 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
