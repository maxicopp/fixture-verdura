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

  // Copa state
  const [copaData, setCopaData] = useState(null)
  const [copaLoading, setCopaLoading] = useState(false)

  const notify = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3000)
  }

  const loadData = useCallback(() => {
    // Admin carga el torneo más reciente (activo o finalizado)
    fetch('/api/tournaments/latest')
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setPlayers(data.players)
          setFixture(data.fixture)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const loadCopa = useCallback(() => {
    setCopaLoading(true)
    fetch('/api/copa')
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setCopaData(data)
        } else {
          setCopaData(null)
        }
      })
      .catch(() => setCopaData(null))
      .finally(() => setCopaLoading(false))
  }, [])

  useEffect(() => { loadData(); loadCopa() }, [loadData, loadCopa])

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

  // ─── Copa handlers ───────────────────────────────────────────────────────

  const handleCreateCopa = async () => {
    if (standings.length < 6) {
      notify('❌ Se necesitan al menos 6 jugadores con partidos jugados')
      return
    }
    if (!confirm('¿Crear la Copa basada en las posiciones actuales del torneo?')) return

    try {
      const res = await fetch('/api/copa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Copa Los Verduras',
          season: 'Apertura 2026',
          year: 2026,
          standings: standings,
        }),
      })
      const data = await res.json()
      if (data.id) {
        notify('🏆 Copa creada exitosamente')
        loadCopa()
      } else {
        notify(`❌ ${data.error || 'Error al crear copa'}`)
      }
    } catch {
      notify('❌ Error de conexión')
    }
  }

  const handleCopaResult = async (matchKey, homeGoals, awayGoals) => {
    try {
      const res = await fetch('/api/copa/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_key: matchKey,
          home_goals: homeGoals,
          away_goals: awayGoals,
          tournament_id: copaData?.tournament?.id,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        notify(`✅ ${data.winner} avanza${data.finished ? ' — 🏆 ¡Copa finalizada!' : ''}`)
        loadCopa()
      } else {
        notify(`❌ ${data.error || 'Error al guardar'}`)
      }
    } catch {
      notify('❌ Error de conexión')
    }
  }

  const handleCopaReset = async (matchKey) => {
    if (!confirm('¿Resetear este partido de Copa? Se resetearán también los partidos posteriores dependientes.')) return

    try {
      const res = await fetch('/api/copa/reset-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_key: matchKey,
          tournament_id: copaData?.tournament?.id,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        notify('🔄 Partido de Copa reseteado')
        loadCopa()
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
      {/* Top bar del admin */}
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <span className="admin-badge">🔒 Admin</span>
          <span className="admin-topbar-title">Torneo Los Verduras</span>
        </div>
        <button className="admin-logout" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>

      <header className="admin-header-section">
        <h1>Apertura 2026</h1>
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
      </header>

      <nav className="tabs">
        {[
          { key: 'fixture', label: '📋 Fixture' },
          { key: 'standings', label: '🏆 Posiciones' },
          { key: 'copa', label: '🏆 Copa' },
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
        {activeTab === 'copa' && (
          <AdminCopa
            copaData={copaData}
            copaLoading={copaLoading}
            standings={standings}
            onCreateCopa={handleCreateCopa}
            onResult={handleCopaResult}
            onReset={handleCopaReset}
          />
        )}
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
    <div className={`admin-match-card ${match.played ? 'played' : 'pending'}`}>
      <span className="admin-match-team admin-match-home">
        <img src={`/players/${match.home.toLowerCase()}.png`} alt={match.home} className="avatar" />
        {match.home}
      </span>

      <div className="admin-match-center">
        <input
          type="number" min="0" max="99"
          value={homeGoals}
          onChange={e => setHomeGoals(e.target.value)}
          className="admin-score-input"
          placeholder="–"
        />
        <span className="admin-score-sep">-</span>
        <input
          type="number" min="0" max="99"
          value={awayGoals}
          onChange={e => setAwayGoals(e.target.value)}
          className="admin-score-input"
          placeholder="–"
        />
      </div>

      <span className="admin-match-team admin-match-away">
        {match.away}
        <img src={`/players/${match.away.toLowerCase()}.png`} alt={match.away} className="avatar" />
      </span>

      <div className="admin-match-actions">
        <button className="admin-btn-save" onClick={handleSave} disabled={!canSave}>
          Guardar
        </button>
        {match.played && (
          <button className="admin-btn-reset" onClick={onReset}>
            Resetear
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Admin Copa ──────────────────────────────────────────────────────────────

const STAGE_LABELS = {
  quarterfinal: '⚔️ Cuartos de Final',
  semifinal: '🔥 Semifinales',
  final: '🏆 Final',
}

function AdminCopa({ copaData, copaLoading, standings, onCreateCopa, onResult, onReset }) {
  if (copaLoading) {
    return <div className="loading">Cargando Copa...</div>
  }

  if (!copaData) {
    return (
      <div className="admin-copa-create">
        <div className="admin-copa-create-header">
          <span className="admin-copa-create-icon">🏆</span>
          <h3>Crear Copa</h3>
          <p>Basada en las posiciones actuales del torneo de liga</p>
        </div>

        {standings.length >= 6 && (
          <div className="admin-copa-preview">
            <h4>Bracket previsto:</h4>
            <div className="admin-copa-preview-bracket">
              <div className="admin-copa-preview-round">
                <span className="admin-copa-preview-label">Cuartos:</span>
                <span>🥉 {standings[2]?.name} vs {standings[5]?.name} (3° vs 6°)</span>
                <span>{standings[3]?.name} vs {standings[4]?.name} (4° vs 5°)</span>
              </div>
              <div className="admin-copa-preview-round">
                <span className="admin-copa-preview-label">Semis:</span>
                <span>🥇 {standings[0]?.name} (BYE) vs Ganador QF1</span>
                <span>🥈 {standings[1]?.name} (BYE) vs Ganador QF2</span>
              </div>
              <div className="admin-copa-preview-round">
                <span className="admin-copa-preview-label">Final:</span>
                <span>Ganador SF1 vs Ganador SF2</span>
              </div>
            </div>
          </div>
        )}

        <button className="admin-btn-create-copa" onClick={onCreateCopa} disabled={standings.length < 6}>
          🏆 Crear Copa
        </button>

        {standings.length < 6 && (
          <p className="admin-copa-warning">⚠️ Se necesitan al menos 6 jugadores en el torneo para crear la Copa.</p>
        )}
      </div>
    )
  }

  // Copa existe — mostrar bracket editable
  const { tournament, matches, champion } = copaData
  const stages = ['quarterfinal', 'semifinal', 'final']

  return (
    <div className="admin-copa">
      <div className="admin-copa-header">
        <h2>🏆 {tournament.name}</h2>
        <p>{tournament.season} {tournament.year} — {tournament.status === 'finished' ? '✅ Finalizada' : '🟢 En curso'}</p>
        {champion && <p className="admin-copa-champion">👑 Campeón: <strong>{champion}</strong></p>}
      </div>

      {stages.map(stage => {
        const stageMatches = matches.filter(m => m.stage === stage)
        if (stageMatches.length === 0) return null
        return (
          <div key={stage} className="admin-copa-stage">
            <h3 className="admin-copa-stage-title">{STAGE_LABELS[stage]}</h3>
            {stageMatches.map(match => (
              <AdminCopaMatchCard
                key={match.id}
                match={match}
                onSave={(hg, ag) => onResult(match.id, hg, ag)}
                onReset={() => onReset(match.id)}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function AdminCopaMatchCard({ match, onSave, onReset }) {
  const [homeGoals, setHomeGoals] = useState(match.played ? match.homeGoals : '')
  const [awayGoals, setAwayGoals] = useState(match.played ? match.awayGoals : '')

  useEffect(() => {
    setHomeGoals(match.played ? match.homeGoals : '')
    setAwayGoals(match.played ? match.awayGoals : '')
  }, [match.played, match.homeGoals, match.awayGoals])

  const isTBD = match.home === 'TBD' || match.away === 'TBD'
  const canSave = !isTBD && homeGoals !== '' && awayGoals !== '' &&
    Number(homeGoals) >= 0 && Number(awayGoals) >= 0

  const handleSave = () => {
    if (!canSave) return
    onSave(Number(homeGoals), Number(awayGoals))
  }

  return (
    <div className={`admin-match-card ${match.played ? 'played' : 'pending'} ${isTBD ? 'admin-match-tbd' : ''}`}>
      <span className="admin-match-team admin-match-home">
        {match.home !== 'TBD' ? (
          <>
            <img src={`/players/${match.home.toLowerCase()}.png`} alt={match.home} className="avatar" />
            {match.home}
          </>
        ) : (
          <span className="admin-tbd-label">Por definir</span>
        )}
      </span>

      <div className="admin-match-center">
        <input
          type="number" min="0" max="99"
          value={homeGoals}
          onChange={e => setHomeGoals(e.target.value)}
          className="admin-score-input"
          placeholder="–"
          disabled={isTBD}
        />
        <span className="admin-score-sep">-</span>
        <input
          type="number" min="0" max="99"
          value={awayGoals}
          onChange={e => setAwayGoals(e.target.value)}
          className="admin-score-input"
          placeholder="–"
          disabled={isTBD}
        />
      </div>

      <span className="admin-match-team admin-match-away">
        {match.away !== 'TBD' ? (
          <>
            {match.away}
            <img src={`/players/${match.away.toLowerCase()}.png`} alt={match.away} className="avatar" />
          </>
        ) : (
          <span className="admin-tbd-label">Por definir</span>
        )}
      </span>

      <div className="admin-match-actions">
        <button className="admin-btn-save" onClick={handleSave} disabled={!canSave}>
          Guardar
        </button>
        {match.played && (
          <button className="admin-btn-reset" onClick={onReset}>
            Resetear
          </button>
        )}
      </div>

      {!isTBD && homeGoals !== '' && awayGoals !== '' && Number(homeGoals) === Number(awayGoals) && (
        <p className="admin-copa-no-draw">⚖️ Empate: clasifica el mejor ubicado en la tabla de la liga</p>
      )}
    </div>
  )
}
