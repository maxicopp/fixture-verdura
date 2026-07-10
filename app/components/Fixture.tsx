'use client'

import { useState } from 'react'
import MatchDay from './MatchDay'
import type { Round } from '../types'

interface FixtureProps {
  fixture: Round[]
  onResult: (roundIdx: number, matchIdx: number, hg: number, ag: number) => void
  onReset: (roundIdx: number, matchIdx: number) => void
  onResetAll: () => void
}

export default function Fixture({ fixture, onResult, onReset, onResetAll }: FixtureProps) {
  const [expandedRound, setExpandedRound] = useState(0)

  return (
    <div className="fixture">
      <div className="fixture-header">
        <h2>Fixture completo</h2>
        <button className="btn-reset-all" onClick={onResetAll}>🔄 Reiniciar todo</button>
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
              <span className="round-badge">
                {played === total ? '✅' : `${played}/${total}`}
              </span>
              <span className="round-chevron">{isExpanded ? '▲' : '▼'}</span>
            </button>
            {isExpanded && (
              <MatchDay
                matches={round.matches}
                roundIdx={ri}
                onResult={onResult}
                onReset={onReset}
                fixture={fixture}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
