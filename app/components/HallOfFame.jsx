'use client'

import { useState, useEffect } from 'react'

export default function HallOfFame() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/hall-of-fame')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="hall-loading">Cargando Salón de la Gloria...</div>
  }

  if (!data || data.champions.length === 0) {
    return (
      <div className="hall-empty">
        <span className="hall-empty-icon">🏛️</span>
        <p>Todavía no hay campeones registrados.</p>
        <p className="hall-empty-sub">Cuando termine el primer torneo, aparecerá acá.</p>
      </div>
    )
  }

  const { champions, titleCounts, allTimeScorers } = data

  return (
    <div className="hall-of-fame">
      {/* Header */}
      <div className="hall-header">
        <span className="hall-header-icon">🏛️</span>
        <h2 className="hall-title">Salón de la Gloria</h2>
        <p className="hall-subtitle">Los inmortales del torneo</p>
      </div>

      {/* Palmarés — títulos por jugador */}
      <div className="hall-section">
        <h3 className="hall-section-title">
          <span>👑</span> Palmarés
        </h3>
        <div className="palmares-grid">
          {titleCounts.map((player, i) => (
            <div key={player.name} className={`palmares-card ${i === 0 ? 'palmares-leader' : ''}`}>
              <div className="palmares-rank">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </div>
              <img
                src={`/players/${player.name.toLowerCase()}.png`}
                alt={player.name}
                className="palmares-avatar"
              />
              <div className="palmares-info">
                <span className="palmares-name">{player.name}</span>
                <span className="palmares-titles">
                  {player.titles} {player.titles === 1 ? 'título' : 'títulos'}
                  <span className="palmares-stars">
                    {'⭐'.repeat(Math.min(player.titles, 5))}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historial de campeones */}
      <div className="hall-section">
        <h3 className="hall-section-title">
          <span>🏆</span> Historial de Campeones
        </h3>
        <div className="history-timeline">
          {champions.map((t, i) => (
            <div key={t.id} className={`history-item ${i === 0 ? 'history-latest' : ''}`}>
              <div className="history-year-badge">
                <span className="history-season">{t.season}</span>
              </div>
              <div className="history-content">
                <div className="history-champion-row">
                  <img
                    src={`/players/${t.champion.toLowerCase()}.png`}
                    alt={t.champion}
                    className="history-avatar"
                  />
                  <div className="history-details">
                    <span className="history-champion-name">{t.champion}</span>
                    <span className="history-tournament-name">{t.name}</span>
                  </div>
                  <span className="history-trophy">🏆</span>
                </div>
                {t.top_scorer && (
                  <div className="history-scorer">
                    <span className="history-scorer-icon">⚽</span>
                    <span className="history-scorer-text">
                      Goleador: <strong>{t.top_scorer}</strong> ({t.top_scorer_goals} goles)
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Goleadores históricos */}
      <div className="hall-section">
        <h3 className="hall-section-title">
          <span>⚽</span> Goleadores Históricos
        </h3>
        <div className="scorers-list">
          {allTimeScorers.slice(0, 6).map((scorer, i) => {
            const maxGoals = allTimeScorers[0]?.goals || 1
            const pct = (scorer.goals / maxGoals) * 100
            return (
              <div key={scorer.name} className="scorer-row">
                <span className="scorer-pos">{i + 1}</span>
                <img
                  src={`/players/${scorer.name.toLowerCase()}.png`}
                  alt={scorer.name}
                  className="scorer-avatar"
                />
                <span className="scorer-name">{scorer.name}</span>
                <div className="scorer-bar-track">
                  <div
                    className="scorer-bar-fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="scorer-goals">{scorer.goals}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
