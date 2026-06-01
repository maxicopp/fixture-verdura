'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Standings from './Standings'
import Stats from './Stats'
import { generateFixture, calcStandings } from '../lib/fixture'
import { DISABLED_PLAYERS } from '../lib/disabled-players'

const TABS = [
  { key: 'standings', label: '🏆 Posiciones',   path: '/' },
  { key: 'fixture',   label: '📋 Fixture',       path: '/fixture' },
  { key: 'stats',     label: '📊 Estadísticas',  path: '/stats' },
]

export default function TorneoApp() {
  const router   = useRouter()
  const pathname = usePathname()
  const [players, setPlayers] = useState([])
  const [fixture, setFixture] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data.json')
      .then(r => r.json())
      .then(data => {
        setPlayers(data.players)
        setFixture(data.fixture?.length > 0 ? data.fixture : generateFixture(data.players))
        setLoading(false)
      })
  }, [])

  const standings = useMemo(() => calcStandings(players, fixture), [fixture, players])
  const activeTab = TABS.find(t => t.path === pathname)?.key ?? 'standings'

  if (loading) {
    return <div className="app"><div className="loading">Cargando torneo...</div></div>
  }

  const totalMatches  = fixture.reduce((acc, r) => acc + r.matches.length, 0)
  const playedMatches = fixture.reduce((acc, r) => acc + r.matches.filter(m => m.played).length, 0)
  const progress      = totalMatches > 0 ? Math.round((playedMatches / totalMatches) * 100) : 0

  return (
    <div className="app">
      <header className="header">
        <h1>Torneo Los Verduras Apertura 2026</h1>
        <p className="subtitle">{players.length} jugadores · {totalMatches} partidos</p>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <span className="progress-text">{playedMatches}/{totalMatches} jugados ({progress}%)</span>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => router.push(tab.path, { scroll: false })}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === 'standings' && <Standings standings={standings} disabledPlayers={DISABLED_PLAYERS} />}
        {activeTab === 'fixture'   && <FixtureReadOnly fixture={fixture} disabledPlayers={DISABLED_PLAYERS} />}
        {activeTab === 'stats'     && <Stats fixture={fixture} standings={standings} disabledPlayers={DISABLED_PLAYERS} />}
      </main>
    </div>
  )
}

// ─── Odds ────────────────────────────────────────────────────────────────────

function calcOdds(homeName, awayName, fixture) {
  function score(name) {
    const results = []
    fixture.forEach(r => r.matches.forEach(m => {
      if (!m.played) return
      if (m.home === name) results.push({ gf: m.homeGoals, gc: m.awayGoals })
      if (m.away === name) results.push({ gf: m.awayGoals, gc: m.homeGoals })
    }))
    if (results.length === 0) return 1
    const pts    = results.reduce((a, r) => a + (r.gf > r.gc ? 3 : r.gf === r.gc ? 1 : 0), 0)
    const recent = results.slice(-3).reduce((a, r) => a + (r.gf > r.gc ? 3 : r.gf === r.gc ? 1 : 0), 0)
    const dg     = results.reduce((a, r) => a + (r.gf - r.gc), 0)
    return pts * 2 + recent * 3 + dg + 5
  }
  const sh    = Math.max(score(homeName), 0.1)
  const sa    = Math.max(score(awayName), 0.1)
  const total = sh + sa
  const ph    = (sh / total) * 0.9
  const pa    = (sa / total) * 0.9
  const pe    = 0.1 + (0.28 - Math.abs(ph - pa) * 0.5)
  const norm  = ph + pe + pa
  return {
    home: Math.max(1.05, +(1 / (ph / norm)).toFixed(2)),
    draw: Math.max(1.05, +(1 / (pe / norm)).toFixed(2)),
    away: Math.max(1.05, +(1 / (pa / norm)).toFixed(2)),
  }
}

// ─── Fixture read-only ───────────────────────────────────────────────────────

