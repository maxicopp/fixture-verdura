'use client'

export default function Stats({ fixture, standings }) {
  const allMatches = fixture.flatMap(r => r.matches).filter(m => m.played)
  const totalGoals = allMatches.reduce((acc, m) => acc + m.homeGoals + m.awayGoals, 0)
  const totalMatches = allMatches.length

  const topScorer = standings.length > 0 ? [...standings].sort((a, b) => b.gf - a.gf)[0] : null
  const bestDefense = standings.length > 0 ? [...standings].sort((a, b) => a.gc - b.gc)[0] : null

  let biggestWin = null
  allMatches.forEach(m => {
    const diff = Math.abs(m.homeGoals - m.awayGoals)
    if (!biggestWin || diff > biggestWin.diff) {
      biggestWin = { ...m, diff }
    }
  })

  let mostGoals = null
  allMatches.forEach(m => {
    const total = m.homeGoals + m.awayGoals
    if (!mostGoals || total > mostGoals.total) {
      mostGoals = { ...m, total }
    }
  })

  const streaks = {}
  standings.forEach(s => { streaks[s.name] = { current: 0, max: 0 } })
  fixture.forEach(round => {
    round.matches.forEach(m => {
      if (!m.played) return
      if (m.homeGoals >= m.awayGoals) {
        streaks[m.home].current++
        streaks[m.home].max = Math.max(streaks[m.home].max, streaks[m.home].current)
      } else {
        streaks[m.home].current = 0
      }
      if (m.awayGoals >= m.homeGoals) {
        streaks[m.away].current++
        streaks[m.away].max = Math.max(streaks[m.away].max, streaks[m.away].current)
      } else {
        streaks[m.away].current = 0
      }
    })
  })
  const bestStreak = Object.entries(streaks).sort((a, b) => b[1].max - a[1].max)[0]
  const draws = allMatches.filter(m => m.homeGoals === m.awayGoals).length

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
          <div className="stat-sub">{draws} empates ({totalMatches > 0 ? Math.round(draws/totalMatches*100) : 0}%)</div>
        </div>
        {topScorer && topScorer.gf > 0 && (
          <div className="stat-card highlight">
            <div className="stat-icon">👑</div>
            <div className="stat-value">{topScorer.name}</div>
            <div className="stat-label">Goleador</div>
            <div className="stat-sub">{topScorer.gf} goles</div>
          </div>
        )}
        {bestDefense && bestDefense.pj > 0 && (
          <div className="stat-card">
            <div className="stat-icon">🧤</div>
            <div className="stat-value">{bestDefense.name}</div>
            <div className="stat-label">Mejor defensa</div>
            <div className="stat-sub">{bestDefense.gc} goles recibidos</div>
          </div>
        )}
        {biggestWin && biggestWin.diff > 0 && (
          <div className="stat-card">
            <div className="stat-icon">💥</div>
            <div className="stat-value">{biggestWin.home} {biggestWin.homeGoals}-{biggestWin.awayGoals} {biggestWin.away}</div>
            <div className="stat-label">Mayor goleada</div>
            <div className="stat-sub">{biggestWin.diff} goles de diferencia</div>
          </div>
        )}
        {mostGoals && (
          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-value">{mostGoals.home} {mostGoals.homeGoals}-{mostGoals.awayGoals} {mostGoals.away}</div>
            <div className="stat-label">Más goles en un partido</div>
            <div className="stat-sub">{mostGoals.total} goles totales</div>
          </div>
        )}
        {bestStreak && bestStreak[1].max > 0 && (
          <div className="stat-card">
            <div className="stat-icon">🏃</div>
            <div className="stat-value">{bestStreak[0]}</div>
            <div className="stat-label">Mejor racha invicta</div>
            <div className="stat-sub">{bestStreak[1].max} partidos sin perder</div>
          </div>
        )}
      </div>

      <h3>📈 Goles por jugador</h3>
      <div className="goals-chart">
        {[...standings].sort((a, b) => b.gf - a.gf).map(s => (
          <div key={s.name} className="chart-row">
            <span className="chart-label">{s.name}</span>
            <div className="chart-bar-container">
              <div
                className="chart-bar"
                style={{ width: `${standings[0]?.gf > 0 ? (s.gf / Math.max(...standings.map(x => x.gf))) * 100 : 0}%` }}
              />
              <span className="chart-value">{s.gf}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
