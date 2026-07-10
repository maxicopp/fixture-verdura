'use client'

import { useState, useEffect } from 'react'
import { Sk } from './Skeleton'

function H2HSkeleton() {
  return (
    <div className="h2h-content" aria-busy="true">
      {/* Score card */}
      <div className="sk-h2h-score-card">
        <div className="sk-h2h-side">
          <Sk circle style={{ width: 56, height: 56 }} />
          <Sk style={{ height: 13, width: 60 }} rounded />
          <Sk style={{ height: 32, width: 48 }} rounded />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Sk style={{ height: 24, width: 32 }} rounded />
          <Sk style={{ height: 10, width: 50 }} rounded />
        </div>
        <div className="sk-h2h-side">
          <Sk circle style={{ width: 56, height: 56 }} />
          <Sk style={{ height: 13, width: 60 }} rounded />
          <Sk style={{ height: 32, width: 48 }} rounded />
        </div>
      </div>

      {/* Dominance bar */}
      <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
        <Sk style={{ height: 28, width: '100%', display: 'block' }} rounded />
      </div>

      {/* Compare stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 1rem 1rem' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Sk style={{ height: 18, width: 40 }} rounded />
            <Sk style={{ height: 11, flex: 1 }} rounded />
            <Sk style={{ height: 18, width: 40 }} rounded />
          </div>
        ))}
      </div>

      {/* Match list */}
      <div style={{ padding: '0 1rem' }}>
        <Sk style={{ height: 13, width: 180, marginBottom: 12 }} rounded />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Sk style={{ height: 10, width: 140 }} rounded />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sk style={{ height: 13, width: 70 }} rounded />
              <Sk style={{ height: 16, width: 50 }} rounded />
              <Sk style={{ height: 13, width: 70 }} rounded />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HeadToHead({ players }) {
  const [p1, setP1] = useState(players[0] || '')
  const [p2, setP2] = useState(players[1] || '')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!p1 || !p2 || p1 === p2) {
      setData(null)
      return
    }
    setLoading(true)
    fetch(`/api/head-to-head?p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [p1, p2])

  const otherPlayers = (selected) => players.filter(p => p !== selected)

  return (
    <div className="h2h-dedicated">
      {/* Selector de jugadores */}
      <div className="h2h-selector">
        <PlayerSelector
          value={p1}
          onChange={setP1}
          allPlayers={players}
          exclude={p2}
          side="left"
        />
        <div className="h2h-vs-badge">
          <span className="h2h-vs-text">VS</span>
        </div>
        <PlayerSelector
          value={p2}
          onChange={setP2}
          allPlayers={players}
          exclude={p1}
          side="right"
        />
      </div>

      {/* Contenido */}
      {p1 === p2 && (
        <div className="h2h-empty">
          <p>Seleccioná dos jugadores diferentes</p>
        </div>
      )}

      {loading && <H2HSkeleton />}

      {data && !loading && (
        <div className="h2h-content">
          {/* Caja unificada: Score + Dominance + Stats */}
          <div className="h2h-unified-card">
            {/* Score card principal */}
            <div className="h2h-score-section">
              <div className="h2h-score-side h2h-score-left">
                <img src={`/players/${data.p1.toLowerCase()}.png`} alt={data.p1} className="h2h-score-avatar" />
                <span className="h2h-score-name">{data.p1}</span>
                <span className={`h2h-score-wins ${data.p1Wins > data.p2Wins ? 'h2h-score-leader' : ''}`}>
                  {data.p1Wins}
                </span>
              </div>
              <div className="h2h-score-center">
                <span className="h2h-score-draws">{data.draws}</span>
                <span className="h2h-score-draws-label">Empates</span>
              </div>
              <div className="h2h-score-side h2h-score-right">
                <span className={`h2h-score-wins ${data.p2Wins > data.p1Wins ? 'h2h-score-leader' : ''}`}>
                  {data.p2Wins}
                </span>
                <span className="h2h-score-name">{data.p2}</span>
                <img src={`/players/${data.p2.toLowerCase()}.png`} alt={data.p2} className="h2h-score-avatar" />
              </div>
            </div>

            {/* Barra de dominio */}
            <div className="h2h-dominance">
              <div className="h2h-dominance-bar">
                <div
                  className="h2h-dominance-segment h2h-dominance-p1"
                  style={{ width: data.total > 0 ? `${(data.p1Wins / data.total) * 100}%` : '0%' }}
                >
                  <span className="h2h-dominance-pct">
                    {data.total > 0 ? Math.round((data.p1Wins / data.total) * 100) : 0}%
                  </span>
                </div>
                <div
                  className="h2h-dominance-segment h2h-dominance-draw"
                  style={{ width: data.total > 0 ? `${(data.draws / data.total) * 100}%` : '0%' }}
                >
                  <span className="h2h-dominance-pct">
                    {data.draws > 0 ? `${Math.round((data.draws / data.total) * 100)}%` : ''}
                  </span>
                </div>
                <div
                  className="h2h-dominance-segment h2h-dominance-p2"
                  style={{ width: data.total > 0 ? `${(data.p2Wins / data.total) * 100}%` : '0%' }}
                >
                  <span className="h2h-dominance-pct">
                    {data.total > 0 ? Math.round((data.p2Wins / data.total) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Stats comparativos */}
            <div className="h2h-compare-stats">
              <div className="h2h-compare-row">
                <span className={`h2h-compare-val ${data.p1Goals > data.p2Goals ? 'h2h-compare-better' : ''}`}>
                  {data.p1Goals}
                </span>
                <span className="h2h-compare-label">Goles</span>
                <span className={`h2h-compare-val ${data.p2Goals > data.p1Goals ? 'h2h-compare-better' : ''}`}>
                  {data.p2Goals}
                </span>
              </div>
              <div className="h2h-compare-row">
                <span className={`h2h-compare-val ${data.p1Goals / Math.max(data.total, 1) > data.p2Goals / Math.max(data.total, 1) ? 'h2h-compare-better' : ''}`}>
                  {(data.p1Goals / Math.max(data.total, 1)).toFixed(1)}
                </span>
                <span className="h2h-compare-label">Goles/partido</span>
                <span className={`h2h-compare-val ${data.p2Goals / Math.max(data.total, 1) > data.p1Goals / Math.max(data.total, 1) ? 'h2h-compare-better' : ''}`}>
                  {(data.p2Goals / Math.max(data.total, 1)).toFixed(1)}
                </span>
              </div>
              <div className="h2h-compare-row">
                <span className={`h2h-compare-val ${data.p1Wins > data.p2Wins ? 'h2h-compare-better' : ''}`}>
                  {data.total > 0 ? Math.round((data.p1Wins / data.total) * 100) : 0}%
                </span>
                <span className="h2h-compare-label">% Victorias</span>
                <span className={`h2h-compare-val ${data.p2Wins > data.p1Wins ? 'h2h-compare-better' : ''}`}>
                  {data.total > 0 ? Math.round((data.p2Wins / data.total) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Resumen de partidos */}
          <div className="h2h-summary">
            <span className="h2h-summary-text">{data.total} {data.total === 1 ? 'partido jugado' : 'partidos jugados'} en total</span>
          </div>

          {/* Lista de partidos */}
          {data.matches.length > 0 && (
            <div className="h2h-matches-list">
              <h4 className="h2h-matches-title">Todos los enfrentamientos</h4>
              {data.matches.map((m, i) => {
                const p1Won = m.p1Goals > m.p2Goals
                const p2Won = m.p2Goals > m.p1Goals
                const stageLabels = {
                  quarterfinal: 'Cuartos',
                  semifinal: 'Semifinal',
                  final: 'Final',
                }
                const roundLabel = m.stage && stageLabels[m.stage]
                  ? stageLabels[m.stage]
                  : `Fecha ${m.round}`
                return (
                  <div key={i} className={`h2h-match-item ${p1Won ? 'h2h-match-p1win' : p2Won ? 'h2h-match-p2win' : 'h2h-match-draw'}`}>
                    <div className="h2h-match-meta">
                      <span className="h2h-match-tournament">{m.tournament}</span>
                      <span className="h2h-match-round">{roundLabel}</span>
                    </div>
                    <div className="h2h-match-result">
                      <span className={`h2h-match-name ${p1Won ? 'h2h-match-winner-name' : ''}`}>
                        {data.p1} {m.p1IsHome ? '(L)' : '(V)'}
                      </span>
                      <span className="h2h-match-score">
                        {m.p1Goals} - {m.p2Goals}
                      </span>
                      <span className={`h2h-match-name ${p2Won ? 'h2h-match-winner-name' : ''}`}>
                        {!m.p1IsHome ? '(L)' : '(V)'} {data.p2}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {data.matches.length === 0 && (
            <div className="h2h-empty">
              <p>No hay partidos entre estos jugadores todavía.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PlayerSelector({ value, onChange, allPlayers, exclude, side }) {
  // Show all players except the one selected in the other dropdown
  const availableOptions = allPlayers.filter(p => p !== exclude)

  return (
    <div className={`h2h-player-select h2h-player-${side}`}>
      <img
        src={`/players/${value.toLowerCase()}.png`}
        alt={value}
        className="h2h-select-avatar"
      />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h2h-select-input"
      >
        {availableOptions.map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </div>
  )
}
