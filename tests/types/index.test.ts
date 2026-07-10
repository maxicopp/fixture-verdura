import { describe, it, expect } from 'vitest'
import type {
  Tournament,
  Match,
  Round,
  Standing,
  CopaBracketMatch,
  HeadToHeadData,
  HallOfFameData,
  HistoricalStatsData,
  Quote,
  Odds,
  CopaData,
  RecopaData,
} from '../../app/types'

describe('Types', () => {
  it('Tournament type has correct shape', () => {
    const tournament: Tournament = {
      id: 1,
      name: 'Torneo',
      season: 'Clausura 2026',
      year: 2026,
      type: 'league',
      status: 'active',
      champion: null,
      top_scorer: null,
      top_scorer_goals: 0,
      created_at: null,
      finished_at: null,
    }
    expect(tournament.id).toBe(1)
    expect(tournament.type).toBe('league')
  })

  it('Match type has correct shape', () => {
    const match: Match = {
      id: '0-0',
      home: 'Max',
      away: 'Gayco',
      homeGoals: 2,
      awayGoals: 1,
      played: true,
    }
    expect(match.played).toBe(true)
  })

  it('Round type has correct shape', () => {
    const round: Round = {
      round: 1,
      matches: [],
    }
    expect(round.round).toBe(1)
  })

  it('Standing type has correct shape', () => {
    const standing: Standing = {
      name: 'Max',
      pj: 10,
      pg: 7,
      pe: 2,
      pp: 1,
      gf: 20,
      gc: 8,
      pts: 23,
    }
    expect(standing.pts).toBe(23)
  })

  it('CopaBracketMatch supports penalty fields', () => {
    const match: CopaBracketMatch = {
      id: 'sf1',
      stage: 'semifinal',
      round: 2,
      home: 'Max',
      away: 'Gayco',
      homeGoals: 1,
      awayGoals: 1,
      played: true,
      penaltyWinner: 'Max',
      homePenalties: 4,
      awayPenalties: 3,
    }
    expect(match.penaltyWinner).toBe('Max')
  })

  it('Quote type has text and author', () => {
    const quote: Quote = { text: 'Hello', author: 'World' }
    expect(quote.text).toBe('Hello')
  })

  it('Odds type has home, draw, away', () => {
    const odds: Odds = { home: 1.5, draw: 3.2, away: 4.1 }
    expect(odds.home).toBeLessThan(odds.away)
  })
})
