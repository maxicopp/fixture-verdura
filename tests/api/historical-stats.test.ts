import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDbAll = vi.fn()
const mockInitSchema = vi.fn()

vi.mock('../../app/lib/db', () => ({
  dbAll: (...args: unknown[]) => mockDbAll(...args),
  initSchema: () => mockInitSchema(),
}))

describe('GET /api/historical-stats', () => {
  let GET: typeof import('../../app/api/historical-stats/route.ts').GET

  beforeEach(async () => {
    vi.resetModules()
    mockDbAll.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)

    const mod = await import('../../app/api/historical-stats/route.ts')
    GET = mod.GET
  })

  it('returns historical stats with empty data', async () => {
    mockDbAll
      .mockResolvedValueOnce([]) // allMatches
      .mockResolvedValueOnce([]) // tournament participation
      .mockResolvedValueOnce([]) // tournaments
      .mockResolvedValueOnce([]) // titles

    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.historicalTable).toEqual([])
    expect(data.pointsByTournament).toEqual([])
    expect(data.titlesMap).toEqual({})
    expect(data.totalTournaments).toBe(0)
  })

  it('calculates correct stats from matches', async () => {
    mockDbAll
      .mockResolvedValueOnce([
        { tournament_id: 1, home: 'Max', away: 'Gayco', home_goals: 2, away_goals: 1, season: 'S1', year: 2025, type: 'league' },
        { tournament_id: 1, home: 'Gayco', away: 'Max', home_goals: 0, away_goals: 0, season: 'S1', year: 2025, type: 'league' },
      ])
      .mockResolvedValueOnce([{ name: 'Max', count: 1 }, { name: 'Gayco', count: 1 }]) // participation
      .mockResolvedValueOnce([{ id: 1, season: 'S1', year: 2025 }]) // tournaments
      .mockResolvedValueOnce([{ name: 'Max', count: 1 }]) // titles

    const response = await GET()
    const data = await response.json()
    expect(data.historicalTable).toHaveLength(2)
    // Max: W + D = 4 pts, GF=2, GC=1
    const max = data.historicalTable.find((s: any) => s.name === 'Max')
    expect(max.pts).toBe(4)
    expect(max.pg).toBe(1)
    expect(max.pe).toBe(1)
    expect(max.gf).toBe(2)
    expect(max.gc).toBe(1)
    // Gayco: L + D = 1 pt, GF=1, GC=2
    const gayco = data.historicalTable.find((s: any) => s.name === 'Gayco')
    expect(gayco.pts).toBe(1)
    expect(data.titlesMap).toEqual({ Max: 1 })
  })
})
