/**
 * Skeleton primitives — reutilizables en toda la app.
 * Todos usan la clase `sk` base + variantes específicas.
 */

// ─── Primitive ───────────────────────────────────────────────────────────────
export function Sk({ className = '', style = {}, rounded = false, circle = false }) {
  const cls = ['sk', rounded ? 'sk-rounded' : '', circle ? 'sk-circle' : '', className]
    .filter(Boolean).join(' ')
  return <span className={cls} style={style} aria-hidden="true" />
}

// ─── Composites ──────────────────────────────────────────────────────────────

/** Row: avatar circle + two lines of text */
export function SkPlayerRow() {
  return (
    <div className="sk-player-row" aria-hidden="true">
      <Sk circle style={{ width: 36, height: 36, flexShrink: 0 }} />
      <div className="sk-player-row-lines">
        <Sk style={{ height: 13, width: '55%' }} rounded />
        <Sk style={{ height: 10, width: '35%', marginTop: 6 }} rounded />
      </div>
    </div>
  )
}

/** Table row */
export function SkTableRow({ cols = 10 }) {
  return (
    <tr aria-hidden="true">
      <td><Sk style={{ height: 12, width: 20 }} rounded /></td>
      <td>
        <div className="sk-player-row sk-player-row-sm">
          <Sk circle style={{ width: 28, height: 28 }} />
          <Sk style={{ height: 12, width: 70 }} rounded />
        </div>
      </td>
      {Array.from({ length: cols - 2 }).map((_, i) => (
        <td key={i}><Sk style={{ height: 12, width: 24 }} rounded /></td>
      ))}
    </tr>
  )
}

/** Chart placeholder */
export function SkChart({ height = 260 }) {
  return (
    <div className="sk-chart" style={{ height }} aria-hidden="true">
      <div className="sk-chart-bars">
        {[60, 85, 45, 70, 55, 90, 40].map((h, i) => (
          <span key={i} className="sk-chart-bar" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

/** KPI card */
export function SkKpiCard() {
  return (
    <div className="sk-kpi-card" aria-hidden="true">
      <Sk circle style={{ width: 32, height: 32, margin: '0 auto 10px' }} />
      <Sk style={{ height: 24, width: '50%', margin: '0 auto 8px' }} rounded />
      <Sk style={{ height: 11, width: '70%', margin: '0 auto 6px' }} rounded />
      <Sk style={{ height: 10, width: '55%', margin: '0 auto' }} rounded />
    </div>
  )
}

/** Section title */
export function SkSectionTitle() {
  return <Sk style={{ height: 14, width: 180, marginBottom: 16 }} rounded aria-hidden="true" />
}

/** Match card in Copa bracket */
export function SkMatchCard() {
  return (
    <div className="sk-match-card" aria-hidden="true">
      <div className="sk-match-slot">
        <Sk circle style={{ width: 20, height: 20 }} />
        <Sk circle style={{ width: 26, height: 26 }} />
        <Sk style={{ height: 12, width: 70, flex: 1 }} rounded />
        <Sk style={{ height: 16, width: 16 }} rounded />
      </div>
      <div className="sk-match-divider" />
      <div className="sk-match-slot">
        <Sk circle style={{ width: 20, height: 20 }} />
        <Sk circle style={{ width: 26, height: 26 }} />
        <Sk style={{ height: 12, width: 60, flex: 1 }} rounded />
        <Sk style={{ height: 16, width: 16 }} rounded />
      </div>
    </div>
  )
}
