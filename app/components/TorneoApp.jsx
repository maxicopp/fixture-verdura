'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Standings from './Standings'
import Stats from './Stats'
import Champion from './Champion'
import HallOfFame from './HallOfFame'
import HistoricalStats from './HistoricalStats'
import HeadToHead from './HeadToHead'
import { generateFixture, calcStandings } from '../lib/fixture'
import { DISABLED_PLAYERS } from '../lib/disabled-players'

// ─── Navegación: 2 niveles claros ───────────────────────────────────────────
// Nivel 1: Contexto (Torneo Actual vs Historial vs Head to Head)
// Nivel 2: Sub-secciones dentro de cada contexto

const SECTIONS = [
  {
    key: 'current',
    label: 'Torneo Actual',
    icon: '⚽',
    tabs: [
      { key: 'standings', label: 'Posiciones' },
      { key: 'fixture',   label: 'Fixture' },
      { key: 'stats',     label: 'Estadísticas' },
    ],
  },
  {
    key: 'history',
    label: 'Historial',
    icon: '📜',
    tabs: [
      { key: 'table',    label: 'Tabla Histórica' },
      { key: 'hall',     label: 'Salón de la Gloria' },
    ],
  },
  {
    key: 'h2h',
    label: 'Duelos',
    icon: '⚔️',
    tabs: [],
  },
]

export default function TorneoApp() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  // Parse URL params
  const sectionParam = searchParams.get('s') || 'current'
  const tabParam     = searchParams.get('t') || ''

  const activeSection = SECTIONS.find(s => s.key === sectionParam) || SECTIONS[0]
  const activeTab     = activeSection.tabs.find(t => t.key === tabParam)?.key
                        || activeSection.tabs[0]?.key || ''

  const [players, setPlayers]               = useState([])
  const [fixture, setFixture]               = useState([])
  const [disabledPlayers, setDisabledPlayers] = useState([])
  const [tournamentId, setTournamentId]     = useState(null)
  const [tournamentStatus, setTournamentStatus] = useState(null)
  const [loading, setLoading]               = useState(true)

  useEffect(() => {
    fetch('/api/tournaments/active')
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          return fetch('/data.json').then(r => r.json()).then(fallback => {
            setPlayers(fallback.players)
            setFixture(fallback.fixture?.length > 0 ? fallback.fixture : generateFixture(fallback.players))
            setDisabledPlayers(DISABLED_PLAYERS)
          })
        }
        setPlayers(data.players)
        setFixture(data.fixture)
        setDisabledPlayers(data.disabledPlayers || [])
        setTournamentId(data.tournament?.id || null)
        setTournamentStatus(data.tournament?.status || null)
      })
      .catch(() => {
        fetch('/data.json').then(r => r.json()).then(fallback => {
          setPlayers(fallback.players)
          setFixture(fallback.fixture?.length > 0 ? fallback.fixture : generateFixture(fallback.players))
          setDisabledPlayers(DISABLED_PLAYERS)
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const standings = useMemo(() => calcStandings(players, fixture), [fixture, players])

  const isFinished = useMemo(() => {
    if (fixture.length === 0) return false
    const activePlayers = players.filter(p => !disabledPlayers.includes(p))
    if (activePlayers.length === 0) return false
    return fixture.every(r => r.matches.every(m => m.played || (disabledPlayers.includes(m.home) || disabledPlayers.includes(m.away))))
  }, [fixture, players, disabledPlayers])

  const champion = useMemo(() => {
    if (!isFinished) return null
    const active = standings.filter(s => !disabledPlayers.includes(s.name))
    return active[0] ?? null
  }, [isFinished, standings, disabledPlayers])

  // Cuando el torneo termina, persistir el campeón en la DB automáticamente
  useEffect(() => {
    if (!isFinished || !champion || !tournamentId || tournamentStatus === 'finished') return
    const topScorer = [...standings].sort((a, b) => b.gf - a.gf)[0]
    fetch(`/api/tournaments/${tournamentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'finish',
        champion: champion.name,
        top_scorer: topScorer?.name || null,
        top_scorer_goals: topScorer?.gf || 0,
      }),
    }).then(() => setTournamentStatus('finished'))
  }, [isFinished, champion, tournamentId, tournamentStatus, standings])

  // ─── Navigation handlers ─────────────────────────────────────────────────
  const navigate = (section, tab) => {
    const params = new URLSearchParams()
    if (section !== 'current') params.set('s', section)
    if (tab && tab !== SECTIONS.find(s => s.key === section)?.tabs[0]?.key) {
      params.set('t', tab)
    }
    const qs = params.toString()
    router.replace(qs ? `/?${qs}` : '/', { scroll: false })
  }

  if (loading) {
    return <div className="app"><div className="loading">Cargando torneo...</div></div>
  }

  const totalMatches  = fixture.reduce((acc, r) => acc + r.matches.length, 0)
  const playedMatches = fixture.reduce((acc, r) => acc + r.matches.filter(m => m.played).length, 0)
  const progress      = totalMatches > 0 ? Math.round((playedMatches / totalMatches) * 100) : 0

  return (
    <div className="app">
      {champion && (
        <Champion champion={champion} standings={standings.filter(s => !disabledPlayers.includes(s.name))} />
      )}

      <header className="header">
        <h1>Torneo Los Verduras</h1>
        <p className="subtitle">Apertura 2026 · {players.length} jugadores · {totalMatches} partidos</p>
        {activeSection.key === 'current' && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
            <span className="progress-text">{playedMatches}/{totalMatches} jugados ({progress}%)</span>
          </div>
        )}
      </header>

      {/* ─── Nivel 1: Section switcher ─── */}
      <nav className="section-nav" aria-label="Secciones principales">
        {SECTIONS.map(section => (
          <button
            key={section.key}
            className={`section-btn ${activeSection.key === section.key ? 'section-btn-active' : ''}`}
            onClick={() => navigate(section.key, section.tabs[0]?.key)}
            aria-current={activeSection.key === section.key ? 'page' : undefined}
          >
            <span className="section-btn-icon">{section.icon}</span>
            <span className="section-btn-label">{section.label}</span>
          </button>
        ))}
      </nav>

      {/* ─── Nivel 2: Sub-tabs (solo si la sección tiene tabs) ─── */}
      {activeSection.tabs.length > 0 && (
        <nav className="sub-tabs" aria-label="Sub-secciones">
          {activeSection.tabs.map(tab => (
            <button
              key={tab.key}
              className={`sub-tab ${activeTab === tab.key ? 'sub-tab-active' : ''}`}
              onClick={() => navigate(activeSection.key, tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}

      {/* ─── Contenido ─── */}
      <main className="content">
        {/* Torneo Actual */}
        {activeSection.key === 'current' && activeTab === 'standings' && (
          <Standings standings={standings} disabledPlayers={disabledPlayers} />
        )}
        {activeSection.key === 'current' && activeTab === 'fixture' && (
          <FixtureReadOnly fixture={fixture} disabledPlayers={disabledPlayers} />
        )}
        {activeSection.key === 'current' && activeTab === 'stats' && (
          <Stats fixture={fixture} standings={standings} disabledPlayers={disabledPlayers} />
        )}

        {/* Historial */}
        {activeSection.key === 'history' && activeTab === 'table' && (
          <HistoricalStats />
        )}
        {activeSection.key === 'history' && activeTab === 'hall' && (
          <HallOfFame />
        )}

        {/* Head to Head */}
        {activeSection.key === 'h2h' && (
          <HeadToHead players={players} />
        )}
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
