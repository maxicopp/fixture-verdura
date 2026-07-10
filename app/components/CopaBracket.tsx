'use client'

import { useState, useEffect } from 'react'
import Confetti from './Confetti'
import { Sk } from './Skeleton'
import type { CopaData, CopaBracketMatch } from '../types'

const PLAYER_COLORS: Record<string, string> = {
  Max:     '#4f6df5',
  Gayco:   '#d97706',
  Vulvega: '#10b981',
  Nacho:   '#ef6c6c',
  Kevin:   '#6388f8',
  Negro:   '#64748b',
}
const getColor = (name: string) => PLAYER_COLORS[name] ?? '#9ca3af'
const isValid  = (name: string)  => name && name !== 'TBD'

function getWinner(match: CopaBracketMatch | undefined, seedMap: Record<string, number>, isQF: boolean): string | null {
  if (!match?.played) return null
  if (match.homeGoals! > match.awayGoals!) return match.home
  if (match.awayGoals! > match.homeGoals!) return match.away
  if (isQF) {
    const hs = seedMap[match.home] ?? 99
    const as = seedMap[match.away] ?? 99
    return hs <= as ? match.home : match.away
  }
  return match.penaltyWinner ?? null
}

interface MatchRowProps {
  name: string
  seed?: number
  goals?: number | null
  penGoals?: number | null
  isWinner?: boolean
  isLoser?: boolean
  isBye?: boolean
}

function MatchRow({ name, seed, goals, penGoals, isWinner, isLoser, isBye = false }: MatchRowProps) {
  if (isBye) {
    return (
      <div className="mc-row mc-row-bye">
        <div className="mc-seed" style={{ background: getColor(name) }}>{seed}</div>
        <img src={`/players/${name.toLowerCase()}.png`} alt={name} className="mc-avatar" />
        <span className="mc-name">{name}</span>
        <span className="mc-bye-pill">BYE</span>
      </div>
    )
  }
  if (!isValid(name)) {
    return (
      <div className="mc-row mc-row-tbd">
        <span className="mc-tbd-dot" />
        <span className="mc-tbd-label">Por definir</span>
      </div>
    )
  }
  return (
    <div className={`mc-row ${isWinner ? 'mc-row-winner' : ''} ${isLoser ? 'mc-row-loser' : ''}`}>
      <div className="mc-seed" style={{ background: getColor(name) }}>{seed}</div>
      <img src={`/players/${name.toLowerCase()}.png`} alt={name} className="mc-avatar" />
      <span className="mc-name">{name}</span>
      <span className="mc-spacer" />
      {goals !== null && goals !== undefined && (
        <span className={`mc-score ${isWinner ? 'mc-score-win' : ''}`}>
          {goals}
          {penGoals != null && <sup className="mc-pen-sup">({penGoals})</sup>}
        </span>
      )}
      {isWinner && <span className="mc-check">✓</span>}
    </div>
  )
}

interface MatchCardProps {
  match?: CopaBracketMatch | null
  seedMap: Record<string, number>
  isQF?: boolean
  isFinal?: boolean
  isBye?: boolean
  byePlayer?: string
  byeSeed?: number
}

function MatchCard({ match, seedMap, isQF = false, isFinal = false, isBye = false, byePlayer, byeSeed }: MatchCardProps) {
  // Bye card variant
  if (isBye) {
    if (!byePlayer) return <div className="mc mc-bye-empty" />
    return (
      <div className="mc mc-bye">
        <MatchRow name={byePlayer} seed={byeSeed} isBye />
      </div>
    )
  }

  if (!match) return (
    <div className="mc mc-tbd">
      <div className="mc-row mc-row-tbd"><span className="mc-tbd-dot" /><span className="mc-tbd-label">Por definir</span></div>
      <div className="mc-divider" />
      <div className="mc-row mc-row-tbd"><span className="mc-tbd-dot" /><span className="mc-tbd-label">Por definir</span></div>
    </div>
  )

  const winner = getWinner(match, seedMap, isQF)
  const isDraw = match.played && match.homeGoals === match.awayGoals
  const hasPen = isDraw && match.penaltyWinner

  return (
    <div className={[
      'mc',
      match.played ? 'mc-done' : 'mc-pending',
      isFinal ? 'mc-final' : '',
    ].filter(Boolean).join(' ')}>

      <MatchRow
        name={match.home}
        seed={seedMap[match.home]}
        goals={match.played ? match.homeGoals : null}
        penGoals={hasPen ? match.homePenalties : null}
        isWinner={match.played && winner === match.home}
        isLoser={match.played && winner !== match.home}
      />
      <div className="mc-divider" />
      <MatchRow
        name={match.away}
        seed={seedMap[match.away]}
        goals={match.played ? match.awayGoals : null}
        penGoals={hasPen ? match.awayPenalties : null}
        isWinner={match.played && winner === match.away}
        isLoser={match.played && winner !== match.away}
      />

      {/* Footer note */}
      {!match.played && isValid(match.home) && isValid(match.away) && (
        <div className="mc-note">
          {isQF ? '⚖️ Empate → clasifica por tabla' : '⏱ Alargue · Penales si necesario'}
        </div>
      )}
      {match.played && isDraw && isQF && (
        <div className="mc-note mc-note-draw">⚖️ Clasifica {winner} por tabla</div>
      )}
      {match.played && hasPen && (
        <div className="mc-note mc-note-pen">🎯 {match.penaltyWinner} gana en penales</div>
      )}
    </div>
  )
}

