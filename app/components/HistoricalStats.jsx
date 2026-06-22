'use client'

import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts'

const PLAYER_COLORS = {
  Max:     '#4f6df5',
  Gayco:   '#d97706',
  Vulvega: '#10b981',
  Nacho:   '#ef6c6c',
  Kevin:   '#6388f8',
  Negro:   '#64748b',
}
const getColor = (name) => PLAYER_COLORS[name] ?? '#9ca3af'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const sorted = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0))
  return (
    <div style={{
      background: 'var(--surface-elevated)',
      border: '1px solid var(--border-strong)',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 13,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      minWidth: 140,
    }}>
      <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      {sorted.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '3px 0' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{p.name}</span>
          <strong style={{ color: 'var(--text)' }}>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

export default function HistoricalStats() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [tournamentDetail, setTournamentDetail] = useState(null)
  const [tournaments, setTournaments] = useState([])

  useEffect(() => {
    Promise.all([
      fetch('/api/historical-stats').then(r => r.json()),
      fetch('/api/tournaments').then(r => r.json()),
    ]).then(([stats, tournamentsList]) => {
      setData(stats)
      setTournaments(tournamentsList)
    }).catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const loadTournamentDetail = (id) => {
    if (selectedTournament === id) {
      setSelectedTournament(null)
      setTournamentDetail(null)
      return
    }
    setSelectedTournament(id)
    fetch(`/api/tournaments/${id}`)
      .then(r => r.json())
      .then(setTournamentDetail)
      .catch(() => setTournamentDetail(null))
  }

  if (loading) {
    return <div className="hall-loading">Cargando estadísticas históricas...</div>
  }

  if (!data) {
    return (
      <div className="hall-empty">
        <span className="hall-empty-icon">📊</span>
        <p>No hay datos históricos disponibles.</p>
      </div>
    )
  }

  const { historicalTable, pointsByTournament, titlesMap, totalTournaments } = data
  const players = historicalTable.map(s => s.name)

  // Puntos acumulados a lo largo de los torneos
  const cumulativePoints = pointsByTournament.map((entry, i) => {
    const cum = { tournament: entry.tournament }
    players.forEach(name => {
      let total = 0
      for (let j = 0; j <= i; j++) {
        total += pointsByTournament[j][name] || 0
      }
      cum[name] = total
    })
    return cum
  })

  return (
    <div className="historical-stats">
      {/* Header */}
      <div className="hist-header">
        <span className="hist-header-icon">📜</span>
        <h2 className="hist-title">Estadísticas Históricas</h2>
        <p className="hist-subtitle">Todos los torneos · Todos los tiempos</p>
      </div>

      {/* Tabla histórica acumulada */}
      <div className="hist-section">
        <h3 className="hist-section-title">
          <span>🏅</span> Tabla Histórica Acumulada
        </h3>
        <p className="hist-section-desc">Puntos totales sumando todos los torneos disputados</p>
        <div className="table-wrapper">
          <table className="hist-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Jugador</th>
                <th>T</th>
                <th>PJ</th>
                <th>PG</th>
                <th>PE</th>
                <th>PP</th>
                <th>GF</th>
                <th>GC</th>
                <th>DG</th>
                <th>PTS</th>
              </tr>
            </thead>
            <tbody>
              {historicalTable.map((s, i) => (
                <tr key={s.name} className={i === 0 ? 'leader' : ''}>
                  <td className="pos">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td className="player-name">
                    <img
                      src={`/players/${s.name.toLowerCase()}.png`}
                      alt={s.name}
                      className="avatar"
                    />
                    <span>{s.name}</span>
                    {titlesMap[s.name] && (
                      <span className="hist-titles-badge">
                        {'⭐'.repeat(titlesMap[s.name])}
                      </span>
                    )}
                  </td>
                  <td className="hist-tournaments-cell">{s.tournaments}</td>
                  <td>{s.pj}</td>
                  <td>{s.pg}</td>
                  <td>{s.pe}</td>
                  <td>{s.pp}</td>
                  <td>{s.gf}</td>
                  <td>{s.gc}</td>
                  <td className={s.gf - s.gc > 0 ? 'positive' : s.gf - s.gc < 0 ? 'negative' : ''}>
                    {s.gf - s.gc > 0 ? '+' : ''}{s.gf - s.gc}
                  </td>
                  <td className="pts">{s.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráfico: Puntos acumulados a lo largo del tiempo */}
      <div className="hist-section">
        <h3 className="hist-section-title">
          <span>📈</span> Evolución de Puntos Histórica
        </h3>
        <p className="hist-section-desc">Puntos acumulados torneo a torneo</p>
        <div className="chart-card">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={cumulativePoints} margin={{ top: 8, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis
                dataKey="tournament"
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
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
                  dot={{ r: 4, fill: getColor(name), strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico: Puntos por torneo (barras) */}
      <div className="hist-section">
        <h3 className="hist-section-title">
          <span>📊</span> Puntos por Torneo
        </h3>
        <p className="hist-section-desc">Rendimiento en cada campeonato individual</p>
        <div className="chart-card">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pointsByTournament} margin={{ top: 8, right: 20, left: -10, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis
                dataKey="tournament"
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
              {players.map(name => (
                <Bar key={name} dataKey={name} fill={getColor(name)} radius={[3, 3, 0, 0]} maxBarSize={22} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Explorador de torneos anteriores */}
      <div className="hist-section">
        <h3 className="hist-section-title">
          <span>🗂️</span> Torneos Anteriores
        </h3>
        <p className="hist-section-desc">Hacé click en un torneo para ver su detalle completo</p>
        <div className="hist-tournaments-list">
          {tournaments.map(t => (
            <div key={t.id} className="hist-tournament-wrapper">
              <button
                className={`hist-tournament-card ${selectedTournament === t.id ? 'hist-tournament-selected' : ''}`}
                onClick={() => loadTournamentDetail(t.id)}
              >
                <div className="hist-tournament-left">
                  <span className="hist-tournament-status">
                    {t.status === 'finished' ? '✅' : '🟢'}
                  </span>
                  <div className="hist-tournament-info">
                    <span className="hist-tournament-season">{t.season} {t.year}</span>
                    <span className="hist-tournament-name">{t.name}</span>
                  </div>
                </div>
                <div className="hist-tournament-right">
                  {t.champion && (
                    <div className="hist-tournament-champion">
                      <img
                        src={`/players/${t.champion.toLowerCase()}.png`}
                        alt={t.champion}
                        className="hist-tournament-avatar"
                      />
                      <span className="hist-tournament-champion-name">🏆 {t.champion}</span>
                    </div>
                  )}
                  {!t.champion && <span className="hist-tournament-active-badge">En curso</span>}
                  <span className="hist-tournament-chevron">
                    {selectedTournament === t.id ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {/* Detalle expandido */}
              {selectedTournament === t.id && tournamentDetail && (
                <TournamentDetail data={tournamentDetail} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Detalle de torneo expandido ─────────────────────────────────────────────

function TournamentDetail({ data }) {
  const { tournament, standings, fixture } = data

  if (!standings || standings.length === 0) {
    return <div className="hist-detail-empty">Sin datos de partidos para este torneo.</div>
  }

  const totalGoals = fixture.reduce((acc, r) =>
    acc + r.matches.filter(m => m.played).reduce((a, m) => a + m.homeGoals + m.awayGoals, 0), 0
  )
  const totalMatches = fixture.reduce((acc, r) => acc + r.matches.filter(m => m.played).length, 0)

  return (
    <div className="hist-detail">
      {/* KPIs del torneo */}
      <div className="hist-detail-kpis">
        <div className="hist-detail-kpi">
          <span className="hist-detail-kpi-val">{totalMatches}</span>
          <span className="hist-detail-kpi-label">Partidos</span>
        </div>
        <div className="hist-detail-kpi">
          <span className="hist-detail-kpi-val">{totalGoals}</span>
          <span className="hist-detail-kpi-label">Goles</span>
        </div>
        <div className="hist-detail-kpi">
          <span className="hist-detail-kpi-val">{totalMatches > 0 ? (totalGoals / totalMatches).toFixed(1) : '0'}</span>
          <span className="hist-detail-kpi-label">Goles/partido</span>
        </div>
        {tournament.top_scorer && (
          <div className="hist-detail-kpi">
            <span className="hist-detail-kpi-val">⚽ {tournament.top_scorer}</span>
            <span className="hist-detail-kpi-label">Goleador ({tournament.top_scorer_goals})</span>
          </div>
        )}
      </div>

      {/* Tabla de posiciones del torneo */}
      <div className="hist-detail-table-wrap">
        <table className="hist-detail-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Jugador</th>
              <th>PJ</th>
              <th>PG</th>
              <th>PE</th>
              <th>PP</th>
              <th>GF</th>
              <th>GC</th>
              <th>DG</th>
              <th>PTS</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.name} className={i === 0 ? 'leader' : ''}>
                <td className="pos">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </td>
                <td className="player-name">
                  <img
                    src={`/players/${s.name.toLowerCase()}.png`}
                    alt={s.name}
                    className="avatar"
                  />
                  <span>{s.name}</span>
                </td>
                <td>{s.pj}</td>
                <td>{s.pg}</td>
                <td>{s.pe}</td>
                <td>{s.pp}</td>
                <td>{s.gf}</td>
                <td>{s.gc}</td>
                <td className={s.gf - s.gc > 0 ? 'positive' : s.gf - s.gc < 0 ? 'negative' : ''}>
                  {s.gf - s.gc > 0 ? '+' : ''}{s.gf - s.gc}
                </td>
                <td className="pts">{s.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fixture resumido */}
      <div className="hist-detail-fixture">
        <h4 className="hist-detail-subtitle">📋 Fixture</h4>
        <div className="hist-detail-rounds">
          {fixture.map((round) => (
            <div key={round.round} className="hist-detail-round">
              <span className="hist-detail-round-label">Fecha {round.round}</span>
              <div className="hist-detail-matches">
                {round.matches.filter(m => m.played).map(m => {
                  const homeWin = m.homeGoals > m.awayGoals
                  const awayWin = m.awayGoals > m.homeGoals
                  return (
                    <div key={m.id} className="hist-detail-match">
                      <span className={`hist-match-team ${homeWin ? 'hist-match-winner' : ''}`}>{m.home}</span>
                      <span className="hist-match-score">{m.homeGoals} - {m.awayGoals}</span>
                      <span className={`hist-match-team ${awayWin ? 'hist-match-winner' : ''}`}>{m.away}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
