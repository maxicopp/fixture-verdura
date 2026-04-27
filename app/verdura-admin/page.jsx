'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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
  const [mountKey, setMountKey] = useState(0)
  const [notification, setNotification] = useState('')
  const fileInputRef = useRef(null)

  // Refs para tener siempre el valor fresco en callbacks sin stale closures
  const playersRef = useRef([])
  const fixtureRef = useRef([])
  useEffect(() => { playersRef.current = players }, [players])
  useEffect(() => { fixtureRef.current = fixture }, [fixture])

  const notify = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3000)
  }

  const loadData = (data) => {
    const p = data.players || []
    const f = Array.isArray(data.fixture) && data.fixture.length > 0
      ? data.fixture
      : generateFixture(p)
    setPlayers(p)
    setFixture(f)
    setMountKey(k => k + 1)
  }

  useEffect(() => {
    fetch('/data.json', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        loadData(data)
        setLoading(false)
      })
  }, [])

  const standings = useMemo(() => calcStandings(players, fixture), [fixture, players])

  const handleResult = (roundIdx, matchIdx, homeGoals, awayGoals) => {
    setFixture(prev => {
      const next = prev.map(r => ({ ...r, matches: r.matches.map(m => ({ ...m })) }))
      next[roundIdx].matches[matchIdx] = { ...next[roundIdx].matches[matchIdx], homeGoals, awayGoals, played: true }
      return next
    })
    setSaved(false)
  }

  const handleReset = (roundIdx, matchIdx) => {
    setFixture(prev => {
      const next = prev.map(r => ({ ...r, matches: r.matches.map(m => ({ ...m })) }))
      next[roundIdx].matches[matchIdx] = { ...next[roundIdx].matches[matchIdx], homeGoals: null, awayGoals: null, played: false }
      return next
    })
    setSaved(false)
    setMountKey(k => k + 1)
  }

  const handleResetAll = useCallback(() => {
    if (!confirm('¿Seguro que querés reiniciar todo el fixture?')) return
    const currentPlayers = playersRef.current
    const emptyData = { players: currentPlayers, fixture: [] }
    navigator.clipboard.writeText(JSON.stringify(emptyData, null, 2))
    setFixture(generateFixture(currentPlayers))
    setMountKey(k => k + 1)
    setSaved(true)
    notify('🔄 Fixture reiniciado. JSON vacío copiado al clipboard.')
  }, [])

  const downloadJSON = useCallback(() => {
    const data = { players: playersRef.current, fixture: fixtureRef.current }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'data.json'
    a.click()
    URL.revokeObjectURL(url)
    setSaved(true)
    notify('📥 data.json descargado')
  }, [])

  const copyJSON = useCallback(() => {
    const data = { players: playersRef.current, fixture: fixtureRef.current }
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setSaved(true)
    notify('📋 JSON copiado al clipboard')
  }, [])

  const importJSON = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = ev.target.result
        const data = JSON.parse(raw)
        if (!data.players || !Array.isArray(data.players)) {
          notify('❌ JSON inválido: falta el campo "players"')
          return
        }
        loadData(data)
        setSaved(false)
        notify(`✅ Importado: ${data.players.length} jugadores`)
      } catch (err) {
        notify('❌ Error al parsear el JSON: ' + err.message)
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
        <input ref={fileInputRef} type="file" accept=".json" onChange={importJSON} style={{ display: 'none' }} />
        <button className="btn-download" onClick={downloadJSON}>
          📥 Descargar data.json
        </button>
        <button className="btn-copy" onClick={copyJSON}>
          📋 Copiar JSON
        </button>
        {notification && <span className={notification.startsWith('❌') ? 'unsaved-indicator' : 'save-indicator'}>{notification}</span>}
        {!notification && !saved && playedMatches > 0 && <span className="unsaved-indicator">⚠️ Cambios sin exportar</span>}
      </div>

      <nav className="tabs">
        {[
          { key: 'fixture', label: '📋 Fixture' },
          { key: 'standings', label: '🏆 Posiciones' },
          { key: 'stats', label: '📊 Estadísticas' },
        ].map(tab => (
          <button key={tab.key} className={`tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === 'fixture' && (
          <Fixture key={mountKey} fixture={fixture} onResult={handleResult} onReset={handleReset} onResetAll={handleResetAll} />
        )}
        {activeTab === 'standings' && <Standings key={mountKey} standings={standings} />}
        {activeTab === 'stats' && <Stats key={mountKey} fixture={fixture} standings={standings} />}
      </main>
    </div>
  )
}
