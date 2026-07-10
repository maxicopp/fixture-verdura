import { describe, it, expect } from 'vitest'
import {
  generateFixture,
  calcStandings,
  generateCopaBracket,
  resolveCopaBracket,
  getCopaChampion,
} from '../../app/lib/fixture'
import type { CopaBracketMatch, Round } from '../../app/types'

describe('generateFixture', () => {
  const players = ['Max', 'Gayco', 'Vulvega', 'Nacho', 'Kevin', 'Negro']

  it('generates correct number of rounds for 6 players (ida + vuelta = 10)', () => {
    const fixture = generateFixture(players)
    expect(fixture).toHaveLength(10)
  })

  it('each round has 3 matches (n/2)', () => {
    const fixture = generateFixture(players)
    fixture.forEach(round => {
      expect(round.matches).toHaveLength(3)
    })
  })

  it('rounds are numbered 1 through 10', () => {
    const fixture = generateFixture(players)
    fixture.forEach((round, i) => {
      expect(round.round).toBe(i + 1)
    })
  })

  it('all matches start unplayed with null goals', () => {
    const fixture = generateFixture(players)
    fixture.forEach(round => {
      round.matches.forEach(match => {
        expect(match.played).toBe(false)
        expect(match.homeGoals).toBeNull()
        expect(match.awayGoals).toBeNull()
      })
    })
  })

  it('each player plays exactly once per round', () => {
    const fixture = generateFixture(players)
    fixture.forEach(round => {
      const playersInRound = round.matches.flatMap(m => [m.home, m.away])
      expect(playersInRound).toHaveLength(6)
      expect(new Set(playersInRound).size).toBe(6)
    })
  })

  it('vuelta rounds have inverted home/away compared to ida', () => {
    const fixture = generateFixture(players)
    for (let i = 0; i < 5; i++) {
      const idaRound = fixture[i]
      const vueltaRound = fixture[i + 5]
      idaRound.matches.forEach((idaMatch, j) => {
        const vueltaMatch = vueltaRound.matches[j]
        expect(vueltaMatch.home).toBe(idaMatch.away)
        expect(vueltaMatch.away).toBe(idaMatch.home)
      })
    }
  })

  it('match IDs are unique across all rounds', () => {
    const fixture = generateFixture(players)
    const allIds = fixture.flatMap(r => r.matches.map(m => m.id))
    expect(new Set(allIds).size).toBe(allIds.length)
  })

  it('every pair of players faces each other exactly twice (home + away)', () => {
    const fixture = generateFixture(players)
    const pairCount: Record<string, number> = {}
    fixture.forEach(round => {
      round.matches.forEach(m => {
        const key = [m.home, m.away].sort().join('-')
        pairCount[key] = (pairCount[key] || 0) + 1
      })
    })
    // C(6,2) = 15 unique pairs
    expect(Object.keys(pairCount)).toHaveLength(15)
    Object.values(pairCount).forEach(count => {
      expect(count).toBe(2)
    })
  })

  it('works with 4 players', () => {
    const fixture = generateFixture(['A', 'B', 'C', 'D'])
    expect(fixture).toHaveLength(6) // 3 ida + 3 vuelta
    fixture.forEach(r => expect(r.matches).toHaveLength(2))
  })
})

