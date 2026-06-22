'use client'

import { useState, useEffect } from 'react'
import { Sk } from './Skeleton'

async function fetchMotivationalQuote() {
  const res = await fetch('/api/quote', { cache: 'no-store' })
  if (!res.ok) throw new Error('quote api error')
  return res.json()
}

export default function Standings({ standings, disabledPlayers = [] }) {
  const [quote, setQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(true)

  useEffect(() => {
    fetchMotivationalQuote()
      .then(setQuote)
      .catch(() => setQuote({ text: 'El éxito es la suma de pequeños esfuerzos repetidos día tras día.', author: 'Robert Collier' }))
      .finally(() => setQuoteLoading(false))
  }, [])

  const isDisabled = (name) => disabledPlayers.includes(name)

  return (
    <div className="standings">
      <h2>🏆 Tabla de Posiciones</h2>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Jugador</th>
              <th>PJ</th>
              <th>PG</th>
              <th>PE</th>
              <th>PP</th>
              <th>GF</th>
              <th>GC</th>
              <th>DG</th>
              <th>PTS</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.name} className={`${i === 0 && s.pts > 0 ? 'leader' : ''} ${isDisabled(s.name) ? 'row-disabled' : ''}`}>
                <td className="pos">
                  {isDisabled(s.name) ? '⏸' : i === 0 && s.pts > 0 ? '🥇' : i === 1 && s.pts > 0 ? '🥈' : i === 2 && s.pts > 0 ? '🥉' : i + 1}
                </td>
                <td className="player-name">
                  <img src={`/players/${s.name.toLowerCase()}.png`} alt={s.name} className={`avatar ${isDisabled(s.name) ? 'avatar-disabled' : ''}`} />
                  <span className={isDisabled(s.name) ? 'player-disabled' : ''}>{s.name}</span>
                  {isDisabled(s.name) && <span className="disabled-tag">inactivo</span>}
                </td>
                <td>{s.pj}</td>
                <td>{s.pg}</td>
                <td>{s.pe}</td>
                <td>{s.pp}</td>
                <td>{s.gf}</td>
                <td>{s.gc}</td>
                <td className={!isDisabled(s.name) && s.gf - s.gc > 0 ? 'positive' : !isDisabled(s.name) && s.gf - s.gc < 0 ? 'negative' : ''}>
                  {s.gf - s.gc > 0 ? '+' : ''}{s.gf - s.gc}
                </td>
                <td className="pts">{s.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="quote-card">
        {quoteLoading ? (
          <div className="sk-quote-card" aria-busy="true">
            <Sk style={{ height: 12, width: '72%' }} rounded />
            <Sk style={{ height: 11, width: '55%' }} rounded />
            <Sk style={{ height: 10, width: '35%' }} rounded />
          </div>
        ) : (
          <>
            <p className="quote-text">"{quote.text}"</p>
            <p className="quote-author">— {quote.author}</p>
          </>
        )}
      </div>
    </div>
  )
}
