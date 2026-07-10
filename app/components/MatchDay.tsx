'use client'

import { useState } from 'react'
import type { Round, Match, HistStats, Odds } from '../types'

function calcOdds(homeName: string, awayName: string, fixture: Round[], histStats: HistStats = {}): Odds {
  function score(name: string): number {
    const h = histStats[name]
    let s = 0
    if (h && h.pj > 0) {
      s += (h.pg * 3 + h.pe) * 1.0 + (h.gf - h.gc) * 0.5
    }
    const results: Array<{ gf: number | null; gc: number | null }> = []
    fixture.forEach(r => r.matches.forEach(m => {
      if (!m.played) return
      if (m.home === name) results.push({ gf: m.homeGoals, gc: m.awayGoals })
      if (m.away === name) results.push({ gf: m.awayGoals, gc: m.homeGoals })
    }))
    if (results.length > 0) {
      const curPts  = results.reduce((a, r) => a + ((r.gf ?? 0) > (r.gc ?? 0) ? 3 : (r.gf ?? 0) === (r.gc ?? 0) ? 1 : 0), 0)
      const recent3 = results.slice(-3).reduce((a, r) => a + ((r.gf ?? 0) > (r.gc ?? 0) ? 3 : (r.gf ?? 0) === (r.gc ?? 0) ? 1 : 0), 0)
      const curDg   = results.reduce((a, r) => a + ((r.gf ?? 0) - (r.gc ?? 0)), 0)
      s += curPts * 1.5 + recent3 * 2.0 + curDg * 0.5
    }
    return Math.max(s + 5, 0.1)
  }
  const sh = score(homeName)
  const sa = score(awayName)
  const total = sh + sa
  const ph = (sh / total) * 0.9
  const pa = (sa / total) * 0.9
  const pe = 0.1 + (0.28 - Math.abs(ph - pa) * 0.5)
  const norm = ph + pe + pa
  return {
    home: Math.max(1.05, +(1 / (ph / norm)).toFixed(2)),
    draw: Math.max(1.05, +(1 / (pe / norm)).toFixed(2)),
    away: Math.max(1.05, +(1 / (pa / norm)).toFixed(2)),
  }
}

interface MatchDayProps {
  matches: Match[]
  roundIdx: number
  onResult: (roundIdx: number, matchIdx: number, hg: number, ag: number) => void
  onReset: (roundIdx: number, matchIdx: number) => void
  fixture: Round[]
  histStats?: HistStats
}

export default function MatchDay({ matches, roundIdx, onResult, onReset, fixture, histStats = {} }: MatchDayProps) {
  return (
    <div className="match-day">
      {matches.map((match, mi) => (
        <MatchCard
          key={match.id}
          match={match}
          fixture={fixture}
          histStats={histStats}
          onSave={(hg, ag) => onResult(roundIdx, mi, hg, ag)}
          onReset={() => onReset(roundIdx, mi)}
        />
      ))}
    </div>
  )
}

interface MatchCardProps {
  match: Match
  onSave: (hg: number, ag: number) => void
  onReset: () => void
  fixture: Round[]
  histStats?: HistStats
}

function MatchCard({ match, onSave, onReset, fixture, histStats = {} }: MatchCardProps) {
  const [editing, setEditing] = useState(false)
  const [hg, setHg] = useState<string | number>(match.homeGoals ?? 0)
  const [ag, setAg] = useState<string | number>(match.awayGoals ?? 0)

  const handleSave = () => {
    onSave(parseInt(String(hg)), parseInt(String(ag)))
    setEditing(false)
  }

  const handleReset = () => {
    onReset()
    setHg(0)
    setAg(0)
    setEditing(false)
  }

  if (match.played && !editing) {
    const homeWin = match.homeGoals! > match.awayGoals!
    const awayWin = match.awayGoals! > match.homeGoals!
    const draw = match.homeGoals === match.awayGoals
    return (
      <div className={`match-card played ${draw ? 'draw' : ''}`}>
        <div className="match-teams">
          <span className={`team team-home ${homeWin ? 'winner' : ''}`}>
            {match.home}
            <img src={`/players/${match.home.toLowerCase()}.png`} alt={match.home} className="avatar" />
          </span>
          <span className="score">{match.homeGoals} - {match.awayGoals}</span>
          <span className={`team team-away ${awayWin ? 'winner' : ''}`}>
            <img src={`/players/${match.away.toLowerCase()}.png`} alt={match.away} className="avatar" />
            {match.away}
          </span>
        </div>
        <div className="match-actions">
          <button className="btn-sm" onClick={() => setEditing(true)}>✏️</button>
          <button className="btn-sm btn-danger" onClick={handleReset}>✖</button>
        </div>
      </div>
    )
  }

  const odds = fixture ? calcOdds(match.home, match.away, fixture, histStats) : null

  return (
    <div className="match-card pending">
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
            value={hg}
            onChange={e => setHg(e.target.value)}
          />
          <span>-</span>
          <input
            type="number"
            min="0"
            max="99"
            value={ag}
            onChange={e => setAg(e.target.value)}
          />
        </div>
        <span className="team team-away">
          <img src={`/players/${match.away.toLowerCase()}.png`} alt={match.away} className="avatar" />
          {match.away}
        </span>
      </div>
      {odds && (
        <div className="odds-row">
          <div className="odd-item">
            <span className="odd-label">{match.home}</span>
            <span className="odd-val">{odds.home}</span>
          </div>
          <div className="odd-item odd-draw">
            <span className="odd-label">Empate</span>
            <span className="odd-val">{odds.draw}</span>
          </div>
          <div className="odd-item">
            <span className="odd-label">{match.away}</span>
            <span className="odd-val">{odds.away}</span>
          </div>
        </div>
      )}
      <div className="match-actions">
        <button className="btn-save" onClick={handleSave}>💾 Guardar</button>
        {editing && <button className="btn-sm" onClick={() => setEditing(false)}>Cancelar</button>}
      </div>
    </div>
  )
}