describe('calcStandings', () => {
  const players = ['Max', 'Gayco', 'Vulvega']

  it('returns all players with 0 stats when fixture has no played matches', () => {
    const fixture: Round[] = [
      {
        round: 1,
        matches: [
          { id: '0-0', home: 'Max', away: 'Gayco', homeGoals: null, awayGoals: null, played: false },
          { id: '0-1', home: 'Vulvega', away: 'Max', homeGoals: null, awayGoals: null, played: false },
        ],
      },
    ]
    const standings = calcStandings(players, fixture)
    expect(standings).toHaveLength(3)
    standings.forEach(s => {
      expect(s.pj).toBe(0)
      expect(s.pts).toBe(0)
      expect(s.gf).toBe(0)
      expect(s.gc).toBe(0)
    })
  })

  it('awards 3 points for a win', () => {
    const fixture: Round[] = [
      {
        round: 1,
        matches: [
          { id: '0-0', home: 'Max', away: 'Gayco', homeGoals: 2, awayGoals: 0, played: true },
        ],
      },
    ]
    const standings = calcStandings(players, fixture)
    const max = standings.find(s => s.name === 'Max')!
    const gayco = standings.find(s => s.name === 'Gayco')!
    expect(max.pts).toBe(3)
    expect(max.pg).toBe(1)
    expect(max.pp).toBe(0)
    expect(gayco.pts).toBe(0)
    expect(gayco.pp).toBe(1)
  })

  it('awards 1 point for a draw', () => {
    const fixture: Round[] = [
      {
        round: 1,
        matches: [
          { id: '0-0', home: 'Max', away: 'Gayco', homeGoals: 1, awayGoals: 1, played: true },
        ],
      },
    ]
    const standings = calcStandings(players, fixture)
    const max = standings.find(s => s.name === 'Max')!
    const gayco = standings.find(s => s.name === 'Gayco')!
    expect(max.pts).toBe(1)
    expect(max.pe).toBe(1)
    expect(gayco.pts).toBe(1)
    expect(gayco.pe).toBe(1)
  })

  it('correctly counts goals for and against', () => {
    const fixture: Round[] = [
      {
        round: 1,
        matches: [
          { id: '0-0', home: 'Max', away: 'Gayco', homeGoals: 3, awayGoals: 1, played: true },
        ],
      },
    ]
    const standings = calcStandings(players, fixture)
    const max = standings.find(s => s.name === 'Max')!
    expect(max.gf).toBe(3)
    expect(max.gc).toBe(1)
    const gayco = standings.find(s => s.name === 'Gayco')!
    expect(gayco.gf).toBe(1)
    expect(gayco.gc).toBe(3)
  })

  it('sorts by points, then goal difference, then goals scored', () => {
    const fixture: Round[] = [
      {
        round: 1,
        matches: [
          { id: '0-0', home: 'Max', away: 'Gayco', homeGoals: 3, awayGoals: 0, played: true },
          { id: '0-1', home: 'Vulvega', away: 'Max', homeGoals: 0, awayGoals: 0, played: true },
        ],
      },
      {
        round: 2,
        matches: [
          { id: '1-0', home: 'Gayco', away: 'Vulvega', homeGoals: 0, awayGoals: 3, played: true },
        ],
      },
    ]
    const standings = calcStandings(players, fixture)
    // Max: 4 pts (3+1), GD=+3, GF=3
    // Vulvega: 4 pts (1+3), GD=+3, GF=3
    // Gayco: 0 pts, GD=-6, GF=0
    expect(standings[0].name).toBe('Max')
    expect(standings[0].pts).toBe(4)
    expect(standings[2].name).toBe('Gayco')
  })

  it('handles empty fixture', () => {
    const standings = calcStandings(players, [])
    expect(standings).toHaveLength(3)
    standings.forEach(s => expect(s.pts).toBe(0))
  })
})

