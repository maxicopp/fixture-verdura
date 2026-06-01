'use client'

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'

// ─── helpers ────────────────────────────────────────────────────────────────

function getPlayerStats(name, fixture) {
  const results = []
  fixture.forEach(r => r.matches.forEach(m => {
    if (!m.played) return
    if (m.home === name) results.push({ gf: m.homeGoals, gc: m.awayGoals, isHome: true })
    if (m.away === name) results.push({ gf: m.awayGoals, gc: m.homeGoals, isHome: false })
  }))
  return results
}

function getResult(r) {
  return r.gf > r.gc ? 'G' : r.gf < r.gc ? 'P' : 'E'
}

const PLAYER_COLORS = {
  Max:     '#818cf8', // indigo-400
  Gayco:   '#fbbf24', // amber-400
  Vulvega: '#34d399', // emerald-400
  Nacho:   '#f87171', // red-400
  Kevin:   '#60a5fa', // blue-400
  Negro:   '#a78bfa', // violet-400
}
const DEFAULT_COLOR = '#94a3b8'
const getColor = (name) => PLAYER_COLORS[name] ?? DEFAULT_COLOR

// ─── form health (PES-style) ─────────────────────────────────────────────────

/**
 * Calcula la "salud" del jugador en base a sus últimos 3 resultados.
 * Devuelve: { arrow, label, color, score }
 *   ⇈  Excelente  (verde vivo)
 *   ↑  Bien        (verde)
 *   →  Regular     (amarillo)
 *   ↓  Mal         (naranja)
 *   ⇊  Pésimo      (rojo)
 */
function calcHealth(results) {
  if (results.length === 0) return { arrow: '—', label: 'Sin datos', color: '#475569', score: -1 }
  const last3 = results.slice(-3)
  // Pesos: el partido más reciente vale más
  const weights = [1, 1.5, 2]
  let score = 0
  let maxScore = 0
  last3.forEach((r, i) => {
    const w = weights[i + (3 - last3.length)]
    const pts = r.gf > r.gc ? 3 : r.gf === r.gc ? 1 : 0
    score    += pts * w
    maxScore += 3 * w
  })
  const pct = score / maxScore // 0-1

  if (pct >= 0.85) return { arrow: '⇈', label: 'Excelente',  color: '#4ade80', score: pct }
  if (pct >= 0.6)  return { arrow: '↑', label: 'Bien',       color: '#86efac', score: pct }
  if (pct >= 0.35) return { arrow: '→', label: 'Regular',    color: '#fbbf24', score: pct }
  if (pct >= 0.15) return { arrow: '↓', label: 'Mal',        color: '#fb923c', score: pct }
  return               { arrow: '⇊', label: 'Pésimo',     color: '#f87171', score: pct }
}

function HealthBadge({ health, size = 'md' }) {
  const isSmall = size === 'sm'
  return (
    <div className={`health-badge ${isSmall ? 'health-badge-sm' : ''}`} title={health.label}>
      <span className="health-arrow" style={{ color: health.color }}>{health.arrow}</span>
      {!isSmall && <span className="health-label" style={{ color: health.color }}>{health.label}</span>}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 13,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      minWidth: 140,
    }}>
      <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '3px 0' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: '#cbd5e1', flex: 1 }}>{p.name}</span>
          <strong style={{ color: '#f1f5f9' }}>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

// ─── section heading ─────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <div className="section-title">
      <span className="section-title-text">{children}</span>
    </div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

