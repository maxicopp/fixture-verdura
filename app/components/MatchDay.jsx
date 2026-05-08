'use client'

import { useState } from 'react'

function calcOdds(homeName, awayName, fixture) {
  function score(name) {
    const results = []
    fixture.forEach(r => r.matches.forEach(m => {
      if (!m.played) return
      if (m.home === name) results.push({ gf: m.homeGoals, gc: m.awayGoals })
      if (m.away === name) results.push({ gf: m.awayGoals, gc: m.homeGoals })
    }))
    if (results.length === 0) return 1
    const pts = results.reduce((a, r) => a + (r.gf > r.gc ? 3 : r.gf === r.gc ? 1 : 0), 0)
    const recent = results.slice(-3).reduce((a, r) => a + (r.gf > r.gc ? 3 : r.gf === r.gc ? 1 : 0), 0)
    const dg = results.reduce((a, r) => a + (r.gf - r.gc), 0)
    return pts * 2 + recent * 3 + dg + 5
  }
  const sh = Math.max(score(homeName), 0.1)
  const sa = Math.max(score(awayName), 0.1)
  const total = sh + sa
  // probabilidades con margen de casa (~10%)
  const ph = (sh / total) * 0.9
  const pa = (sa / total) * 0.9
  const pe = 0.1 + (0.28 - Math.abs(ph - pa) * 0.5) // empate más probable cuando están parejos
  const norm = ph + pe + pa
  return {
    home: Math.max(1.05, +(1 / (ph / norm)).toFixed(2)),
    draw: Math.max(1.05, +(1 / (pe / norm)).toFixed(2)),
    away: Math.max(1.05, +(1 / (pa / norm)).toFixed(2)),
  }
}

export default function MatchDay({ matches, roundIdx, onResult, onReset, fixture }) {
  return (
    <div className="match-day">
      {matches.map((match, mi) => (
        <MatchCard
          key={match.id}
          match={match}
          fixture={fixture}
          onSave={(hg, ag) => onResult(roundIdx, mi, hg, ag)}
          onReset={() => onReset(roundIdx, mi)}
        />
      ))}
    </div>
  )
}

function MatchCard({ match, onSave, onReset, fixture }) {
  const [editing, setEditing] = useState(false)
  const [hg, setHg] = useState(match.homeGoals ?? 0)
  const [ag, setAg] = useState(match.awayGoals ?? 0)

  const handleSave = () => {
    onSave(parseInt(hg), parseInt(ag))
    setEditing(false)
  }

  const handleReset = () => {
    onReset()
    setHg(0)
    setAg(0)
    setEditing(false)
  }

  if (match.played && !editing) {
    const homeWin = match.homeGoals > match.awayGoals
    const awayWin = match.awayGoals > match.homeGoals
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

  const odds = fixture ? calcOdds(match.home, match.away, fixture) : null

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