describe('generateCopaBracket', () => {
  const standings = ['Max', 'Gayco', 'Vulvega', 'Nacho', 'Kevin', 'Negro']

  it('generates 5 matches (2 QF + 2 SF + 1 Final)', () => {
    const bracket = generateCopaBracket(standings)
    expect(bracket).toHaveLength(5)
  })

  it('QF1 is 3rd vs 6th', () => {
    const bracket = generateCopaBracket(standings)
    const qf1 = bracket.find(m => m.id === 'qf1')!
    expect(qf1.home).toBe('Vulvega') // 3rd
    expect(qf1.away).toBe('Negro')   // 6th
    expect(qf1.stage).toBe('quarterfinal')
  })

  it('QF2 is 4th vs 5th', () => {
    const bracket = generateCopaBracket(standings)
    const qf2 = bracket.find(m => m.id === 'qf2')!
    expect(qf2.home).toBe('Nacho')  // 4th
    expect(qf2.away).toBe('Kevin')  // 5th
    expect(qf2.stage).toBe('quarterfinal')
  })

  it('SF1 has 1st vs TBD', () => {
    const bracket = generateCopaBracket(standings)
    const sf1 = bracket.find(m => m.id === 'sf1')!
    expect(sf1.home).toBe('Max')    // 1st
    expect(sf1.away).toBe('TBD')
    expect(sf1.stage).toBe('semifinal')
  })

  it('SF2 has 2nd vs TBD', () => {
    const bracket = generateCopaBracket(standings)
    const sf2 = bracket.find(m => m.id === 'sf2')!
    expect(sf2.home).toBe('Gayco')  // 2nd
    expect(sf2.away).toBe('TBD')
    expect(sf2.stage).toBe('semifinal')
  })

  it('Final has TBD vs TBD', () => {
    const bracket = generateCopaBracket(standings)
    const final_ = bracket.find(m => m.id === 'final')!
    expect(final_.home).toBe('TBD')
    expect(final_.away).toBe('TBD')
    expect(final_.stage).toBe('final')
  })

  it('all matches start unplayed', () => {
    const bracket = generateCopaBracket(standings)
    bracket.forEach(m => {
      expect(m.played).toBe(false)
      expect(m.homeGoals).toBeNull()
      expect(m.awayGoals).toBeNull()
    })
  })

  it('works with object standings', () => {
    const objectStandings = standings.map(name => ({ name }))
    const bracket = generateCopaBracket(objectStandings)
    expect(bracket).toHaveLength(5)
    expect(bracket.find(m => m.id === 'qf1')!.home).toBe('Vulvega')
  })
})

describe('resolveCopaBracket', () => {
  function makeBaseBracket(): CopaBracketMatch[] {
    return [
      { id: 'qf1', stage: 'quarterfinal', round: 1, home: 'Vulvega', away: 'Negro', homeGoals: null, awayGoals: null, played: false },
      { id: 'qf2', stage: 'quarterfinal', round: 1, home: 'Nacho', away: 'Kevin', homeGoals: null, awayGoals: null, played: false },
      { id: 'sf1', stage: 'semifinal', round: 2, home: 'Max', away: 'TBD', homeGoals: null, awayGoals: null, played: false },
      { id: 'sf2', stage: 'semifinal', round: 2, home: 'Gayco', away: 'TBD', homeGoals: null, awayGoals: null, played: false },
      { id: 'final', stage: 'final', round: 3, home: 'TBD', away: 'TBD', homeGoals: null, awayGoals: null, played: false },
    ]
  }

  const seedMap = { 'Vulvega': 3, 'Negro': 6, 'Nacho': 4, 'Kevin': 5, 'Max': 1, 'Gayco': 2 }

  it('propagates QF1 winner to SF1 away', () => {
    const matches = makeBaseBracket()
    matches[0].played = true
    matches[0].homeGoals = 2
    matches[0].awayGoals = 1
    const resolved = resolveCopaBracket(matches, seedMap)
    const sf1 = resolved.find(m => m.id === 'sf1')!
    expect(sf1.away).toBe('Vulvega')
  })

  it('propagates QF2 winner to SF2 away', () => {
    const matches = makeBaseBracket()
    matches[1].played = true
    matches[1].homeGoals = 0
    matches[1].awayGoals = 3
    const resolved = resolveCopaBracket(matches, seedMap)
    const sf2 = resolved.find(m => m.id === 'sf2')!
    expect(sf2.away).toBe('Kevin')
  })

  it('in QF draw, higher seed (lower number) advances', () => {
    const matches = makeBaseBracket()
    matches[0].played = true
    matches[0].homeGoals = 1
    matches[0].awayGoals = 1
    const resolved = resolveCopaBracket(matches, seedMap)
    const sf1 = resolved.find(m => m.id === 'sf1')!
    expect(sf1.away).toBe('Vulvega') // seed 3 < 6
  })

  it('propagates SF1 winner to final home', () => {
    const matches = makeBaseBracket()
    matches[0].played = true; matches[0].homeGoals = 2; matches[0].awayGoals = 0
    matches[2].away = 'Vulvega'
    matches[2].played = true; matches[2].homeGoals = 3; matches[2].awayGoals = 1
    const resolved = resolveCopaBracket(matches, seedMap)
    const final_ = resolved.find(m => m.id === 'final')!
    expect(final_.home).toBe('Max')
  })

  it('propagates SF2 winner to final away', () => {
    const matches = makeBaseBracket()
    matches[1].played = true; matches[1].homeGoals = 0; matches[1].awayGoals = 2
    matches[3].away = 'Kevin'
    matches[3].played = true; matches[3].homeGoals = 0; matches[3].awayGoals = 1
    const resolved = resolveCopaBracket(matches, seedMap)
    const final_ = resolved.find(m => m.id === 'final')!
    expect(final_.away).toBe('Kevin')
  })

  it('uses penaltyWinner for SF draw resolution', () => {
    const matches = makeBaseBracket()
    matches[0].played = true; matches[0].homeGoals = 2; matches[0].awayGoals = 0
    matches[2].away = 'Vulvega'
    matches[2].played = true; matches[2].homeGoals = 1; matches[2].awayGoals = 1
    matches[2].penaltyWinner = 'Vulvega'
    const resolved = resolveCopaBracket(matches, seedMap)
    const final_ = resolved.find(m => m.id === 'final')!
    expect(final_.home).toBe('Vulvega')
  })

  it('returns TBD when match not yet played', () => {
    const matches = makeBaseBracket()
    const resolved = resolveCopaBracket(matches, seedMap)
    const sf1 = resolved.find(m => m.id === 'sf1')!
    expect(sf1.away).toBe('TBD')
  })
})