function Stage({ label, sublabel, children, isFinal = false }: { label: string; sublabel?: string; children: React.ReactNode; isFinal?: boolean }) {
  return (
    <div className={`copa-stage ${isFinal ? 'copa-stage-final' : ''}`}>
      <div className="copa-stage-header">
        <span className="copa-stage-label">{label}</span>
        {sublabel && <span className="copa-stage-sublabel">{sublabel}</span>}
      </div>
      <div className="copa-stage-cards">{children}</div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function CopaBracket() {
  const [data, setData]       = useState<CopaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

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
        <div className="bracket-hero" style={{ minHeight: 120 }}>
          <div className="bracket-hero-bg" aria-hidden />
          <div className="bracket-hero-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Sk style={{ height: 11, width: 160 }} rounded />
            <Sk style={{ height: 26, width: 240 }} rounded />
            <Sk style={{ height: 28, width: 160, borderRadius: 100 }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '1.5rem 1rem' }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} className="mc mc-pending">
              <div className="mc-row mc-row-tbd"><Sk circle style={{ width: 28, height: 28 }} /><Sk style={{ height: 12, width: 100 }} rounded /></div>
              <div className="mc-divider" />
              <div className="mc-row mc-row-tbd"><Sk circle style={{ width: 28, height: 28 }} /><Sk style={{ height: 12, width: 80 }} rounded /></div>
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
  const seedMap: Record<string, number> = {}
  for (const p of players) seedMap[p.name] = p.seed

  const byId: Record<string, CopaBracketMatch> = {}
  for (const m of matches) byId[m.id] = m

  const isFinished = tournament.status === 'finished'
  const bye1 = players.find(p => p.seed === 1)
  const bye2 = players.find(p => p.seed === 2)

  return (
    <div className="copa-bracket">
      {isFinished && champion && <Confetti active duration={6000} />}

      {/* Hero */}
      <div className="bracket-hero">
        <div className="bracket-hero-bg" aria-hidden />
        <div className="bracket-hero-content">
          <span className="bracket-eyebrow">Copa · {tournament.season}</span>
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

      {/* Bracket — vertical stages */}
      <div className="copa-stages-wrap">

        {/* Cuartos */}
        <Stage label="⚔️ Cuartos de Final" sublabel="Empate → clasifica por tabla de liga">
          <MatchCard match={byId['qf1']} seedMap={seedMap} isQF />
          <MatchCard match={byId['qf2']} seedMap={seedMap} isQF />
        </Stage>

        {/* Arrow */}
        <div className="copa-stage-arrow" aria-hidden>↓</div>

        {/* Semis */}
        <Stage label="🔥 Semifinales" sublabel="Alargue · Penales si necesario">
          <MatchCard match={byId['sf1']} seedMap={seedMap} />
          <MatchCard match={byId['sf2']} seedMap={seedMap} />
        </Stage>

        {/* Arrow */}
        <div className="copa-stage-arrow" aria-hidden>↓</div>

        {/* Final */}
        <Stage label="🏆 Final" isFinal>
          <MatchCard match={byId['final']} seedMap={seedMap} isFinal />
        </Stage>

        {/* Byes info */}
        <div className="copa-byes-row">
          <span className="copa-byes-label">🎟️ Clasificaron directo a semis</span>
          <div className="copa-byes-cards">
            {bye1 && (
              <div className="copa-bye-chip">
                <div className="mc-seed" style={{ background: getColor(bye1.name) }}>1</div>
                <img src={`/players/${bye1.name.toLowerCase()}.png`} alt={bye1.name} className="mc-avatar" />
                <span>{bye1.name}</span>
                <span className="mc-bye-pill">BYE</span>
              </div>
            )}
            {bye2 && (
              <div className="copa-bye-chip">
                <div className="mc-seed" style={{ background: getColor(bye2.name) }}>2</div>
                <img src={`/players/${bye2.name.toLowerCase()}.png`} alt={bye2.name} className="mc-avatar" />
                <span>{bye2.name}</span>
                <span className="mc-bye-pill">BYE</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Seeds legend */}
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

      {/* Champion */}
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
