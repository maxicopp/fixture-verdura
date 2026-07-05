'use client'

import { useState, useEffect } from 'react'
import Confetti from './Confetti'
import { Sk } from './Skeleton'

const PLAYER_COLORS = {
  Max:     '#4f6df5',
  Gayco:   '#d97706',
  Vulvega: '#10b981',
  Nacho:   '#ef6c6c',
  Kevin:   '#6388f8',
  Negro:   '#64748b',
}
const getColor = name => PLAYER_COLORS[name] ?? '#9ca3af'

export default function RecopaBracket() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    fetch('/api/recopa')
      .then(r => r.json())
      .then(d => {
        if (d.error && !d.exists) {
          setError('no-recopa')
          // Guardar contexto de campeones para mostrar estado
          if (d.context) setData({ context: d.context })
        } else {
          setData(d)
        }
      })
      .catch(() => setError('error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="copa-bracket" aria-busy="true">
        <div className="bracket-hero" style={{ minHeight: 120 }}>
          <div className="bracket-hero-bg" aria-hidden />
          <div className="bracket-hero-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Sk style={{ height: 11, width: 160 }} rounded />
            <Sk style={{ height: 26, width: 240 }} rounded />
            <Sk style={{ height: 28, width: 160, borderRadius: 100 }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '1.5rem 1rem' }}>
          <div className="mc mc-pending">
            <div className="mc-row mc-row-tbd"><Sk circle style={{ width: 28, height: 28 }} /><Sk style={{ height: 12, width: 100 }} rounded /></div>
            <div className="mc-divider" />
            <div className="mc-row mc-row-tbd"><Sk circle style={{ width: 28, height: 28 }} /><Sk style={{ height: 12, width: 80 }} rounded /></div>
          </div>
        </div>
      </div>
    )
  }

  if (error === 'no-recopa') {
    const ctx = data?.context
    const hasLeague = !!ctx?.leagueChampion
    const hasCopa = !!ctx?.copaChampion
    const copaInProgress = ctx?.copaStatus === 'active'

    return (
      <div className="copa-bracket">
        <div className="bracket-hero">
          <div className="bracket-hero-bg" aria-hidden />
          <div className="bracket-hero-content">
            <span className="bracket-eyebrow">Recopa</span>
            <h2 className="bracket-hero-title">Recopa Los Verduras</h2>
            <span className="bracket-status-live" style={{ opacity: 0.7 }}>⏳ Pendiente</span>
          </div>
        </div>

        <div className="recopa-pending-info">
          <p className="recopa-pending-desc">
            La Recopa enfrenta al campeón de Liga contra el campeón de Copa en un partido final con alargue y penales.
          </p>
          {hasLeague && (
            <div className="recopa-pending-participant">
              <img src={`/players/${ctx.leagueChampion.toLowerCase()}.png`} alt={ctx.leagueChampion} className="recopa-pending-avatar" />
              <div className="recopa-pending-participant-info">
                <span className="recopa-pending-participant-name">{ctx.leagueChampion}</span>
                <span className="recopa-pending-participant-label">⚽ Campeón de Liga · {ctx.leagueSeason}</span>
              </div>
              <span className="recopa-pending-check">✓</span>
            </div>
          )}
          <div className={`recopa-pending-participant ${!hasCopa ? 'recopa-pending-participant-waiting' : ''}`}>
            {hasCopa ? (
              <>
                <img src={`/players/${ctx.copaChampion.toLowerCase()}.png`} alt={ctx.copaChampion} className="recopa-pending-avatar" />
                <div className="recopa-pending-participant-info">
                  <span className="recopa-pending-participant-name">{ctx.copaChampion}</span>
                  <span className="recopa-pending-participant-label">🏆 Campeón de Copa · {ctx.copaSeason}</span>
                </div>
                <span className="recopa-pending-check">✓</span>
              </>
            ) : (
              <>
                <div className="recopa-pending-avatar-placeholder">?</div>
                <div className="recopa-pending-participant-info">
                  <span className="recopa-pending-participant-name">Por definir</span>
                  <span className="recopa-pending-participant-label">
                    🏆 Campeón de Copa · {copaInProgress ? 'Copa en curso...' : 'Sin copa disputada'}
                  </span>
                </div>
                {copaInProgress && <span className="recopa-pending-live">🟢</span>}
              </>
            )}
          </div>

          {hasLeague && hasCopa && ctx.leagueChampion === ctx.copaChampion && (
            <p className="recopa-pending-auto-note">
              ⚡ Mismo campeón en ambos torneos — la Recopa se otorga automáticamente.
            </p>
          )}
        </div>
      </div>
    )
  }
  if (error || !data) {
    return <div className="copa-bracket"><div className="bracket-empty"><div className="bracket-empty-icon">⚠️</div><p className="bracket-empty-sub">Error al cargar la Recopa.</p></div></div>
  }

  const { tournament, match, champion, players } = data
  const isFinished = tournament.status === 'finished'
  const isAutoWin = isFinished && match && !match.played

  return (
    <div className="copa-bracket">
      {isFinished && champion && !isAutoWin && <Confetti active duration={6000} />}

      {/* Hero */}
      <div className="bracket-hero">
        <div className="bracket-hero-bg" aria-hidden />
        <div className="bracket-hero-content">
          <span className="bracket-eyebrow">Recopa · {tournament.season}</span>
          <h2 className="bracket-hero-title">{tournament.name}</h2>
          {isFinished && champion
            ? <div className="bracket-champion-pill">
                <img src={`/players/${champion.toLowerCase()}.png`} alt={champion} className="bracket-champ-pill-avatar" />
                <span>👑 Campeón: <strong>{champion}</strong></span>
              </div>
            : <span className="bracket-status-live">🟢 En curso</span>
          }
        </div>
      </div>

      {/* Auto-win banner */}
      {isAutoWin && (
        <div className="recopa-auto-win">
          <div className="recopa-auto-win-icon">🏆🏆</div>
          <h3 className="recopa-auto-win-title">Recopa otorgada automáticamente</h3>
          <p className="recopa-auto-win-text">
            <strong>{champion}</strong> ganó tanto la Liga como la Copa, por lo que se le otorga la Recopa sin necesidad de disputar el partido.
          </p>
        </div>
      )}

      {/* Match card — solo si no es auto-win */}
      {!isAutoWin && match && (
        <div className="copa-stages-wrap">
          <div className="copa-stage copa-stage-final">
            <div className="copa-stage-header">
              <span className="copa-stage-label">🏅 Final de la Recopa</span>
              <span className="copa-stage-sublabel">Alargue · Penales si necesario</span>
            </div>
            <div className="copa-stage-cards">
              <div className={`mc ${match.played ? 'mc-done' : 'mc-pending'} mc-final`}>
                {/* Home */}
                <div className={`mc-row ${match.played && getWinner(match) === match.home ? 'mc-row-winner' : ''} ${match.played && getWinner(match) !== match.home ? 'mc-row-loser' : ''}`}>
                  <div className="mc-seed" style={{ background: getColor(match.home) }}>
                    <span role="img" aria-label="Liga">⚽</span>
                  </div>
                  <img src={`/players/${match.home.toLowerCase()}.png`} alt={match.home} className="mc-avatar" />
                  <span className="mc-name">{match.home}</span>
                  <span className="mc-spacer" />
                  {match.played && (
                    <span className={`mc-score ${getWinner(match) === match.home ? 'mc-score-win' : ''}`}>
                      {match.homeGoals}
                      {match.penaltyWinner && <sup className="mc-pen-sup">({match.homePenalties})</sup>}
                    </span>
                  )}
                  {match.played && getWinner(match) === match.home && <span className="mc-check">✓</span>}
                </div>

                <div className="mc-divider" />

                {/* Away */}
                <div className={`mc-row ${match.played && getWinner(match) === match.away ? 'mc-row-winner' : ''} ${match.played && getWinner(match) !== match.away ? 'mc-row-loser' : ''}`}>
                  <div className="mc-seed" style={{ background: getColor(match.away) }}>
                    <span role="img" aria-label="Copa">🏆</span>
                  </div>
                  <img src={`/players/${match.away.toLowerCase()}.png`} alt={match.away} className="mc-avatar" />
                  <span className="mc-name">{match.away}</span>
                  <span className="mc-spacer" />
                  {match.played && (
                    <span className={`mc-score ${getWinner(match) === match.away ? 'mc-score-win' : ''}`}>
                      {match.awayGoals}
                      {match.penaltyWinner && <sup className="mc-pen-sup">({match.awayPenalties})</sup>}
                    </span>
                  )}
                  {match.played && getWinner(match) === match.away && <span className="mc-check">✓</span>}
                </div>

                {/* Notes */}
                {!match.played && (
                  <div className="mc-note">⏱ Alargue · Penales si necesario</div>
                )}
                {match.played && match.penaltyWinner && (
                  <div className="mc-note mc-note-pen">🎯 {match.penaltyWinner} gana en penales</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Participants legend */}
      {!isAutoWin && players && players.length === 2 && (
        <div className="bracket-seeds-bar">
          <div className="bracket-seed-chip">
            <div className="bracket-seed-num" style={{ background: getColor(players[0]?.name) }}>⚽</div>
            <img src={`/players/${players[0]?.name.toLowerCase()}.png`} alt={players[0]?.name} className="bracket-seed-chip-avatar" />
            <span className="bracket-seed-chip-name">{players[0]?.name}</span>
            <span className="bracket-seed-bye-tag">Liga</span>
          </div>
          <div className="bracket-seed-chip">
            <div className="bracket-seed-num" style={{ background: getColor(players[1]?.name) }}>🏆</div>
            <img src={`/players/${players[1]?.name.toLowerCase()}.png`} alt={players[1]?.name} className="bracket-seed-chip-avatar" />
            <span className="bracket-seed-chip-name">{players[1]?.name}</span>
            <span className="bracket-seed-bye-tag">Copa</span>
          </div>
        </div>
      )}

      {/* Champion panel */}
      {isFinished && champion && (
        <div className="bracket-champion-panel">
          <div className="bracket-champion-glow" aria-hidden />
          <div className="bracket-champion-trophy">🏅</div>
          <img src={`/players/${champion.toLowerCase()}.png`} alt={champion} className="bracket-champion-avatar" />
          <div className="bracket-champion-info">
            <p className="bracket-champion-label">Campeón de la Recopa</p>
            <h3 className="bracket-champion-name">{champion}</h3>
          </div>
        </div>
      )}
    </div>
  )
}

function getWinner(match) {
  if (!match || !match.played) return null
  if (match.homeGoals > match.awayGoals) return match.home
  if (match.awayGoals > match.homeGoals) return match.away
  return match.penaltyWinner ?? null
}
