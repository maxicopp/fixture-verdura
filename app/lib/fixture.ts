import type { CopaBracketMatch, Match, Round, Standing } from '../types'

/**
 * Genera el bracket de Copa para 6 jugadores con byes para los 2 mejores.
 */
export function generateCopaBracket(standings: { name: string }[] | string[]): CopaBracketMatch[] {
  const [first, second, third, fourth, fifth, sixth] = standings.map(s => typeof s === 'string' ? s : s.name)

  const matches: CopaBracketMatch[] = []

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

  // Semifinales (Round 2)
  matches.push({
    id: 'sf1',
    stage: 'semifinal',
    round: 2,
    home: first,
    away: 'TBD',
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
    away: 'TBD',
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
 */
export function resolveCopaBracket(matches: CopaBracketMatch[], seedMap: Record<string, number> = {}): CopaBracketMatch[] {
  const matchMap: Record<string, CopaBracketMatch> = {}
  for (const m of matches) {
    matchMap[m.id] = m
  }

  function getWinner(m: CopaBracketMatch | undefined, isQF: boolean = false): string | null {
    if (!m || !m.played) return null
    if (m.homeGoals! > m.awayGoals!) return m.home
    if (m.awayGoals! > m.homeGoals!) return m.away
    // Draw resolution
    if (isQF) {
      const hs = seedMap[m.home] ?? 99
      const as = seedMap[m.away] ?? 99
      return hs <= as ? m.home : m.away
    }
    // SF/Final: ganador por penales
    if (m.penaltyWinner) return m.penaltyWinner
    return null
  }

  const qf1 = matchMap['qf1']
  const qf2 = matchMap['qf2']
  const sf1 = matchMap['sf1']
  const sf2 = matchMap['sf2']
  const final_ = matchMap['final']

  if (qf1?.played && sf1) sf1.away = getWinner(qf1, true) ?? 'TBD'
  if (qf2?.played && sf2) sf2.away = getWinner(qf2, true) ?? 'TBD'
  if (sf1?.played && final_) final_.home = getWinner(sf1, false) ?? 'TBD'
  if (sf2?.played && final_) final_.away = getWinner(sf2, false) ?? 'TBD'

  return matches
}

export function getCopaChampion(matches: CopaBracketMatch[]): string | null {
  const final_ = matches.find(m => m.id === 'final' || m.stage === 'final')
  if (!final_ || !final_.played) return null
  if (final_.homeGoals! > final_.awayGoals!) return final_.home
  if (final_.awayGoals! > final_.homeGoals!) return final_.away
  if (final_.penaltyWinner) return final_.penaltyWinner
  return null
}

export function generateFixture(players: string[]): Round[] {
  const n = players.length
  const rounds: Round[] = []

  // Shuffle players for a random draw each tournament
  const list = [...players].sort(() => Math.random() - 0.5)

  // Ronda de ida
  for (let round = 0; round < n - 1; round++) {
    const matches: Match[] = []
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
    list.splice(1, 0, list.pop()!)
  }

  // Ronda de vuelta: mismos partidos con local/visitante invertidos
  const idaRounds = rounds.length
  for (let round = 0; round < idaRounds; round++) {
    const idaMatches = rounds[round].matches
    const matches: Match[] = idaMatches.map((m, i) => ({
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

export function calcStandings(players: string[], fixture: Round[]): Standing[] {
  const table: Record<string, Standing> = {}
  players.forEach(p => {
    table[p] = { name: p, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 }
  })
  fixture.forEach(round => {
    round.matches.forEach(m => {
      if (!m.played) return
      const h = table[m.home]
      const a = table[m.away]
      if (!h || !a) return
      h.pj++; a.pj++
      h.gf += m.homeGoals!; h.gc += m.awayGoals!
      a.gf += m.awayGoals!; a.gc += m.homeGoals!
      if (m.homeGoals! > m.awayGoals!) {
        h.pg++; h.pts += 3; a.pp++
      } else if (m.homeGoals! < m.awayGoals!) {
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
