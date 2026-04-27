'use client'

export default function Standings({ standings }) {
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
                <td>{s.pe}</td>
                <td>{s.pp}</td>
                <td>{s.gf}</td>
                <td>{s.gc}</td>
                <td className={s.gf - s.gc > 0 ? 'positive' : s.gf - s.gc < 0 ? 'negative' : ''}>
                  {s.gf - s.gc > 0 ? '+' : ''}{s.gf - s.gc}
                </td>
                <td className="pts">{s.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
