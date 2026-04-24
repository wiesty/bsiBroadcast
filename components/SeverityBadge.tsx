const LABELS: Record<string, string> = {
  kritisch: 'Kritisch',
  hoch: 'Hoch',
  mittel: 'Mittel',
  niedrig: 'Niedrig',
}

export default function SeverityBadge({ severity }: { severity: string | null }) {
  const key = severity ?? 'unknown'
  return (
    <span
      className={`badge-${LABELS[key] ? key : 'unknown'}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 100,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}
    >
      {LABELS[key] ?? 'Unbekannt'}
    </span>
  )
}
