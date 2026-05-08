'use client'

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

export default function Stats({ fixture, standings }) {
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

  // Head to head matrix — acumula todos los enfrentamientos jugados
  const players = standings.map(s => s.name)
  const h2h = {}
  players.forEach(a => {
    h2h[a] = {}
    players.forEach(b => { h2h[a][b] = { g: 0, e: 0, p: 0 } })
  })
  allMatches.forEach(m => {
    const diff = m.homeGoals - m.awayGoals
    if (diff > 0) { h2h[m.home][m.away].g++; h2h[m.away][m.home].p++ }
    else if (diff < 0) { h2h[m.home][m.away].p++; h2h[m.away][m.home].g++ }
    else { h2h[m.home][m.away].e++; h2h[m.away][m.home].e++ }
  })
  // balance = g - p

  // Per-player stats
  const playerData = players.map(name => {
    const results = getPlayerStats(name, fixture)
    const home = results.filter(r => r.isHome)
    const away = results.filter(r => !r.isHome)
    const recent = results.slice(-5).map(getResult)
    const wins = results.filter(r => r.gf > r.gc).length
    const winRate = results.length > 0 ? Math.round((wins / results.length) * 100) : 0
    const totalGf = results.reduce((a, r) => a + r.gf, 0)
    const totalGc = results.reduce((a, r) => a + r.gc, 0)
    const homeWins = home.filter(r => r.gf > r.gc).length
    const awayWins = away.filter(r => r.gf > r.gc).length
    return { name, results, recent, winRate, totalGf, totalGc, home, away, homeWins, awayWins }
  })

  const maxGf = Math.max(...standings.map(s => s.gf), 1)
  const maxGc = Math.max(...standings.map(s => s.gc), 1)

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

      {/* KPIs */}
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
          <div className="stat-card highlight">
            <div className="stat-icon">👑</div>
            <img src={`/players/${topScorer.name.toLowerCase()}.png`} alt={topScorer.name} className="stat-avatar" />
            <div className="stat-value">{topScorer.name}</div>
            <div className="stat-label">Goleador</div>
            <div className="stat-sub">{topScorer.gf} goles · {(topScorer.gf / Math.max(topScorer.pj, 1)).toFixed(1)} por partido</div>
          </div>
        )}
        {bestDefense?.pj > 0 && (
          <div className="stat-card">
            <div className="stat-icon">🧤</div>
            <img src={`/players/${bestDefense.name.toLowerCase()}.png`} alt={bestDefense.name} className="stat-avatar" />
            <div className="stat-value">{bestDefense.name}</div>
            <div className="stat-label">Mejor defensa</div>
            <div className="stat-sub">{bestDefense.gc} recibidos · {(bestDefense.gc / Math.max(bestDefense.pj, 1)).toFixed(1)} por partido</div>
          </div>
        )}
        {biggestWin?.diff > 0 && (
          <div className="stat-card">
            <div className="stat-icon">💥</div>
            <div className="stat-value">{biggestWin.homeGoals}-{biggestWin.awayGoals}</div>
            <div className="stat-label">Mayor goleada</div>
            <div className="stat-sub">{biggestWin.home} vs {biggestWin.away}</div>
          </div>
        )}
      </div>

      {/* Goles a favor y en contra */}
      <h3>⚽ Goles a favor y en contra</h3>
      <div className="double-chart">
        {[...standings].sort((a, b) => b.gf - a.gf).map(s => (
          <div key={s.name} className="double-chart-row">
            <div className="double-chart-name">
              <img src={`/players/${s.name.toLowerCase()}.png`} alt={s.name} className="avatar" />
              {s.name}
            </div>
            <div className="double-chart-bars">
              <div className="bar-wrap">
                <div className="bar bar-gf" style={{ width: `${(s.gf / maxGf) * 100}%` }} />
                <span className="bar-val">{s.gf}</span>
              </div>
              <div className="bar-wrap">
                <div className="bar bar-gc" style={{ width: `${(s.gc / maxGc) * 100}%` }} />
                <span className="bar-val gc">{s.gc}</span>
              </div>
            </div>
          </div>
        ))}
        <div className="double-chart-legend">
          <span><span className="legend-dot gf" />Goles a favor</span>
          <span><span className="legend-dot gc" />Goles en contra</span>
        </div>
      </div>

      {/* Forma reciente + rendimiento local/visitante */}
      <h3>📋 Rendimiento por jugador</h3>
      <div className="player-perf-grid">
        {playerData.map(p => (
          <div key={p.name} className="player-perf-card">
            <div className="perf-header">
              <img src={`/players/${p.name.toLowerCase()}.png`} alt={p.name} className="avatar" />
              <span className="perf-name">{p.name}</span>
              <span className="win-rate" style={{ color: p.winRate >= 50 ? 'var(--success)' : 'var(--danger)' }}>
                {p.winRate}% victorias
              </span>
            </div>
            <div className="perf-form">
              <span className="perf-form-label">Forma</span>
              {p.recent.length === 0
                ? <span className="no-form">—</span>
                : p.recent.map((r, i) => (
                  <span key={i} className={`form-badge form-${r}`}>{r === 'G' ? 'G' : r === 'P' ? 'P' : 'E'}</span>
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

      {/* Head to head */}
      <h3>⚔️ Historial directo</h3>
      <div className="h2h-wrapper">
        <table className="h2h-table">
          <thead>
            <tr>
              <th></th>
              {players.map(p => (
                <th key={p}>
                  <img src={`/players/${p.toLowerCase()}.png`} alt={p} className="h2h-avatar" title={p} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map(a => (
              <tr key={a}>
                <td className="h2h-row-label">
                  <img src={`/players/${a.toLowerCase()}.png`} alt={a} className="h2h-avatar" />
                  <span>{a}</span>
                </td>
                {players.map(b => {
                  if (a === b) return <td key={b} className="h2h-cell h2h-self">—</td>
                  const r = h2h[a][b]
                  const played = r.g + r.e + r.p
                  if (played === 0) return <td key={b} className="h2h-cell h2h-empty">·</td>
                  const balance = r.g - r.p
                  const cls = balance > 0 ? 'h2h-G' : balance < 0 ? 'h2h-P' : 'h2h-E'
                  return (
                    <td key={b} className={`h2h-cell ${cls}`}>
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
