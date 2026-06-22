/**
 * Genera el bracket de Copa para 6 jugadores con byes para los 2 mejores.
 * 
 * standings: array ordenado de posiciones (1° a 6°) con { name, ... }
 * 
 * Bracket:
 *   QF1: 3° vs 6°    QF2: 4° vs 5°
 *   SF1: 1° vs ganador QF1    SF2: 2° vs ganador QF2
 *   Final: ganador SF1 vs ganador SF2
 */
export function generateCopaBracket(standings) {
  // standings viene ordenado: [1°, 2°, 3°, 4°, 5°, 6°]
  const [first, second, third, fourth, fifth, sixth] = standings.map(s => s.name || s)

  const matches = []

  // Cuartos de final (Round 1)
  matches.push({
    id: 'qf1',
    stage: 'quarterfinal',
    round: 1,
    home: third,
    away: sixth,
    homeGoals: null,
    awayGoals: null,
    played: false,
    label: 'Cuartos 1',
    description: '3° vs 6°',
  })
  matches.push({
    id: 'qf2',
    stage: 'quarterfinal',
    round: 1,
    home: fourth,
    away: fifth,
    homeGoals: null,
    awayGoals: null,
    played: false,
    label: 'Cuartos 2',
    description: '4° vs 5°',
  })

  // Semifinales (Round 2) — TBD hasta que se jueguen cuartos
  matches.push({
    id: 'sf1',
    stage: 'semifinal',
    round: 2,
    home: first,
    away: 'TBD', // Ganador QF1
    homeGoals: null,
    awayGoals: null,
    played: false,
    label: 'Semi 1',
    description: `1° vs Ganador QF1`,
    dependsOn: 'qf1',
  })
  matches.push({
    id: 'sf2',
    stage: 'semifinal',
    round: 2,
    home: second,
    away: 'TBD', // Ganador QF2
    homeGoals: null,
    awayGoals: null,
    played: false,
    label: 'Semi 2',
    description: `2° vs Ganador QF2`,
    dependsOn: 'qf2',
  })

  // Final (Round 3)
  matches.push({
    id: 'final',
    stage: 'final',
    round: 3,
    home: 'TBD',
    away: 'TBD',
    homeGoals: null,
    awayGoals: null,
    played: false,
    label: 'Final',
    description: 'Ganador SF1 vs Ganador SF2',
    dependsOn: ['sf1', 'sf2'],
  })

  return matches
}

/**
 * Resuelve el bracket propagando ganadores.
 * Reglas:
 *   - Cuartos (QF): empate → clasifica el mejor posicionado en la liga (seed más bajo)
 *   - Semis y Final: partido definitivo, siempre hay ganador (alargue/penales)
 *                    un empate aquí no debería ocurrir (bloqueado en la API)
 */
export function resolveCopaBracket(matches, seedMap = {}) {
  const matchMap = {}
  for (const m of matches) {
    matchMap[m.id] = m
  }

  function getWinner(m, isQF = false) {
    if (!m || !m.played) return null
    if (m.homeGoals > m.awayGoals) return m.home
    if (m.awayGoals > m.homeGoals) return m.away
    // Draw resolution
    if (isQF) {
      // Cuartos: mejor seed de liga
      const hs = seedMap[m.home] ?? 99
      const as = seedMap[m.away] ?? 99
      return hs <= as ? m.home : m.away
    }
    // SF/Final: ganador por penales
    if (m.penaltyWinner) return m.penaltyWinner
    return null
  }

  const qf1   = matchMap['qf1']
  const qf2   = matchMap['qf2']
  const sf1   = matchMap['sf1']
  const sf2   = matchMap['sf2']
  const final_ = matchMap['final']

  if (qf1?.played && sf1)    sf1.away    = getWinner(qf1, true)
  if (qf2?.played && sf2)    sf2.away    = getWinner(qf2, true)
  if (sf1?.played && final_) final_.home = getWinner(sf1, false)
  if (sf2?.played && final_) final_.away = getWinner(sf2, false)

  return matches
}

export function getCopaChampion(matches) {
  const final_ = matches.find(m => m.id === 'final' || m.stage === 'final')
  if (!final_ || !final_.played) return null
  if (final_.homeGoals > final_.awayGoals) return final_.home
  if (final_.awayGoals > final_.homeGoals) return final_.away
  if (final_.penaltyWinner) return final_.penaltyWinner
  return null
}

export function generateFixture(players) {
  const n = players.length
  const rounds = []

  // Shuffle players for a random draw each tournament
  const list = [...players].sort(() => Math.random() - 0.5)

  // Ronda de ida
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

  // Ronda de vuelta: mismos partidos con local/visitante invertidos
  const idaRounds = rounds.length
  for (let round = 0; round < idaRounds; round++) {
    const idaMatches = rounds[round].matches
    const matches = idaMatches.map((m, i) => ({
      id: `v${round}-${i}`,
      home: m.away,
      away: m.home,
      homeGoals: null,
      awayGoals: null,
      played: false,
    }))
    rounds.push({ round: idaRounds + round + 1, matches })
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
