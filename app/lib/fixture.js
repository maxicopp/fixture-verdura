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
 * Dado el estado actual de los partidos de copa, resuelve los TBD
 * propagando ganadores a la siguiente ronda.
 * seedMap (opcional): { playerName: seedPosition } para resolver empates.
 */
export function resolveCopaBracket(matches, seedMap = {}) {
  const matchMap = {}
  for (const m of matches) {
    matchMap[m.id] = m
  }

  function getWinner(m) {
    if (!m || !m.played) return null
    if (m.homeGoals > m.awayGoals) return m.home
    if (m.awayGoals > m.homeGoals) return m.away
    // Empate: clasifica el mejor posicionado (seed más bajo)
    const homeSeed = seedMap[m.home] ?? 99
    const awaySeed = seedMap[m.away] ?? 99
    return homeSeed <= awaySeed ? m.home : m.away
  }

  // Propagar ganador de QF1 a SF1
  const qf1 = matchMap['qf1']
  const sf1 = matchMap['sf1']
  if (qf1 && qf1.played && sf1) {
    sf1.away = getWinner(qf1)
  }

  // Propagar ganador de QF2 a SF2
  const qf2 = matchMap['qf2']
  const sf2 = matchMap['sf2']
  if (qf2 && qf2.played && sf2) {
    sf2.away = getWinner(qf2)
  }

  // Propagar ganadores de semis a final
  const final_ = matchMap['final']
  if (sf1 && sf1.played && final_) {
    final_.home = getWinner(sf1)
  }
  if (sf2 && sf2.played && final_) {
    final_.away = getWinner(sf2)
  }

  return matches
}

/**
 * Obtener el campeón de la copa (ganador de la final)
 * seedMap (opcional) para resolver empate en la final.
 */
export function getCopaChampion(matches, seedMap = {}) {
  const final_ = matches.find(m => m.id === 'final' || m.stage === 'final')
  if (!final_ || !final_.played) return null
  if (final_.homeGoals > final_.awayGoals) return final_.home
  if (final_.awayGoals > final_.homeGoals) return final_.away
  // Empate en la final: clasifica el mejor posicionado
  const homeSeed = seedMap[final_.home] ?? 99
  const awaySeed = seedMap[final_.away] ?? 99
  return homeSeed <= awaySeed ? final_.home : final_.away
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
