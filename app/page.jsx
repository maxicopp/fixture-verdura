'use client'

import { useState, useEffect, useMemo } from 'react'
import Standings from './components/Standings'
import Stats from './components/Stats'
import { generateFixture, calcStandings } from './lib/fixture'

export default function Home() {
  const [players, setPlayers] = useState([])
  const [fixture, setFixture] = useState([])
  const [activeTab, setActiveTab] = useState('standings')
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

  if (loading) {
    return <div className="app"><div className="loading">Cargando torneo...</div></div>
  }

  const totalMatches = fixture.reduce((acc, r) => acc + r.matches.length, 0)
  const playedMatches = fixture.reduce((acc, r) => acc + r.matches.filter(m => m.played).length, 0)
  const progress = totalMatches > 0 ? Math.round((playedMatches / totalMatches) * 100) : 0

  return (
    <div className="app">
      <header className="header">
        <h1><img src="/football.svg" alt="⚽" className="title-icon" /> Torneo Los Verduras Apertura 2026</h1>
        <p className="subtitle">{players.length} jugadores · {totalMatches} partidos · Round Robin</p>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <span className="progress-text">{playedMatches}/{totalMatches} jugados ({progress}%)</span>
        </div>
      </header>

      <nav className="tabs">
        {[
          { key: 'standings', label: '🏆 Posiciones' },
          { key: 'fixture', label: '📋 Fixture' },
          { key: 'stats', label: '📊 Estadísticas' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === 'standings' && <Standings standings={standings} />}
        {activeTab === 'fixture' && <FixtureReadOnly fixture={fixture} />}
        {activeTab === 'stats' && <Stats fixture={fixture} standings={standings} />}
      </main>
    </div>
  )
}

function FixtureReadOnly({ fixture }) {
  const [expandedRound, setExpandedRound] = useState(0)

  return (
    <div className="fixture">
      <div className="fixture-header">
        <h2>Fixture completo</h2>
      </div>
      {fixture.map((round, ri) => {
        const played = round.matches.filter(m => m.played).length
        const total = round.matches.length
        const isExpanded = expandedRound === ri
        return (
          <div key={ri} className={`round-card ${isExpanded ? 'expanded' : ''}`}>
            <button
              className="round-header"
              onClick={() => setExpandedRound(isExpanded ? -1 : ri)}
            >
              <span className="round-title">Fecha {round.round}</span>
              <span className="round-badge">
                {played === total ? '✅' : `${played}/${total}`}
              </span>
              <span className="round-chevron">{isExpanded ? '▲' : '▼'}</span>
            </button>
            {isExpanded && (
              <div className="match-day">
                {round.matches.map(match => {
                  if (!match.played) {
                    return (
                      <div key={match.id} className="match-card pending">
                        <div className="match-teams">
                          <span className="team">{match.home}</span>
                          <span className="score" style={{ color: 'var(--text-muted)' }}>vs</span>
                          <span className="team">{match.away}</span>
                        </div>
                      </div>
                    )
                  }
                  const homeWin = match.homeGoals > match.awayGoals
                  const awayWin = match.awayGoals > match.homeGoals
                  const draw = match.homeGoals === match.awayGoals
                  return (
                    <div key={match.id} className={`match-card played ${draw ? 'draw' : ''}`}>
                      <div className="match-teams">
                        <span className={`team ${homeWin ? 'winner' : ''}`}>{match.home}</span>
                        <span className="score">{match.homeGoals} - {match.awayGoals}</span>
                        <span className={`team ${awayWin ? 'winner' : ''}`}>{match.away}</span>
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
