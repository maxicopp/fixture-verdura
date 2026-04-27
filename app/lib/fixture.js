export function generateFixture(players) {
  const n = players.length
  const rounds = []
  const list = [...players]

  for (let round = 0; round < n - 1; round++) {
    const matches = []
    for (let i = 0; i < n / 2; i++) {
      matches.push({
        id: `${round}-${i}`,
        home: list[i],
        away: list[n - 1 - i],
        homeGoals: null,
        awayGoals: null,
        played: false,
      })
    }
    rounds.push({ round: round + 1, matches })
    list.splice(1, 0, list.pop())
  }
  return rounds
}

export function calcStandings(players, fixture) {
  const table = {}
  players.forEach(p => {
    table[p] = { name: p, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 }
  })
  fixture.forEach(round => {
    round.matches.forEach(m => {
      if (!m.played) return
      const h = table[m.home]
      const a = table[m.away]
      h.pj++; a.pj++
      h.gf += m.homeGoals; h.gc += m.awayGoals
      a.gf += m.awayGoals; a.gc += m.homeGoals
      if (m.homeGoals > m.awayGoals) {
        h.pg++; h.pts += 3; a.pp++
      } else if (m.homeGoals < m.awayGoals) {
        a.pg++; a.pts += 3; h.pp++
      } else {
        h.pe++; a.pe++; h.pts += 1; a.pts += 1
      }
    })
  })
  return Object.values(table).sort((a, b) =>
    b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf
  )
}
