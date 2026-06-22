'use client'

import { useState, useEffect } from 'react'
import Confetti from './Confetti'
import { Sk, SkMatchCard } from './Skeleton'

const PLAYER_COLORS = {
  Max:     '#4f6df5',
  Gayco:   '#d97706',
  Vulvega: '#10b981',
  Nacho:   '#ef6c6c',
  Kevin:   '#6388f8',
  Negro:   '#64748b',
}
const getColor = name => PLAYER_COLORS[name] ?? '#9ca3af'

function getWinner(match, seedMap) {
  if (!match?.played) return null
  if (match.homeGoals > match.awayGoals) return match.home
  if (match.awayGoals > match.homeGoals) return match.away
  const hs = seedMap[match.home] ?? 99
  const as = seedMap[match.away] ?? 99
  return hs <= as ? match.home : match.away
}

// ─── One matchup card ────────────────────────────────────────────────────────
function MatchCard({ match, seedMap, isFinal = false }) {
  if (!match) return <div className="bracket-card bracket-card-tbd"><PlaceholderSlot /><div className="bracket-card-divider" /><PlaceholderSlot /></div>

  const winner  = getWinner(match, seedMap)
  const isDraw  = match.played && match.homeGoals === match.awayGoals

  return (
    <div className={`bracket-card ${match.played ? 'bracket-card-done' : 'bracket-card-pending'} ${isFinal ? 'bracket-card-highlight' : ''}`}>
      <PlayerSlot
        name={match.home}
        goals={match.played ? match.homeGoals : null}
        isWinner={match.played && winner === match.home}
        isLoser={match.played && winner !== match.home}
        seed={seedMap[match.home]}
      />
      <div className="bracket-card-divider" />
      <PlayerSlot
        name={match.away}
        goals={match.played ? match.awayGoals : null}
        isWinner={match.played && winner === match.away}
        isLoser={match.played && winner !== match.away}
        seed={seedMap[match.away]}
      />
      {isDraw && (
        <div className="bracket-card-draw-note">⚖️ Empate · clasifica por tabla</div>
      )}
    </div>
  )
}

function PlayerSlot({ name, goals, isWinner, isLoser, seed }) {
  if (!name || name === 'TBD') return <PlaceholderSlot />
  return (
    <div className={`bracket-slot ${isWinner ? 'bracket-slot-winner' : ''} ${isLoser ? 'bracket-slot-loser' : ''}`}>
      <div className="bracket-slot-seed" style={{ background: getColor(name) }}>{seed ?? '?'}</div>
      <img src={`/players/${name.toLowerCase()}.png`} alt={name} className="bracket-slot-avatar" />
      <span className="bracket-slot-name">{name}</span>
      {goals !== null && <span className={`bracket-slot-score ${isWinner ? 'bracket-score-win' : ''}`}>{goals}</span>}
      {isWinner && <span className="bracket-slot-check">✓</span>}
    </div>
  )
}

function PlaceholderSlot() {
  return (
    <div className="bracket-slot bracket-slot-tbd">
      <span className="bracket-tbd-dot" />
      <span className="bracket-tbd-text">Por definir</span>
    </div>
  )
}

function ByeCard({ player, seed }) {
  if (!player) return null
  return (
    <div className="bracket-card bracket-bye-card">
      <div className="bracket-bye-inner">
        <div className="bracket-slot-seed" style={{ background: getColor(player) }}>{seed}</div>
        <img src={`/players/${player.toLowerCase()}.png`} alt={player} className="bracket-slot-avatar" />
        <span className="bracket-slot-name">{player}</span>
        <span className="bracket-bye-label">BYE</span>
      </div>
    </div>
  )
}

// ─── Bracket layout ───────────────────────────────────────────────────────────
//
//  [QF1]  ─┐
//           ├─ [SF1] ─┐
//  [BYE 1°] ─┘          │
//                        ├─ [FINAL]
//  [QF2]  ─┐          │
//           ├─ [SF2] ─┘
//  [BYE 2°] ─┘
//
// Columns:  qf | conn | sf | conn | final
// Each connector is a small SVG with bracket lines

function ConnectorLeft({ topToMid = true }) {
  // Connects two cards on left to one card on right
  return (
    <svg className="bracket-connectors" viewBox="0 0 40 200" preserveAspectRatio="none">
      <polyline className="bracket-connector-line" points="0,50 20,50 20,100 40,100" />
      <polyline className="bracket-connector-line" points="0,150 20,150 20,100 40,100" />
    </svg>
  )
}

