'use client'

import { useState } from 'react'

export default function MatchDay({ matches, roundIdx, onResult, onReset }) {
  return (
    <div className="match-day">
      {matches.map((match, mi) => (
        <MatchCard
          key={match.id}
          match={match}
          onSave={(hg, ag) => onResult(roundIdx, mi, hg, ag)}
          onReset={() => onReset(roundIdx, mi)}
        />
      ))}
    </div>
  )
}

function MatchCard({ match, onSave, onReset }) {
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
      <div className="match-actions">
        <button className="btn-save" onClick={handleSave}>💾 Guardar</button>
        {editing && <button className="btn-sm" onClick={() => setEditing(false)}>Cancelar</button>}
      </div>
    </div>
  )
}
