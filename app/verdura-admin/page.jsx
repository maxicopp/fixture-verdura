'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Fixture from '../components/Fixture'
import Standings from '../components/Standings'
import Stats from '../components/Stats'
import { generateFixture, calcStandings } from '../lib/fixture'

export default function AdminPage() {
  const [players, setPlayers] = useState([])
  const [fixture, setFixture] = useState([])
  const [activeTab, setActiveTab] = useState('fixture')
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [fixtureKey, setFixtureKey] = useState(0)
  const fileInputRef = useRef(null)

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

  const handleResult = (roundIdx, matchIdx, homeGoals, awayGoals) => {
    setFixture(prev => {
      const next = prev.map(r => ({ ...r, matches: r.matches.map(m => ({ ...m })) }))
      next[roundIdx].matches[matchIdx] = {
        ...next[roundIdx].matches[matchIdx],
        homeGoals,
        awayGoals,
        played: true,
      }
      return next
    })
    setSaved(false)
  }

  const handleReset = (roundIdx, matchIdx) => {
    setFixture(prev => {
      const next = prev.map(r => ({ ...r, matches: r.matches.map(m => ({ ...m })) }))
      next[roundIdx].matches[matchIdx] = {
        ...next[roundIdx].matches[matchIdx],
        homeGoals: null,
        awayGoals: null,
        played: false,
      }
      return next
    })
    setSaved(false)
    setFixtureKey(k => k + 1)
  }

  const handleResetAll = () => {
    if (!confirm('¿Seguro que querés reiniciar todo el fixture?')) return
    const fresh = generateFixture(players)
    setFixture(fresh)
    setFixtureKey(k => k + 1)
    // Copiar al clipboard el JSON inicial sin datos
    const emptyData = { players, fixture: [] }
    navigator.clipboard.writeText(JSON.stringify(emptyData, null, 2))
    setSaved(true)
  }

  const downloadJSON = () => {
    const data = { players, fixture }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'data.json'
    a.click()
    URL.revokeObjectURL(url)
    setSaved(true)
  }

  const copyJSON = () => {
    const data = { players, fixture }
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setSaved(true)
  }

  const importJSON = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.players) {
          setPlayers(data.players)
          if (data.fixture && data.fixture.length > 0) {
            setFixture(data.fixture)
          } else {
            setFixture(generateFixture(data.players))
          }
          setFixtureKey(k => k + 1)
          setSaved(false)
          alert('✅ Datos importados correctamente')
        } else {
          alert('❌ El JSON no tiene el formato correcto (necesita al menos "players")')
        }
      } catch {
        alert('❌ Error al leer el archivo JSON')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
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
        <div className="admin-badge">🔒 ADMIN</div>
        <h1>Torneo Los Verduras Apertura 2026</h1>
        <p className="subtitle">{players.length} jugadores · {totalMatches} partidos · Round Robin</p>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <span className="progress-text">{playedMatches}/{totalMatches} jugados ({progress}%)</span>
        </div>
      </header>

      <div className="admin-actions">
        <button className="btn-import" onClick={() => fileInputRef.current?.click()}>
          📂 Importar JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={importJSON}
          style={{ display: 'none' }}
        />
        <button className="btn-download" onClick={downloadJSON}>
          📥 Descargar data.json
        </button>
        <button className="btn-copy" onClick={copyJSON}>
          📋 Copiar JSON
        </button>
        {saved && <span className="save-indicator">✅ Listo</span>}
        {!saved && playedMatches > 0 && <span className="unsaved-indicator">⚠️ Cambios sin exportar</span>}
      </div>

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
            key={fixtureKey}
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
