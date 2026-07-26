'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Standings from '../components/Standings'
import { calcStandings } from '../lib/fixture'
import type { Round, Standing, Match, CopaBracketMatch, RecopaMatch, Tournament } from '../types'

// ─── Confirm Modal Component ─────────────────────────────────────────────────

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  details?: React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger' | 'warning'
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({
  isOpen,
  title,
  message,
  details,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onCancel()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h3 className="confirm-modal-title">{title}</h3>
        </div>
        <div className="confirm-modal-body">
          <p className="confirm-modal-message">{message}</p>
          {details && <div className="confirm-modal-details">{details}</div>}
        </div>
        <div className="confirm-modal-footer">
          <button className="confirm-modal-btn confirm-modal-btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button 
            className={`confirm-modal-btn confirm-modal-btn-confirm confirm-modal-btn-${variant}`} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

interface CopaDataState {
  tournament: Tournament
  matches: CopaBracketMatch[]
  champion: string | null
  players: Array<{ name: string; seed: number }>
}

interface RecopaDataState {
  tournament: Tournament
  match: RecopaMatch | null
  champion: string | null
  players: Array<{ name: string; seed: number }>
}

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

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
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

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [players, setPlayers] = useState<string[]>([])
  const [fixture, setFixture] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('fixture')
  const [notification, setNotification] = useState('')

  // Copa state
  const [copaData, setCopaData] = useState<CopaDataState | null>(null)
  const [copaLoading, setCopaLoading] = useState(false)

  // Recopa state
  const [recopaData, setRecopaData] = useState<RecopaDataState | null>(null)
  const [recopaLoading, setRecopaLoading] = useState(false)

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    details?: React.ReactNode
    confirmText?: string
    variant?: 'default' | 'danger' | 'warning'
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const showConfirm = (options: Omit<typeof confirmModal, 'isOpen'>) => {
    setConfirmModal({ ...options, isOpen: true })
  }

  const hideConfirm = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }))
  }

  const notify = (msg: string) => {
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

  const loadRecopa = useCallback(() => {
    setRecopaLoading(true)
    fetch('/api/recopa')
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setRecopaData(data)
        } else {
          setRecopaData(null)
        }
      })
      .catch(() => setRecopaData(null))
      .finally(() => setRecopaLoading(false))
  }, [])

  useEffect(() => { loadData(); loadCopa(); loadRecopa() }, [loadData, loadCopa, loadRecopa])

  const standings = useMemo(() => calcStandings(players, fixture), [fixture, players])

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    onLogout()
  }

  const handleResult = async (roundIdx: number, matchIdx: number, homeGoals: number, awayGoals: number) => {
    const match = fixture[roundIdx].matches[matchIdx]

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
    }
  }

  const handleReset = async (roundIdx: number, matchIdx: number) => {
    const match = fixture[roundIdx].matches[matchIdx]
    
    const doReset = async () => {
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

    showConfirm({
      title: '🔄 Resetear partido',
      message: `¿Resetear el resultado de ${match.home} vs ${match.away}?`,
      confirmText: 'Resetear',
      variant: 'danger',
      onConfirm: () => {
        hideConfirm()
        doReset()
      },
    })
  }

  // ─── Copa handlers ───────────────────────────────────────────────────────

  const handleCreateCopa = async () => {
    if (standings.length < 6) {
      notify('❌ Se necesitan al menos 6 jugadores con partidos jugados')
      return
    }

    const createCopa = async () => {
      try {
        const res = await fetch('/api/copa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Copa Los Verduras',
            season: 'Clausura 2026',
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

    showConfirm({
      title: '🏆 Crear Copa',
      message: '¿Crear la Copa basada en las posiciones actuales del torneo?',
      details: (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <p style={{ margin: '0 0 8px' }}>Se generará el bracket con:</p>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6 }}>
            <li><strong>{standings[0]?.name}</strong> y <strong>{standings[1]?.name}</strong> pasan directo a semis</li>
            <li>Cuartos: {standings[2]?.name} vs {standings[5]?.name}, {standings[3]?.name} vs {standings[4]?.name}</li>
          </ul>
        </div>
      ),
      confirmText: 'Crear Copa',
      variant: 'default',
      onConfirm: () => {
        hideConfirm()
        createCopa()
      },
    })
  }

  const handleCopaResult = async (matchKey: string, homeGoals: number, awayGoals: number, penaltyWinner: string | null = null, homePenalties: number | null = null, awayPenalties: number | null = null) => {
    try {
      const res = await fetch('/api/copa/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_key: matchKey,
          home_goals: homeGoals,
          away_goals: awayGoals,
          penalty_winner: penaltyWinner,
          home_penalties: homePenalties,
          away_penalties: awayPenalties,
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

  const handleCopaReset = async (matchKey: string) => {
    const doReset = async () => {
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

    showConfirm({
      title: '🔄 Resetear partido',
      message: '¿Estás seguro de resetear este partido de Copa?',
      details: (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Se resetearán también los partidos posteriores que dependan de este resultado.
        </p>
      ),
      confirmText: 'Resetear',
      variant: 'danger',
      onConfirm: () => {
        hideConfirm()
        doReset()
      },
    })
  }

  // ─── Recopa handlers ─────────────────────────────────────────────────────

  const handleCreateRecopa = async () => {
    try {
      // Buscar último campeón de liga y copa
      const res = await fetch('/api/tournaments')
      if (!res.ok) {
        notify('❌ Error al cargar los torneos')
        return
      }
      const tournaments: Tournament[] = await res.json()
      
      const lastLeague = tournaments.find(t => t.type === 'league' && t.status === 'finished' && t.champion)
      const lastCopa = tournaments.find(t => t.type === 'copa' && t.status === 'finished' && t.champion)

      // Mensajes de error más específicos
      if (!lastLeague && !lastCopa) {
        notify('❌ Se necesita un campeón de Liga y un campeón de Copa finalizados')
        return
      }
      if (!lastLeague) {
        notify('❌ Se necesita un campeón de Liga (torneo finalizado)')
        return
      }
      if (!lastCopa) {
        // Verificar si hay copa en curso
        const copaActiva = tournaments.find(t => t.type === 'copa' && t.status === 'active')
        if (copaActiva) {
          notify('❌ La Copa aún está en curso. Debe finalizar para crear la Recopa.')
        } else {
          notify('❌ Se necesita un campeón de Copa (torneo finalizado)')
        }
        return
      }

      const leagueChamp = lastLeague.champion
      const copaChamp = lastCopa.champion
      const isAutoWin = leagueChamp === copaChamp

      const createRecopa = async () => {
        try {
          const createRes = await fetch('/api/recopa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Recopa Los Verduras',
              season: lastLeague.season || 'Clausura 2026',
              year: lastLeague.year || 2026,
              league_champion: leagueChamp,
              copa_champion: copaChamp,
            }),
          })
          const data = await createRes.json()
          if (data.id) {
            notify(data.autoWin ? `🏅 Recopa otorgada a ${data.champion}` : '🏅 Recopa creada exitosamente')
            loadRecopa()
          } else {
            notify(`❌ ${data.error || 'Error al crear recopa'}`)
          }
        } catch {
          notify('❌ Error de conexión')
        }
      }

      showConfirm({
        title: '🏅 Crear Recopa',
        message: isAutoWin 
          ? 'El mismo jugador ganó ambos torneos. La Recopa se otorgará automáticamente.'
          : '¿Crear la Recopa con estos participantes?',
        details: isAutoWin ? (
          <div className="confirm-modal-auto-win">
            <span className="confirm-modal-auto-win-icon">🏆</span>
            <p className="confirm-modal-auto-win-text">
              <strong>{leagueChamp}</strong> ganó la Liga y la Copa, 
              por lo que se le otorga la Recopa directamente.
            </p>
          </div>
        ) : (
          <div className="confirm-modal-match-preview">
            <div className="confirm-modal-player">
              <img 
                src={`/players/${leagueChamp?.toLowerCase()}.png`} 
                alt={leagueChamp || ''} 
                className="confirm-modal-player-avatar"
              />
              <span className="confirm-modal-player-name">{leagueChamp}</span>
              <span className="confirm-modal-player-label">Campeón Liga</span>
            </div>
            <span className="confirm-modal-vs">VS</span>
            <div className="confirm-modal-player">
              <img 
                src={`/players/${copaChamp?.toLowerCase()}.png`} 
                alt={copaChamp || ''} 
                className="confirm-modal-player-avatar"
              />
              <span className="confirm-modal-player-name">{copaChamp}</span>
              <span className="confirm-modal-player-label">Campeón Copa</span>
            </div>
          </div>
        ),
        confirmText: isAutoWin ? 'Otorgar Recopa' : 'Crear Recopa',
        variant: 'default',
        onConfirm: () => {
          hideConfirm()
          createRecopa()
        },
      })
    } catch {
      notify('❌ Error de conexión')
    }
  }

  const handleRecopaResult = async (homeGoals: number, awayGoals: number, penaltyWinner: string | null = null, homePenalties: number | null = null, awayPenalties: number | null = null) => {
    try {
      const res = await fetch('/api/recopa/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home_goals: homeGoals,
          away_goals: awayGoals,
          penalty_winner: penaltyWinner,
          home_penalties: homePenalties,
          away_penalties: awayPenalties,
          tournament_id: recopaData?.tournament?.id,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        notify(`🏅 ${data.winner} gana la Recopa!`)
        loadRecopa()
      } else {
        notify(`❌ ${data.error || 'Error al guardar'}`)
      }
    } catch {
      notify('❌ Error de conexión')
    }
  }

  const handleRecopaReset = async () => {
    const doReset = async () => {
      try {
        const res = await fetch('/api/recopa/reset-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tournament_id: recopaData?.tournament?.id,
          }),
        })
        const data = await res.json()
        if (data.ok) {
          notify('🔄 Recopa reseteada')
          loadRecopa()
        } else {
          notify(`❌ ${data.error}`)
        }
      } catch {
        notify('❌ Error de conexión')
      }
    }

    showConfirm({
      title: '🔄 Resetear Recopa',
      message: '¿Estás seguro de resetear el resultado de la Recopa?',
      confirmText: 'Resetear',
      variant: 'danger',
      onConfirm: () => {
        hideConfirm()
        doReset()
      },
    })
  }

  if (loading) {
    return <div className="app"><div className="loading">Cargando torneo...</div></div>
  }

  const totalMatches = fixture.reduce((acc, r) => acc + r.matches.length, 0)
  const playedMatches = fixture.reduce((acc, r) => acc + r.matches.filter(m => m.played).length, 0)
  const progress = totalMatches > 0 ? Math.round((playedMatches / totalMatches) * 100) : 0

  return (
    <div className="app">
      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        details={confirmModal.details}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={hideConfirm}
      />

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
        <h1>Clausura 2026</h1>
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
          { key: 'recopa', label: '🏅 Recopa' },
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
        {activeTab === 'recopa' && (
          <AdminRecopa
            recopaData={recopaData}
            recopaLoading={recopaLoading}
            onCreateRecopa={handleCreateRecopa}
            onResult={handleRecopaResult}
            onReset={handleRecopaReset}
          />
        )}
      </main>
    </div>
  )
}