export default function Stats({ fixture, standings, disabledPlayers = [] }) {
  const isDisabled = (name) => disabledPlayers.includes(name)
  const allMatches = fixture.flatMap(r => r.matches).filter(m => m.played)
  const totalGoals = allMatches.reduce((acc, m) => acc + m.homeGoals + m.awayGoals, 0)
  const totalMatches = allMatches.length
  const draws = allMatches.filter(m => m.homeGoals === m.awayGoals).length

  const topScorer = standings.length > 0 ? [...standings].sort((a, b) => b.gf - a.gf)[0] : null
  const bestDefense = standings.length > 0 ? [...standings].sort((a, b) => a.gc - b.gc)[0] : null

  let biggestWin = null
  allMatches.forEach(m => {
    const diff = Math.abs(m.homeGoals - m.awayGoals)
    if (!biggestWin || diff > biggestWin.diff) biggestWin = { ...m, diff }
  })

  const players = standings.map(s => s.name)

  // Per-player stats
  const playerData = players.map(name => {
    const results = getPlayerStats(name, fixture)
    const home = results.filter(r => r.isHome)
    const away = results.filter(r => !r.isHome)
    const recent = results.slice(-5).map(getResult)
    const wins = results.filter(r => r.gf > r.gc).length
    const losses = results.filter(r => r.gf < r.gc).length
    const drawsP = results.filter(r => r.gf === r.gc).length
    const winRate = results.length > 0 ? Math.round((wins / results.length) * 100) : 0
    const totalGf = results.reduce((a, r) => a + r.gf, 0)
    const totalGc = results.reduce((a, r) => a + r.gc, 0)
    const homeWins = home.filter(r => r.gf > r.gc).length
    const awayWins = away.filter(r => r.gf > r.gc).length
    const health   = calcHealth(results)
    return { name, results, recent, winRate, wins, losses, draws: drawsP, totalGf, totalGc, home, away, homeWins, awayWins, health }
  })

  // ── Chart data ──────────────────────────────────────────────────────────────

  // 1. Goles a favor vs en contra (BarChart agrupado)
  const goalsBarData = [...standings]
    .sort((a, b) => b.gf - a.gf)
    .map(s => ({ name: s.name, 'A favor': s.gf, 'En contra': s.gc, Diferencia: s.gf - s.gc }))

  // 2. Puntos acumulados por jornada (LineChart)
  const roundsPlayed = fixture.filter(r => r.matches.some(m => m.played))
  const cumulativeData = roundsPlayed.map((round, ri) => {
    const entry = { jornada: `J${round.round}` }
    players.forEach(name => {
      let pts = 0
      for (let i = 0; i <= ri; i++) {
        fixture[i].matches.forEach(m => {
          if (!m.played) return
          if (m.home === name) pts += m.homeGoals > m.awayGoals ? 3 : m.homeGoals === m.awayGoals ? 1 : 0
          if (m.away === name) pts += m.awayGoals > m.homeGoals ? 3 : m.homeGoals === m.awayGoals ? 1 : 0
        })
      }
      entry[name] = pts
    })
    return entry
  })

  // 3. Radar de rendimiento (normalizado 0-100)
  const maxGf = Math.max(...playerData.map(p => p.totalGf), 1)
  const radarData = [
    { stat: 'Goles', ...Object.fromEntries(playerData.map(p => [p.name, Math.round((p.totalGf / maxGf) * 100)])) },
    { stat: '% Victorias', ...Object.fromEntries(playerData.map(p => [p.name, p.winRate])) },
    { stat: 'Local', ...Object.fromEntries(playerData.map(p => [p.name, p.home.length > 0 ? Math.round((p.homeWins / p.home.length) * 100) : 0])) },
    { stat: 'Visitante', ...Object.fromEntries(playerData.map(p => [p.name, p.away.length > 0 ? Math.round((p.awayWins / p.away.length) * 100) : 0])) },
    { stat: 'Defensa', ...Object.fromEntries(playerData.map(p => { const maxGc = Math.max(...playerData.map(x => x.totalGc), 1); return [p.name, Math.round((1 - p.totalGc / maxGc) * 100)] })) },
  ]

  // 4. Distribución G/E/P por jugador (BarChart apilado)
  const resultDistData = playerData.map(p => ({
    name: p.name,
    Victorias: p.wins,
    Empates: p.draws,
    Derrotas: p.losses,
  }))

  // 5. Goles por jornada (quién metió en cada fecha)
  const goalsPerRound = roundsPlayed.map(round => {
    const entry = { jornada: `J${round.round}` }
    players.forEach(name => {
      let g = 0
      round.matches.forEach(m => {
        if (!m.played) return
        if (m.home === name) g += m.homeGoals
        if (m.away === name) g += m.awayGoals
      })
      entry[name] = g
    })
    return entry
  })

  // Head to head matrix
  const h2h = {}
  players.forEach(a => { h2h[a] = {}; players.forEach(b => { h2h[a][b] = { g: 0, e: 0, p: 0 } }) })
  allMatches.forEach(m => {
    const diff = m.homeGoals - m.awayGoals
    if (diff > 0) { h2h[m.home][m.away].g++; h2h[m.away][m.home].p++ }
    else if (diff < 0) { h2h[m.home][m.away].p++; h2h[m.away][m.home].g++ }
    else { h2h[m.home][m.away].e++; h2h[m.away][m.home].e++ }
  })

  if (totalMatches === 0) {
    return (
      <div className="stats">
        <h2>📊 Estadísticas</h2>
        <p className="no-data">Todavía no hay partidos jugados. ¡Cargá resultados en el fixture!</p>
      </div>
    )
  }

  return (
    <div className="stats">
      <h2>📊 Estadísticas del Torneo</h2>

      {/* ── KPIs ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">⚽</div>
          <div className="stat-value">{totalGoals}</div>
          <div className="stat-label">Goles totales</div>
          <div className="stat-sub">{(totalGoals / totalMatches).toFixed(1)} por partido</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-value">{totalMatches}</div>
          <div className="stat-label">Partidos jugados</div>
          <div className="stat-sub">{draws} empates ({Math.round(draws / totalMatches * 100)}%)</div>
        </div>
        {topScorer?.gf > 0 && (
          <div className={`stat-card highlight ${isDisabled(topScorer.name) ? 'stat-card-disabled' : ''}`}>
            <div className="stat-icon">👑</div>
            <img src={`/players/${topScorer.name.toLowerCase()}.png`} alt={topScorer.name} className={`stat-avatar ${isDisabled(topScorer.name) ? 'avatar-disabled' : ''}`} />
            <div className="stat-value">{topScorer.name}</div>
            <div className="stat-label">Goleador</div>
            <div className="stat-sub">{topScorer.gf} goles · {(topScorer.gf / Math.max(topScorer.pj, 1)).toFixed(1)} por partido</div>
          </div>
        )}
        {bestDefense?.pj > 0 && (
          <div className={`stat-card ${isDisabled(bestDefense.name) ? 'stat-card-disabled' : ''}`}>
            <div className="stat-icon">🧤</div>
            <img src={`/players/${bestDefense.name.toLowerCase()}.png`} alt={bestDefense.name} className={`stat-avatar ${isDisabled(bestDefense.name) ? 'avatar-disabled' : ''}`} />
            <div className="stat-value">{bestDefense.name}</div>
            <div className="stat-label">Mejor defensa</div>
            <div className="stat-sub">{bestDefense.gc} recibidos · {(bestDefense.gc / Math.max(bestDefense.pj, 1)).toFixed(1)} por partido</div>
          </div>
        )}
        {biggestWin?.diff > 0 && (
          <div className={`stat-card ${(isDisabled(biggestWin.home) || isDisabled(biggestWin.away)) ? 'stat-card-disabled' : ''}`}>
            <div className="stat-icon">💥</div>
            <div className="stat-value">{biggestWin.homeGoals}-{biggestWin.awayGoals}</div>
            <div className="stat-label">Mayor goleada</div>
            <div className="stat-sub">
              <span className={isDisabled(biggestWin.home) ? 'player-disabled' : ''}>{biggestWin.home}</span>
              {' vs '}
              <span className={isDisabled(biggestWin.away) ? 'player-disabled' : ''}>{biggestWin.away}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Salud del equipo (PES-style) ── */}
      <SectionTitle>💊 Salud del equipo</SectionTitle>
      <div className="health-grid">
        {playerData.map(p => {
          const h = p.health
          return (
            <div
              key={p.name}
              className={`health-card ${isDisabled(p.name) ? 'perf-card-disabled' : ''}`}
              style={{ '--hc': h.color }}
            >
              <img
                src={`/players/${p.name.toLowerCase()}.png`}
                alt={p.name}
                className={`health-avatar ${isDisabled(p.name) ? 'avatar-disabled' : ''}`}
              />
              <div className="health-info">
                <span className={`health-name ${isDisabled(p.name) ? 'player-disabled' : ''}`}>{p.name}</span>
                <span className="health-sublabel">Últimos 3 partidos</span>
              </div>
              <div className="health-right">
                {h.score >= 0 && (
                  <div className="health-bar-wrap">
                    <div className="health-bar-track">
                      <div
                        className="health-bar-fill"
                        style={{ width: `${Math.round(h.score * 100)}%`, background: h.color }}
                      />
                    </div>
                  </div>
                )}
                <div className="health-arrow-big" style={{ color: h.color }}>
                  {h.arrow}
                </div>
                <span className="health-status" style={{ color: h.color }}>{h.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── 1. Goles a favor vs en contra ── */}
      <SectionTitle>⚽ Goles a favor, en contra y diferencia</SectionTitle>
      <div className="chart-card">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={goalsBarData} margin={{ top: 8, right: 20, left: -10, bottom: 0 }} barGap={3} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
            <Bar dataKey="A favor"    fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="En contra"  fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Diferencia" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── 2. Puntos acumulados por jornada ── */}
      <SectionTitle>📈 Puntos acumulados por jornada</SectionTitle>
      <div className="chart-card">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={cumulativeData} margin={{ top: 8, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis dataKey="jornada" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
            {players.map(name => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={getColor(name)}
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: getColor(name), strokeWidth: 0 }}
                activeDot={{ r: 5.5, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── 3. Goles anotados por jornada ── */}
      <SectionTitle>🔥 Goles anotados por jornada</SectionTitle>
      <div className="chart-card">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={goalsPerRound} margin={{ top: 8, right: 20, left: -10, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis dataKey="jornada" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
            {players.map(name => (
              <Bar key={name} dataKey={name} stackId="a" fill={getColor(name)} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── 4. Distribución G/E/P ── */}
      <SectionTitle>🏆 Victorias, empates y derrotas</SectionTitle>
      <div className="chart-card">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={resultDistData} margin={{ top: 8, right: 20, left: -10, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
            <Bar dataKey="Victorias" stackId="r" fill="#34d399" />
            <Bar dataKey="Empates"   stackId="r" fill="#fbbf24" />
            <Bar dataKey="Derrotas"  stackId="r" fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── 5. Radar de rendimiento ── */}
      <SectionTitle>🕸️ Radar de rendimiento</SectionTitle>
      <div className="chart-card">
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={radarData} margin={{ top: 16, right: 40, left: 40, bottom: 16 }}>
            <PolarGrid stroke="rgba(148,163,184,0.18)" />
            <PolarAngleAxis dataKey="stat" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} tickCount={4} />
            {players.map(name => (
              <Radar
                key={name}
                name={name}
                dataKey={name}
                stroke={getColor(name)}
                fill={getColor(name)}
                fillOpacity={0.12}
                strokeWidth={2}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Forma reciente + rendimiento local/visitante ── */}
      <SectionTitle>📋 Rendimiento por jugador</SectionTitle>
      <div className="player-perf-grid">
        {playerData.map(p => (
          <div key={p.name} className={`player-perf-card ${isDisabled(p.name) ? 'perf-card-disabled' : ''}`}>
            <div className="perf-header">
              <img src={`/players/${p.name.toLowerCase()}.png`} alt={p.name} className={`avatar ${isDisabled(p.name) ? 'avatar-disabled' : ''}`} />
              <span className={`perf-name ${isDisabled(p.name) ? 'player-disabled' : ''}`}>{p.name}</span>
              <HealthBadge health={p.health} size="sm" />
              {isDisabled(p.name)
                ? <span className="disabled-tag">inactivo</span>
                : <span className="win-rate" style={{ color: p.winRate >= 50 ? 'var(--success)' : 'var(--danger)' }}>
                    {p.winRate}% victorias
                  </span>
              }
            </div>
            <div className="perf-form">
              <span className="perf-form-label">Forma</span>
              {p.recent.length === 0
                ? <span className="no-form">—</span>
                : p.recent.map((r, i) => (
                  <span key={i} className={`form-badge form-${r}`}>{r}</span>
                ))
              }
            </div>
            <div className="perf-avg">
              <span>⚽ {p.totalGf} GF</span>
              <span>🛡 {p.totalGc} GC</span>
            </div>
            <div className="home-away">
              <div className="ha-item">
                <span className="ha-label">🏠 Local</span>
                <span className="ha-val">{p.homeWins}G / {p.home.filter(r => r.gf === r.gc).length}E / {p.home.filter(r => r.gf < r.gc).length}P</span>
              </div>
              <div className="ha-item">
                <span className="ha-label">✈️ Visitante</span>
                <span className="ha-val">{p.awayWins}G / {p.away.filter(r => r.gf === r.gc).length}E / {p.away.filter(r => r.gf < r.gc).length}P</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Head to head ── */}
      <SectionTitle>⚔️ Historial directo</SectionTitle>
      <div className="h2h-wrapper">
        <table className="h2h-table">
          <thead>
            <tr>
              <th></th>
              {players.map(p => (
                <th key={p} className={isDisabled(p) ? 'h2h-col-disabled' : ''}>
                  <img src={`/players/${p.toLowerCase()}.png`} alt={p} className={`h2h-avatar ${isDisabled(p) ? 'avatar-disabled' : ''}`} title={p} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map(a => (
              <tr key={a} className={isDisabled(a) ? 'row-disabled' : ''}>
                <td className="h2h-row-label">
                  <img src={`/players/${a.toLowerCase()}.png`} alt={a} className={`h2h-avatar ${isDisabled(a) ? 'avatar-disabled' : ''}`} />
                  <span className={isDisabled(a) ? 'player-disabled' : ''}>{a}</span>
                </td>
                {players.map(b => {
                  if (a === b) return <td key={b} className="h2h-cell h2h-self">—</td>
                  const r = h2h[a][b]
                  const played = r.g + r.e + r.p
                  if (played === 0) return <td key={b} className={`h2h-cell h2h-empty ${isDisabled(b) ? 'h2h-col-disabled' : ''}`}>·</td>
                  const balance = r.g - r.p
                  const cls = (isDisabled(a) || isDisabled(b)) ? '' : balance > 0 ? 'h2h-G' : balance < 0 ? 'h2h-P' : 'h2h-E'
                  return (
                    <td key={b} className={`h2h-cell ${cls} ${(isDisabled(a) || isDisabled(b)) ? 'h2h-col-disabled' : ''}`}>
                      {balance > 0 ? `+${balance}` : balance}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