describe('getCopaChampion', () => {
  it('returns null when final not played', () => {
    const matches: CopaBracketMatch[] = [
      { id: 'final', stage: 'final', round: 3, home: 'Max', away: 'Gayco', homeGoals: null, awayGoals: null, played: false },
    ]
    expect(getCopaChampion(matches)).toBeNull()
  })

  it('returns home when home wins', () => {
    const matches: CopaBracketMatch[] = [
      { id: 'final', stage: 'final', round: 3, home: 'Max', away: 'Gayco', homeGoals: 3, awayGoals: 1, played: true },
    ]
    expect(getCopaChampion(matches)).toBe('Max')
  })

  it('returns away when away wins', () => {
    const matches: CopaBracketMatch[] = [
      { id: 'final', stage: 'final', round: 3, home: 'Max', away: 'Gayco', homeGoals: 0, awayGoals: 2, played: true },
    ]
    expect(getCopaChampion(matches)).toBe('Gayco')
  })

  it('returns penaltyWinner on draw', () => {
    const matches: CopaBracketMatch[] = [
      { id: 'final', stage: 'final', round: 3, home: 'Max', away: 'Gayco', homeGoals: 1, awayGoals: 1, played: true, penaltyWinner: 'Gayco' },
    ]
    expect(getCopaChampion(matches)).toBe('Gayco')
  })

  it('returns null on draw without penaltyWinner', () => {
    const matches: CopaBracketMatch[] = [
      { id: 'final', stage: 'final', round: 3, home: 'Max', away: 'Gayco', homeGoals: 1, awayGoals: 1, played: true },
    ]
    expect(getCopaChampion(matches)).toBeNull()
  })

  it('returns null when there is no final match', () => {
    const matches: CopaBracketMatch[] = [
      { id: 'qf1', stage: 'quarterfinal', round: 1, home: 'A', away: 'B', homeGoals: 1, awayGoals: 0, played: true },
    ]
    expect(getCopaChampion(matches)).toBeNull()
  })
})
