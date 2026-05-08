'use client'

import { useState, useEffect } from 'react'

async function fetchMotivationalQuote() {
  const res = await fetch('/api/quote', { cache: 'no-store' })
  if (!res.ok) throw new Error('quote api error')
  return res.json()
}

export default function Standings({ standings }) {
  const [quote, setQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(true)

  useEffect(() => {
    fetchMotivationalQuote()
      .then(setQuote)
      .catch(() => setQuote({ text: 'El éxito es la suma de pequeños esfuerzos repetidos día tras día.', author: 'Robert Collier' }))
      .finally(() => setQuoteLoading(false))
  }, [])

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
              <th className="col-hide-mobile">PE</th>
              <th className="col-hide-mobile">PP</th>
              <th className="col-hide-mobile">GF</th>
              <th className="col-hide-mobile">GC</th>
              <th>DG</th>
              <th>PTS</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.name} className={i === 0 && s.pts > 0 ? 'leader' : ''}>
                <td className="pos">
                  {i === 0 && s.pts > 0 ? '🥇' : i === 1 && s.pts > 0 ? '🥈' : i === 2 && s.pts > 0 ? '🥉' : i + 1}
                </td>
                <td className="player-name">
                  <img src={`/players/${s.name.toLowerCase()}.png`} alt={s.name} className="avatar" />
                  {s.name}
                </td>
                <td>{s.pj}</td>
                <td>{s.pg}</td>
                <td className="col-hide-mobile">{s.pe}</td>
                <td className="col-hide-mobile">{s.pp}</td>
                <td className="col-hide-mobile">{s.gf}</td>
                <td className="col-hide-mobile">{s.gc}</td>
                <td className={s.gf - s.gc > 0 ? 'positive' : s.gf - s.gc < 0 ? 'negative' : ''}>
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
          <p className="quote-loading">Cargando frase...</p>
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