function ConnectorRight() {
  return (
    <svg className="bracket-connectors" viewBox="0 0 40 200" preserveAspectRatio="none">
      <polyline className="bracket-connector-line" points="40,50 20,50 20,100 0,100" />
      <polyline className="bracket-connector-line" points="40,150 20,150 20,100 0,100" />
    </svg>
  )
}

function ConnectorSingle(props) {
  const { fromRight } = props
  return (
    <svg className="bracket-connectors-single" viewBox="0 0 40 100" preserveAspectRatio="none">
      <polyline className="bracket-connector-line" points={fromRight ? '40,50 0,50' : '0,50 40,50'} />
    </svg>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function CopaBracket() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    fetch('/api/copa')
      .then(r => r.json())
      .then(d => { if (d.error && !d.exists) setError('no-copa'); else setData(d) })
      .catch(() => setError('error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="copa-bracket" aria-busy="true">
        {/* Hero skeleton */}
        <div className="bracket-hero" style={{ minHeight: 120 }}>
          <div className="bracket-hero-bg" aria-hidden />
          <div className="bracket-hero-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Sk style={{ height: 11, width: 160 }} rounded />
            <Sk style={{ height: 26, width: 240 }} rounded />
            <Sk style={{ height: 28, width: 160, borderRadius: 100 }} />
          </div>
        </div>

        {/* Bracket skeleton */}
        <div className="bracket-wrapper">
          <div className="bracket-col-headers" style={{ visibility: 'hidden' }}>
            {[0,1,2,3,4].map(i => <div key={i} />)}
          </div>
          <div className="bracket-grid">
            {/* QF col */}
            <div className="bracket-col-left">
              <div className="bracket-cell-top"><SkMatchCard /></div>
              <div className="bracket-cell-bot"><SkMatchCard /></div>
            </div>
            {/* connector */}
            <svg className="bracket-connectors" viewBox="0 0 40 200" preserveAspectRatio="none">
              <polyline className="bracket-connector-line" points="0,50 20,50 20,100 40,100" />
              <polyline className="bracket-connector-line" points="0,150 20,150 20,100 40,100" />
            </svg>
            {/* SF */}
            <div className="bracket-col-mid"><SkMatchCard /></div>
            {/* connector */}
            <svg className="bracket-connectors-single" viewBox="0 0 40 100" preserveAspectRatio="none">
              <polyline className="bracket-connector-line" points="0,50 40,50" />
            </svg>
            {/* Final */}
            <div className="bracket-col-mid"><SkMatchCard /></div>
            {/* connector */}
            <svg className="bracket-connectors-single" viewBox="0 0 40 100" preserveAspectRatio="none">
              <polyline className="bracket-connector-line" points="40,50 0,50" />
            </svg>
            {/* SF right */}
            <div className="bracket-col-mid"><SkMatchCard /></div>
            {/* connector */}
            <svg className="bracket-connectors" viewBox="0 0 40 200" preserveAspectRatio="none">
              <polyline className="bracket-connector-line" points="40,50 20,50 20,100 0,100" />
              <polyline className="bracket-connector-line" points="40,150 20,150 20,100 0,100" />
            </svg>
            {/* Byes col */}
            <div className="bracket-col-left">
              <div className="bracket-cell-top"><SkMatchCard /></div>
              <div className="bracket-cell-bot"><SkMatchCard /></div>
            </div>
          </div>
        </div>

        {/* Seeds bar skeleton */}
        <div className="bracket-seeds-bar">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bracket-seed-chip">
              <Sk circle style={{ width: 20, height: 20 }} />
              <Sk circle style={{ width: 20, height: 20 }} />
              <Sk style={{ height: 12, width: 45 }} rounded />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error === 'no-copa') {
    return (
      <div className="copa-bracket">
        <div className="bracket-empty">
          <div className="bracket-empty-icon">🏆</div>
          <h3 className="bracket-empty-title">Copa no disponible</h3>
          <p className="bracket-empty-sub">El admin puede crear la Copa desde el panel de administración una vez terminada la liga.</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return <div className="copa-bracket"><div className="bracket-empty"><div className="bracket-empty-icon">⚠️</div><p className="bracket-empty-sub">Error al cargar la Copa.</p></div></div>
  }

  const { tournament, matches, players, champion } = data
  const seedMap = {}
  for (const p of players) seedMap[p.name] = p.seed

  const byId = {}
  for (const m of matches) byId[m.id] = m

  const isFinished = tournament.status === 'finished'

  // Get bye players (positions 1 and 2)
  const bye1 = players.find(p => p.seed === 1)
  const bye2 = players.find(p => p.seed === 2)

  return (
    <div className="copa-bracket">
      {isFinished && champion && <Confetti active duration={6000} />}

      {/* ── Hero ── */}
      <div className="bracket-hero">
        <div className="bracket-hero-bg" aria-hidden />
        <div className="bracket-hero-content">
          <span className="bracket-eyebrow">Copa · {tournament.season} {tournament.year}</span>
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

      {/* ── Bracket ── */}
      <div className="bracket-wrapper">
        {/* Column headers */}
        <div className="bracket-col-headers">
          <div className="bracket-col-header">Cuartos</div>
          <div className="bracket-col-header-spacer" />
          <div className="bracket-col-header">Semis</div>
          <div className="bracket-col-header-spacer" />
          <div className="bracket-col-header bracket-col-header-final">⚽ Final</div>
          <div className="bracket-col-header-spacer" />
          <div className="bracket-col-header">Semis</div>
          <div className="bracket-col-header-spacer" />
          <div className="bracket-col-header">Byes</div>
        </div>

        {/* Grid */}
        <div className="bracket-grid">

          {/* ── Col A: QF ── */}
          <div className="bracket-col-left">
            <div className="bracket-cell-top">
              <MatchCard match={byId['qf1']} seedMap={seedMap} />
            </div>
            <div className="bracket-cell-bot">
              <MatchCard match={byId['qf2']} seedMap={seedMap} />
            </div>
          </div>

          {/* ── Conn A→B ── */}
          <ConnectorLeft />

          {/* ── Col B: SF left ── */}
          <div className="bracket-col-mid">
            <MatchCard match={byId['sf1']} seedMap={seedMap} />
          </div>

          {/* ── Conn B→C ── */}
          <ConnectorSingle />

          {/* ── Col C: Final ── */}
          <div className="bracket-col-mid">
            <MatchCard match={byId['final']} seedMap={seedMap} isFinal />
          </div>

          {/* ── Conn C←D ── */}
          <ConnectorSingle fromRight />

          {/* ── Col D: SF right ── */}
          <div className="bracket-col-mid">
            <MatchCard match={byId['sf2']} seedMap={seedMap} />
          </div>

          {/* ── Conn D←E ── */}
          <ConnectorRight />

          {/* ── Col E: Byes ── */}
          <div className="bracket-col-left">
            <div className="bracket-cell-top">
              <ByeCard player={bye1?.name} seed={1} />
            </div>
            <div className="bracket-cell-bot">
              <ByeCard player={bye2?.name} seed={2} />
            </div>
          </div>

        </div>
      </div>

      {/* ── Seeds legend ── */}
      <div className="bracket-seeds-bar">
        {players.map((p, i) => (
          <div key={p.name} className={`bracket-seed-chip ${i < 2 ? 'bracket-seed-chip-bye' : ''}`}>
            <div className="bracket-seed-num" style={{ background: getColor(p.name) }}>{p.seed}</div>
            <img src={`/players/${p.name.toLowerCase()}.png`} alt={p.name} className="bracket-seed-chip-avatar" />
            <span className="bracket-seed-chip-name">{p.name}</span>
            {i < 2 && <span className="bracket-seed-bye-tag">BYE</span>}
          </div>
        ))}
      </div>
      <p className="bracket-tiebreak-note">⚖️ En caso de empate clasifica el mejor posicionado en la liga</p>

      {/* ── Champion ── */}
      {isFinished && champion && (
        <div className="bracket-champion-panel">
          <div className="bracket-champion-glow" aria-hidden />
          <div className="bracket-champion-trophy">🏆</div>
          <img src={`/players/${champion.toLowerCase()}.png`} alt={champion} className="bracket-champion-avatar" />
          <div className="bracket-champion-info">
            <p className="bracket-champion-label">Campeón de la Copa</p>
            <h3 className="bracket-champion-name">{champion}</h3>
          </div>
        </div>
      )}
    </div>
  )
}