function FixtureReadOnly({ fixture, disabledPlayers = [] }) {
  const [expandedRound, setExpandedRound] = useState(0)
  const isDisabled      = (name)  => disabledPlayers.includes(name)
  const matchHasDisabled = (match) => isDisabled(match.home) || isDisabled(match.away)

  return (
    <div className="fixture">
      <div className="fixture-header">
        <h2>Fixture completo</h2>
      </div>
      {fixture.map((round, ri) => {
        const played     = round.matches.filter(m => m.played).length
        const total      = round.matches.length
        const isExpanded = expandedRound === ri
        return (
          <div key={ri} className={`round-card ${isExpanded ? 'expanded' : ''}`}>
            <button
              className="round-header"
              onClick={() => setExpandedRound(isExpanded ? -1 : ri)}
            >
              <span className="round-title">Fecha {round.round}</span>
              <span className="round-badge">{played === total ? '✅' : `${played}/${total}`}</span>
              <span className="round-chevron">{isExpanded ? '▲' : '▼'}</span>
            </button>
            {isExpanded && (
              <div className="match-day">
                {round.matches.map(match => {
                  const disabled = matchHasDisabled(match)
                  if (!match.played) {
                    const odds = calcOdds(match.home, match.away, fixture)
                    return (
                      <div key={match.id} className={`match-card pending ${disabled ? 'match-disabled' : ''}`}>
                        <div className="match-teams">
                          <span className={`team team-home ${isDisabled(match.home) ? 'player-disabled' : ''}`}>
                            {match.home}
                            <img src={`/players/${match.home.toLowerCase()}.png`} alt={match.home} className={`avatar ${isDisabled(match.home) ? 'avatar-disabled' : ''}`} />
                          </span>
                          <span className="score" style={{ color: 'var(--text-muted)' }}>vs</span>
                          <span className={`team team-away ${isDisabled(match.away) ? 'player-disabled' : ''}`}>
                            <img src={`/players/${match.away.toLowerCase()}.png`} alt={match.away} className={`avatar ${isDisabled(match.away) ? 'avatar-disabled' : ''}`} />
                            {match.away}
                          </span>
                        </div>
                        {!disabled && (
                          <div className="odds-block">
                            <div className="odds-header">
                              <span className="odds-icon">📊</span>
                              <span className="odds-title">Cuotas estimadas</span>
                            </div>
                            <div className="odds-row">
                              {[
                                { label: match.home,  val: odds.home },
                                { label: 'Empate',    val: odds.draw },
                                { label: match.away,  val: odds.away },
                              ].map(({ label, val }) => {
                                const isFav = val === Math.min(odds.home, odds.draw, odds.away)
                                return (
                                  <div key={label} className={`odd-item ${isFav ? 'odd-fav' : ''}`}>
                                    <span className="odd-label">{label}</span>
                                    <span className="odd-val">{val}</span>
                                    {isFav && <span className="odd-fav-tag">FAV</span>}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        {disabled && <div className="disabled-badge">⏸ Partido suspendido</div>}
                      </div>
                    )
                  }
                  const homeWin = match.homeGoals > match.awayGoals
                  const awayWin = match.awayGoals > match.homeGoals
                  const draw    = match.homeGoals === match.awayGoals
                  return (
                    <div key={match.id} className={`match-card played ${draw ? 'draw' : ''} ${disabled ? 'match-disabled' : ''}`}>
                      <div className="match-teams">
                        <span className={`team team-home ${homeWin && !disabled ? 'winner' : ''} ${isDisabled(match.home) ? 'player-disabled' : ''}`}>
                          {match.home}
                          <img src={`/players/${match.home.toLowerCase()}.png`} alt={match.home} className={`avatar ${isDisabled(match.home) ? 'avatar-disabled' : ''}`} />
                        </span>
                        <span className="score">{match.homeGoals} - {match.awayGoals}</span>
                        <span className={`team team-away ${awayWin && !disabled ? 'winner' : ''} ${isDisabled(match.away) ? 'player-disabled' : ''}`}>
                          <img src={`/players/${match.away.toLowerCase()}.png`} alt={match.away} className={`avatar ${isDisabled(match.away) ? 'avatar-disabled' : ''}`} />
                          {match.away}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
