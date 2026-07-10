import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDbAll = vi.fn()
const mockInitSchema = vi.fn()

vi.mock('../../app/lib/db', () => ({
  dbAll: (...args: unknown[]) => mockDbAll(...args),
  initSchema: () => mockInitSchema(),
}))

describe('GET /api/hall-of-fame', () => {
  let GET: typeof import('../../app/api/hall-of-fame/route.ts').GET

  beforeEach(async () => {
    vi.resetModules()
    mockDbAll.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)

    const mod = await import('../../app/api/hall-of-fame/route.ts')
    GET = mod.GET
  })

  it('returns empty data when no tournaments', async () => {
    mockDbAll
      .mockResolvedValueOnce([]) // champions
      .mockResolvedValueOnce([]) // titleCounts
      .mockResolvedValueOnce([]) // allMatches

    const response = await GET()
    const data = await response.json()
    expect(data.champions).toEqual([])
    expect(data.titleCounts).toEqual([])
    expect(data.allTimeScorers).toEqual([])
  })

  it('returns hall of fame data', async () => {
    mockDbAll
      .mockResolvedValueOnce([
        { id: 1, name: 'Torneo', season: 'S1', year: 2025, type: 'league', champion: 'Max', top_scorer: 'Max', top_scorer_goals: 10, finished_at: '2025-06-01' },
      ])
      .mockResolvedValueOnce([{ name: 'Max', titles: 1 }])
      .mockResolvedValueOnce([
        { home: 'Max', away: 'Gayco', home_goals: 5, away_goals: 2 },
        { home: 'Gayco', away: 'Max', home_goals: 3, away_goals: 1 },
      ])

    const response = await GET()
    const data = await response.json()
    expect(data.champions).toHaveLength(1)
    expect(data.titleCounts[0]).toEqual({ name: 'Max', titles: 1 })
    // Max: 5 (home) + 1 (away) = 6 goals
    // Gayco: 2 (away) + 3 (home) = 5 goals
    expect(data.allTimeScorers[0]).toEqual({ name: 'Max', goals: 6 })
    expect(data.allTimeScorers[1]).toEqual({ name: 'Gayco', goals: 5 })
  })
})
