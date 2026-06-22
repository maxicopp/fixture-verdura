'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Standings from '../components/Standings'
import { calcStandings } from '../lib/fixture'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch('/api/admin/auth')
      .then(r => r.json())
      .then(data => setAuthed(data.authenticated))
      .catch(() => setAuthed(false))
      .finally(() => setChecking(false))
  }, [])

  if (checking) {
    return <div className="app"><div className="loading">Verificando sesión...</div></div>
  }

  if (!authed) {
    return <LoginForm onSuccess={() => setAuthed(true)} />
  }

  return <AdminPanel onLogout={() => setAuthed(false)} />
}

// ─── Login Form ──────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (data.ok) {
        onSuccess()
      } else {
        setError(data.error || 'Error de autenticación')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <span className="login-icon">🔐</span>
            <h1 className="login-title">Admin Panel</h1>
            <p className="login-subtitle">Torneo Los Verduras</p>
          </div>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="username">Usuario</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Ingresá tu usuario"
                autoComplete="username"
                required
              />
            </div>
            <div className="login-field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Admin Panel ─────────────────────────────────────────────────────────────

function AdminPanel({ onLogout }) {
  const [players, setPlayers] = useState([])
  const [fixture, setFixture] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('fixture')
  const [notification, setNotification] = useState('')
  const [saving, setSaving] = useState(false)

  const notify = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3000)
  }

  const loadData = useCallback(() => {
    fetch('/api/tournaments/active')
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setPlayers(data.players)
          setFixture(data.fixture)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const standings = useMemo(() => calcStandings(players, fixture), [fixture, players])

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    onLogout()
  }

  const handleResult = async (roundIdx, matchIdx, homeGoals, awayGoals) => {
    const match = fixture[roundIdx].matches[matchIdx]
    setSaving(true)

    try {
      const res = await fetch('/api/admin/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_key: match.id,
          home_goals: homeGoals,
          away_goals: awayGoals,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        // Actualizar estado local
        setFixture(prev => {
          const next = prev.map(r => ({ ...r, matches: r.matches.map(m => ({ ...m })) }))
          next[roundIdx].matches[matchIdx] = { ...match, homeGoals, awayGoals, played: true }
          return next
        })
        notify(`✅ ${match.home} ${homeGoals} - ${awayGoals} ${match.away}`)
      } else {
        notify(`❌ ${data.error || 'Error al guardar'}`)
      }
    } catch {
      notify('❌ Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async (roundIdx, matchIdx) => {
    const match = fixture[roundIdx].matches[matchIdx]
    if (!confirm(`¿Resetear ${match.home} vs ${match.away}?`)) return

    try {
      const res = await fetch('/api/admin/reset-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_key: match.id }),
      })
      const data = await res.json()
      if (data.ok) {
        setFixture(prev => {
          const next = prev.map(r => ({ ...r, matches: r.matches.map(m => ({ ...m })) }))
          next[roundIdx].matches[matchIdx] = { ...match, homeGoals: null, awayGoals: null, played: false }
          return next
        })
        notify('🔄 Partido reseteado')
      } else {
        notify(`❌ ${data.error}`)
      }
    } catch {
      notify('❌ Error de conexión')
    }
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
        <div className="admin-header-row">
          <div className="admin-badge">🔒 ADMIN</div>
          <button className="admin-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>
        <h1>Torneo Los Verduras Apertura 2026</h1>
        <p className="subtitle">{players.length} jugadores · {totalMatches} partidos</p>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <span className="progress-text">{playedMatches}/{totalMatches} jugados ({progress}%)</span>
        </div>
        {notification && (
          <div className={`admin-notification ${notification.startsWith('❌') ? 'admin-notification-error' : ''}`}>
            {notification}
          </div>
        )}
        {saving && <div className="admin-saving">Guardando...</div>}
      </header>

      <nav className="tabs">
        {[
          { key: 'fixture', label: '📋 Fixture' },
          { key: 'standings', label: '🏆 Posiciones' },
        ].map(tab => (
          <button key={tab.key} className={`tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === 'fixture' && (
          <AdminFixture fixture={fixture} onResult={handleResult} onReset={handleReset} />
        )}
        {activeTab === 'standings' && <Standings standings={standings} />}
      </main>
    </div>
  )
}

// ─── Admin Fixture (editable) ────────────────────────────────────────────────

function AdminFixture({ fixture, onResult, onReset }) {
  const [expandedRound, setExpandedRound] = useState(() => {
    // Auto-abrir la primera fecha con partidos pendientes
    const idx = fixture.findIndex(r => r.matches.some(m => !m.played))
    return idx >= 0 ? idx : 0
  })

  return (
    <div className="fixture">
      <div className="fixture-header">
        <h2>Editar resultados</h2>
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
              <span className="round-badge">{played === total ? '✅' : `${played}/${total}`}</span>
              <span className="round-chevron">{isExpanded ? '▲' : '▼'}</span>
            </button>
            {isExpanded && (
              <div className="match-day">
                {round.matches.map((match, mi) => (
                  <AdminMatchCard
                    key={match.id}
                    match={match}
                    onSave={(h, a) => onResult(ri, mi, h, a)}
                    onReset={() => onReset(ri, mi)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function AdminMatchCard({ match, onSave, onReset }) {
  const [homeGoals, setHomeGoals] = useState(match.played ? match.homeGoals : '')
  const [awayGoals, setAwayGoals] = useState(match.played ? match.awayGoals : '')

  // Sync with prop changes
  useEffect(() => {
    setHomeGoals(match.played ? match.homeGoals : '')
    setAwayGoals(match.played ? match.awayGoals : '')
  }, [match.played, match.homeGoals, match.awayGoals])

  const canSave = homeGoals !== '' && awayGoals !== '' && Number(homeGoals) >= 0 && Number(awayGoals) >= 0

  const handleSave = () => {
    if (!canSave) return
    onSave(Number(homeGoals), Number(awayGoals))
  }

  return (
    <div className={`match-card ${match.played ? 'played' : 'pending'}`}>
      <div className="match-teams">
        <span className="team team-home">
          {match.home}
          <img src={`/players/${match.home.toLowerCase()}.png`} alt={match.home} className="avatar" />
        </span>
        <div className="score-input">
          <input
            type="number"
            min="0"
            max="99"
            value={homeGoals}
            onChange={e => setHomeGoals(e.target.value)}
            placeholder="–"
          />
          <span>-</span>
          <input
            type="number"
            min="0"
            max="99"
            value={awayGoals}
            onChange={e => setAwayGoals(e.target.value)}
            placeholder="–"
          />
        </div>
        <span className="team team-away">
          <img src={`/players/${match.away.toLowerCase()}.png`} alt={match.away} className="avatar" />
          {match.away}
        </span>
      </div>
      <div className="match-actions">
        <button className="btn-save" onClick={handleSave} disabled={!canSave}>
          💾 Guardar
        </button>
        {match.played && (
          <button className="btn-sm btn-danger" onClick={onReset}>
            🔄 Resetear
          </button>
        )}
      </div>
    </div>
  )
}
