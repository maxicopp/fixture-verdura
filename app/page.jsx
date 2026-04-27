'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Fixture from './components/Fixture'
import Standings from './components/Standings'
import Stats from './components/Stats'

function generateFixture(players) {
  const n = players.length
  const rounds = []
  const list = [...players]

  for (let round = 0; round < n - 1; round++) {
    const matches = []
    for (let i = 0; i < n / 2; i++) {
      matches.push({
        id: `${round}-${i}`,
        home: list[i],
        away: list[n - 1 - i],
        homeGoals: null,
        awayGoals: null,
        played: false,
      })
    }
    rounds.push({ round: round + 1, matches })
    list.splice(1, 0, list.pop())
  }
  return rounds
}

export default function Home() {
  const [players, setPlayers] = useState([])
  const [fixture, setFixture] = useState([])
  const [activeTab, setActiveTab] = useState('fixture')
  const [loading, setLoading] = useState(true)

  // Cargar datos del JSON al montar
  useEffect(() => {
    fetch('/data.json')
      .then(r => r.json())
      .then(data => {
        setPlayers(data.players)
        if (data.fixture && data.fixture.length > 0) {
          setFixture(data.fixture)
        } else {
          setFixture(generateFixture(data.players))
        }
        setLoading(false)
      })
  }, [])

  // Persistir cambios via API
  const saveData = useCallback((newFixture) => {
    fetch('/api/fixture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players, fixture: newFixture }),
    })
  }, [players])

  const standings = useMemo(() => {
    const table = {}
    players.forEach(p => {
      table[p] = { name: p, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 }
    })
    fixture.forEach(round => {
      round.matches.forEach(m => {
        if (!m.played) return
        const h = table[m.home]
        const a = table[m.away]
        h.pj++; a.pj++
        h.gf += m.homeGoals; h.gc += m.awayGoals
        a.gf += m.awayGoals; a.gc += m.homeGoals
        if (m.homeGoals > m.awayGoals) {
          h.pg++; h.pts += 3; a.pp++
        } else if (m.homeGoals < m.awayGoals) {
          a.pg++; a.pts += 3; h.pp++
        } else {
          h.pe++; a.pe++; h.pts += 1; a.pts += 1
        }
      })
    })
    return Object.values(table).sort((a, b) =>
      b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf
    )
  }, [fixture, players])

  const handleResult = (roundIdx, matchIdx, homeGoals, awayGoals) => {
    setFixture(prev => {
      const next = prev.map(r => ({ ...r, matches: r.matches.map(m => ({ ...m })) }))
      const match = next[roundIdx].matches[matchIdx]
      match.homeGoals = homeGoals
      match.awayGoals = awayGoals
      match.played = true
      saveData(next)
      return next
    })
  }

  const handleReset = (roundIdx, matchIdx) => {
    setFixture(prev => {
      const next = prev.map(r => ({ ...r, matches: r.matches.map(m => ({ ...m })) }))
      const match = next[roundIdx].matches[matchIdx]
      match.homeGoals = null
      match.awayGoals = null
      match.played = false
      saveData(next)
      return next
    })
  }

  const handleResetAll = () => {
    const fresh = generateFixture(players)
    setFixture(fresh)
    saveData(fresh)
  }

  if (loading) {
    return <div className="app"><div className="loading">Cargando torneo...</div></div>
  }

  const totalMatches = fixture.reduce((acc, r) => acc + r.matches.length, 0)
  const playedMatches = fixture.reduce((acc, r) => acc + r.matches.filter(m => m.played).length, 0)
  const progress = totalMatches > 0 ? Math.round((playedMatches / totalMatches) * 100) : 0

  return (
    <div className="app">
      <header className="header">
        <h1>⚽ Torneo Copa Verdura Apertura 2026</h1>
        <p className="subtitle">{players.length} jugadores · {totalMatches} partidos · Round Robin</p>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <span className="progress-text">{playedMatches}/{totalMatches} jugados ({progress}%)</span>
        </div>
      </header>

      <nav className="tabs">
        {[
          { key: 'fixture', label: '📋 Fixture' },
          { key: 'standings', label: '🏆 Posiciones' },
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
        {activeTab === 'fixture' && (
          <Fixture
            fixture={fixture}
            onResult={handleResult}
            onReset={handleReset}
            onResetAll={handleResetAll}
          />
        )}
        {activeTab === 'standings' && <Standings standings={standings} />}
        {activeTab === 'stats' && <Stats fixture={fixture} standings={standings} />}
      </main>
    </div>
  )
}
