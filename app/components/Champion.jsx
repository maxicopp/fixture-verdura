'use client'

import { useState, useEffect } from 'react'
import Confetti from './Confetti'

export default function Champion({ champion, standings }) {
  const [visible, setVisible]         = useState(false)
  const [confettiOn, setConfettiOn]   = useState(false)
  const [dismissed, setDismissed]     = useState(false)

  // Entrada progresiva
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 80)
    const t2 = setTimeout(() => setConfettiOn(true), 300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const stats = standings.find(s => s.name === champion.name)

  if (dismissed) return null

  return (
    <>
      <Confetti active={confettiOn} duration={7000} />

      <div className={`champion-wrapper ${visible ? 'champion-visible' : ''}`}>
        {/* Glow radial de fondo */}
        <div className="champion-glow" aria-hidden="true" />

        {/* Estrellas decorativas */}
        <div className="champion-stars" aria-hidden="true">
          {['★', '✦', '★', '✦', '★'].map((s, i) => (
            <span key={i} className={`champion-star champion-star-${i}`}>{s}</span>
          ))}
        </div>

        {/* Cabecera */}
        <div className="champion-eyebrow">
          <span className="champion-trophy-icon">🏆</span>
          <span className="champion-eyebrow-text">Campeón del Torneo</span>
          <span className="champion-trophy-icon">🏆</span>
        </div>

        <h2 className="champion-title">Torneo Los Verduras<br />Apertura 2026</h2>

        {/* Avatar del campeón */}
        <div className="champion-avatar-wrap">
          <div className="champion-avatar-ring" />
          <img
            src={`/players/${champion.name.toLowerCase()}.png`}
            alt={champion.name}
            className="champion-avatar"
          />
          <div className="champion-crown">👑</div>
        </div>

        {/* Nombre */}
        <p className="champion-name">{champion.name}</p>

        {/* Stats del campeón */}
        {stats && (
          <div className="champion-stats">
            <div className="champ-stat">
              <span className="champ-stat-val">{stats.pts}</span>
              <span className="champ-stat-label">Puntos</span>
            </div>
            <div className="champ-stat-divider" />
            <div className="champ-stat">
              <span className="champ-stat-val">{stats.pg}</span>
              <span className="champ-stat-label">Victorias</span>
            </div>
            <div className="champ-stat-divider" />
            <div className="champ-stat">
              <span className="champ-stat-val">{stats.gf}</span>
              <span className="champ-stat-label">Goles</span>
            </div>
            <div className="champ-stat-divider" />
            <div className="champ-stat">
              <span className={`champ-stat-val ${stats.gf - stats.gc > 0 ? 'champ-positive' : ''}`}>
                {stats.gf - stats.gc > 0 ? '+' : ''}{stats.gf - stats.gc}
              </span>
              <span className="champ-stat-label">Dif. goles</span>
            </div>
          </div>
        )}

        {/* Podio — top 3 */}
        {standings.length >= 3 && (
          <div className="champion-podium">
            {/* 2do lugar */}
            <div className="podium-item podium-2">
              <img
                src={`/players/${standings[1].name.toLowerCase()}.png`}
                alt={standings[1].name}
                className="podium-avatar"
              />
              <span className="podium-medal">🥈</span>
              <span className="podium-name">{standings[1].name}</span>
              <span className="podium-pts">{standings[1].pts} pts</span>
            </div>

            {/* 1er lugar — más grande */}
            <div className="podium-item podium-1">
              <img
                src={`/players/${standings[0].name.toLowerCase()}.png`}
                alt={standings[0].name}
                className="podium-avatar podium-avatar-winner"
              />
              <span className="podium-medal">🥇</span>
              <span className="podium-name podium-name-winner">{standings[0].name}</span>
              <span className="podium-pts podium-pts-winner">{standings[0].pts} pts</span>
            </div>

            {/* 3er lugar */}
            <div className="podium-item podium-3">
              <img
                src={`/players/${standings[2].name.toLowerCase()}.png`}
                alt={standings[2].name}
                className="podium-avatar"
              />
              <span className="podium-medal">🥉</span>
              <span className="podium-name">{standings[2].name}</span>
              <span className="podium-pts">{standings[2].pts} pts</span>
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          className="champion-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Cerrar sección campeón"
        >
          Ver tabla completa ↓
        </button>
      </div>
    </>
  )
}