// ─── Admin Fixture (editable) ────────────────────────────────────────────────

function AdminFixture({ fixture, onResult, onReset }: { fixture: Round[]; onResult: (ri: number, mi: number, h: number, a: number) => void; onReset: (ri: number, mi: number) => void }) {
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
              <span className="round-chevron">▼</span>
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

function AdminMatchCard({ match, onSave, onReset }: { match: Match; onSave: (h: number, a: number) => void; onReset: () => void }) {
  const [homeGoals, setHomeGoals] = useState<string | number>(match.played ? match.homeGoals ?? '' : '')
  const [awayGoals, setAwayGoals] = useState<string | number>(match.played ? match.awayGoals ?? '' : '')

  useEffect(() => {
    setHomeGoals(match.played ? match.homeGoals ?? '' : '')
    setAwayGoals(match.played ? match.awayGoals ?? '' : '')
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
          {match.played ? 'Actualizar' : 'Guardar'}
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

const STAGE_LABELS: Record<string, string> = {
  quarterfinal: '⚔️ Cuartos de Final',
  semifinal: '🔥 Semifinales',
  final: '🏆 Final',
}

function AdminCopa({ copaData, copaLoading, standings, onCreateCopa, onResult, onReset }: {
  copaData: CopaDataState | null
  copaLoading: boolean
  standings: Standing[]
  onCreateCopa: () => void
  onResult: (matchKey: string, hg: number, ag: number, pw: string | null, hp: number | null, ap: number | null) => void
  onReset: (matchKey: string) => void
}) {
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
                onSave={(hg, ag, pw, hp, ap) => onResult(match.id, hg, ag, pw, hp, ap)}
                onReset={() => onReset(match.id)}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function AdminCopaMatchCard({ match, onSave, onReset }: {
  match: CopaBracketMatch
  onSave: (hg: number, ag: number, pw: string | null, hp: number | null, ap: number | null) => void
  onReset: () => void
}) {
  const [homeGoals, setHomeGoals] = useState<string | number>(match.played ? match.homeGoals ?? '' : '')
  const [awayGoals, setAwayGoals] = useState<string | number>(match.played ? match.awayGoals ?? '' : '')
  const [penaltyWinner, setPenaltyWinner] = useState(match.penaltyWinner ?? null)
  const [homePen, setHomePen]     = useState(match.homePenalties ?? '')
  const [awayPen, setAwayPen]     = useState(match.awayPenalties ?? '')

  useEffect(() => {
    setHomeGoals(match.played ? match.homeGoals ?? '' : '')
    setAwayGoals(match.played ? match.awayGoals ?? '' : '')
    setPenaltyWinner(match.penaltyWinner ?? null)
    setHomePen(match.homePenalties ?? '')
    setAwayPen(match.awayPenalties ?? '')
  }, [match.played, match.homeGoals, match.awayGoals, match.penaltyWinner, match.homePenalties, match.awayPenalties])

  const isTBD  = !match.home || match.home === 'TBD' || !match.away || match.away === 'TBD'
  const isQF   = match.id?.startsWith('qf')
  const isDraw = homeGoals !== '' && awayGoals !== '' && Number(homeGoals) === Number(awayGoals)
  const needsPenalty = !isQF && isDraw

  const penaltiesValid = !needsPenalty || (
    penaltyWinner &&
    homePen !== '' && awayPen !== '' &&
    Number(homePen) >= 0 && Number(awayPen) >= 0 &&
    Number(homePen) !== Number(awayPen) &&
    (Number(homePen) > Number(awayPen) ? match.home : match.away) === penaltyWinner
  )

  const canSave = !isTBD && homeGoals !== '' && awayGoals !== '' &&
    Number(homeGoals) >= 0 && Number(awayGoals) >= 0 && penaltiesValid

  const handleSave = () => {
    if (!canSave) return
    onSave(
      Number(homeGoals), Number(awayGoals),
      needsPenalty ? penaltyWinner : null,
      needsPenalty ? Number(homePen) : null,
      needsPenalty ? Number(awayPen) : null,
    )
  }

  return (
    <div className={`admin-match-card ${match.played ? 'played' : 'pending'} ${isTBD ? 'admin-match-tbd' : ''}`}>
      <span className="admin-match-team admin-match-home">
        {match.home && match.home !== 'TBD' ? (
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
          onChange={e => { setHomeGoals(e.target.value); setPenaltyWinner(null); setHomePen(''); setAwayPen('') }}
          className="admin-score-input"
          placeholder="–"
          disabled={isTBD}
        />
        <span className="admin-score-sep">-</span>
        <input
          type="number" min="0" max="99"
          value={awayGoals}
          onChange={e => { setAwayGoals(e.target.value); setPenaltyWinner(null); setHomePen(''); setAwayPen('') }}
          className="admin-score-input"
          placeholder="–"
          disabled={isTBD}
        />
      </div>

      <span className="admin-match-team admin-match-away">
        {match.away && match.away !== 'TBD' ? (
          <>
            {match.away}
            <img src={`/players/${match.away.toLowerCase()}.png`} alt={match.away} className="avatar" />
          </>
        ) : (
          <span className="admin-tbd-label">Por definir</span>
        )}
      </span>

      {/* Penalty inputs — appear only for SF/Final draws on non-TBD matches */}
      {needsPenalty && !isTBD && (
        <div className="admin-penalty-selector">
          <span className="admin-penalty-label">🎯 Penales (marcador):</span>
          <div className="admin-penalty-score-row">
            <span className="admin-penalty-player-label">{match.home !== 'TBD' ? match.home : '–'}</span>
            <input
              type="number" min="0" max="99"
              value={homePen}
              onChange={e => {
                const v = e.target.value
                setHomePen(v)
                if (v !== '' && awayPen !== '') {
                  setPenaltyWinner(Number(v) > Number(awayPen) ? match.home : Number(awayPen) > Number(v) ? match.away : null)
                }
              }}
              className="admin-score-input"
              placeholder="–"
            />
            <span className="admin-score-sep">-</span>
            <input
              type="number" min="0" max="99"
              value={awayPen}
              onChange={e => {
                const v = e.target.value
                setAwayPen(v)
                if (homePen !== '' && v !== '') {
                  setPenaltyWinner(Number(v) > Number(homePen) ? match.away : Number(homePen) > Number(v) ? match.home : null)
                }
              }}
              className="admin-score-input"
              placeholder="–"
            />
            <span className="admin-penalty-player-label">{match.away !== 'TBD' ? match.away : '–'}</span>
          </div>
          {penaltyWinner && (
            <span className="admin-penalty-winner-note">✓ Gana <strong>{penaltyWinner}</strong></span>
          )}
          {homePen !== '' && awayPen !== '' && Number(homePen) === Number(awayPen) && (
            <span className="admin-penalty-winner-note" style={{ color: 'var(--danger)' }}>Los penales no pueden empatar</span>
          )}
        </div>
      )}

      {/* Already played with penalties */}
      {match.played && match.penaltyWinner && match.home && match.away && match.home !== 'TBD' && match.away !== 'TBD' && (
        <p className="admin-copa-penalty-note">
          🎯 Penales: {match.home} {match.homePenalties ?? '?'} – {match.awayPenalties ?? '?'} {match.away} · Gana <strong>{match.penaltyWinner}</strong>
        </p>
      )}

      {/* QF draw note */}
      {isQF && isDraw && (
        <p className="admin-copa-no-draw">⚖️ Empate: clasifica el mejor ubicado en la tabla de la liga</p>
      )}

      <div className="admin-match-actions">
        <button className="admin-btn-save" onClick={handleSave} disabled={!canSave}>
          {match.played ? 'Actualizar' : 'Guardar'}
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

// ─── Admin Recopa ────────────────────────────────────────────────────────────

function AdminRecopa({ recopaData, recopaLoading, onCreateRecopa, onResult, onReset }: {
  recopaData: RecopaDataState | null
  recopaLoading: boolean
  onCreateRecopa: () => void
  onResult: (hg: number, ag: number, pw: string | null, hp: number | null, ap: number | null) => void
  onReset: () => void
}) {
  if (recopaLoading) {
    return <div className="loading">Cargando Recopa...</div>
  }

  if (!recopaData) {
    return (
      <div className="admin-copa-create">
        <div className="admin-copa-create-header">
          <span className="admin-copa-create-icon">🏅</span>
          <h3>Crear Recopa</h3>
          <p>Enfrentamiento entre el último campeón de Liga y el último campeón de Copa</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Si el mismo jugador ganó ambos títulos, la Recopa se otorga automáticamente.
          </p>
        </div>

        <button className="admin-btn-create-copa" onClick={onCreateRecopa}>
          🏅 Crear Recopa
        </button>
      </div>
    )
  }

  // Recopa existe
  const { tournament, match, champion } = recopaData
  const isAutoWin = tournament.status === 'finished' && match && !match.played

  return (
    <div className="admin-copa">
      <div className="admin-copa-header">
        <h2>🏅 {tournament.name}</h2>
        <p>{tournament.season} {tournament.year} — {tournament.status === 'finished' ? '✅ Finalizada' : '🟢 En curso'}</p>
        {champion && <p className="admin-copa-champion">👑 Campeón: <strong>{champion}</strong></p>}
        {isAutoWin && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            ⚡ Otorgada automáticamente (mismo campeón de Liga y Copa)
          </p>
        )}
      </div>

      {!isAutoWin && match && (
        <div className="admin-copa-stage">
          <h3 className="admin-copa-stage-title">🏅 Final de la Recopa</h3>
          <AdminRecopaMatchCard
            match={match}
            onSave={(hg, ag, pw, hp, ap) => onResult(hg, ag, pw, hp, ap)}
            onReset={onReset}
          />
        </div>
      )}
    </div>
  )
}

function AdminRecopaMatchCard({ match, onSave, onReset }: {
  match: RecopaMatch
  onSave: (hg: number, ag: number, pw: string | null, hp: number | null, ap: number | null) => void
  onReset: () => void
}) {
  const [homeGoals, setHomeGoals] = useState<string | number>(match.played ? match.homeGoals ?? '' : '')
  const [awayGoals, setAwayGoals] = useState<string | number>(match.played ? match.awayGoals ?? '' : '')
  const [penaltyWinner, setPenaltyWinner] = useState(match.penaltyWinner ?? null)
  const [homePen, setHomePen]     = useState(match.homePenalties ?? '')
  const [awayPen, setAwayPen]     = useState(match.awayPenalties ?? '')

  useEffect(() => {
    setHomeGoals(match.played ? match.homeGoals ?? '' : '')
    setAwayGoals(match.played ? match.awayGoals ?? '' : '')
    setPenaltyWinner(match.penaltyWinner ?? null)
    setHomePen(match.homePenalties ?? '')
    setAwayPen(match.awayPenalties ?? '')
  }, [match.played, match.homeGoals, match.awayGoals, match.penaltyWinner, match.homePenalties, match.awayPenalties])

  const isDraw = homeGoals !== '' && awayGoals !== '' && Number(homeGoals) === Number(awayGoals)
  const needsPenalty = isDraw

  const penaltiesValid = !needsPenalty || (
    penaltyWinner &&
    homePen !== '' && awayPen !== '' &&
    Number(homePen) >= 0 && Number(awayPen) >= 0 &&
    Number(homePen) !== Number(awayPen) &&
    (Number(homePen) > Number(awayPen) ? match.home : match.away) === penaltyWinner
  )

  const canSave = homeGoals !== '' && awayGoals !== '' &&
    Number(homeGoals) >= 0 && Number(awayGoals) >= 0 && penaltiesValid

  const handleSave = () => {
    if (!canSave) return
    onSave(
      Number(homeGoals), Number(awayGoals),
      needsPenalty ? penaltyWinner : null,
      needsPenalty ? Number(homePen) : null,
      needsPenalty ? Number(awayPen) : null,
    )
  }

  return (
    <div className={`admin-match-card ${match.played ? 'played' : 'pending'}`}>
      <span className="admin-match-team admin-match-home">
        <img src={`/players/${match.home.toLowerCase()}.png`} alt={match.home} className="avatar" />
        {match.home}
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 4 }}>(Liga)</span>
      </span>

      <div className="admin-match-center">
        <input
          type="number" min="0" max="99"
          value={homeGoals}
          onChange={e => { setHomeGoals(e.target.value); setPenaltyWinner(null); setHomePen(''); setAwayPen('') }}
          className="admin-score-input"
          placeholder="–"
        />
        <span className="admin-score-sep">-</span>
        <input
          type="number" min="0" max="99"
          value={awayGoals}
          onChange={e => { setAwayGoals(e.target.value); setPenaltyWinner(null); setHomePen(''); setAwayPen('') }}
          className="admin-score-input"
          placeholder="–"
        />
      </div>

      <span className="admin-match-team admin-match-away">
        {match.away}
        <img src={`/players/${match.away.toLowerCase()}.png`} alt={match.away} className="avatar" />
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 4 }}>(Copa)</span>
      </span>

      {/* Penalty inputs on draw */}
      {needsPenalty && (
        <div className="admin-penalty-selector">
          <span className="admin-penalty-label">🎯 Penales (marcador):</span>
          <div className="admin-penalty-score-row">
            <span className="admin-penalty-player-label">{match.home}</span>
            <input
              type="number" min="0" max="99"
              value={homePen}
              onChange={e => {
                const v = e.target.value
                setHomePen(v)
                if (v !== '' && awayPen !== '') {
                  setPenaltyWinner(Number(v) > Number(awayPen) ? match.home : Number(awayPen) > Number(v) ? match.away : null)
                }
              }}
              className="admin-score-input"
              placeholder="–"
            />
            <span className="admin-score-sep">-</span>
            <input
              type="number" min="0" max="99"
              value={awayPen}
              onChange={e => {
                const v = e.target.value
                setAwayPen(v)
                if (homePen !== '' && v !== '') {
                  setPenaltyWinner(Number(v) > Number(homePen) ? match.away : Number(homePen) > Number(v) ? match.home : null)
                }
              }}
              className="admin-score-input"
              placeholder="–"
            />
            <span className="admin-penalty-player-label">{match.away}</span>
          </div>
          {penaltyWinner && (
            <span className="admin-penalty-winner-note">✓ Gana <strong>{penaltyWinner}</strong></span>
          )}
          {homePen !== '' && awayPen !== '' && Number(homePen) === Number(awayPen) && (
            <span className="admin-penalty-winner-note" style={{ color: 'var(--danger)' }}>Los penales no pueden empatar</span>
          )}
        </div>
      )}

      {/* Already played with penalties */}
      {match.played && match.penaltyWinner && (
        <p className="admin-copa-penalty-note">
          🎯 Penales: {match.home} {match.homePenalties ?? '?'} – {match.awayPenalties ?? '?'} {match.away} · Gana <strong>{match.penaltyWinner}</strong>
        </p>
      )}

      <div className="admin-match-actions">
        <button className="admin-btn-save" onClick={handleSave} disabled={!canSave}>
          {match.played ? 'Actualizar' : 'Guardar'}
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
