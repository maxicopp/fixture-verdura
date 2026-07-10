import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDbAll = vi.fn()
const mockInitSchema = vi.fn()

vi.mock('../../app/lib/db', () => ({
  dbAll: (...args: unknown[]) => mockDbAll(...args),
  initSchema: () => mockInitSchema(),
}))

describe('GET /api/head-to-head', () => {
  let GET: typeof import('../../app/api/head-to-head/route.ts').GET

  beforeEach(async () => {
    vi.resetModules()
    mockDbAll.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)

    const mod = await import('../../app/api/head-to-head/route.ts')
    GET = mod.GET
  })

  it('returns 400 when p1 or p2 missing', async () => {
    const request = new Request('http://localhost/api/head-to-head?p1=Max')
    const response = await GET(request as any)
    expect(response.status).toBe(400)
  })

  it('returns head-to-head data', async () => {
    mockDbAll.mockResolvedValueOnce([
      { home: 'Max', away: 'Gayco', home_goals: 3, away_goals: 1, round: 1, stage: null, tournament_id: 1, season: 'Clausura 2026', year: 2026, tournament_name: 'Torneo', tournament_type: 'league' },
      { home: 'Gayco', away: 'Max', home_goals: 2, away_goals: 2, round: 6, stage: null, tournament_id: 1, season: 'Clausura 2026', year: 2026, tournament_name: 'Torneo', tournament_type: 'league' },
    ])

    const request = new Request('http://localhost/api/head-to-head?p1=Max&p2=Gayco')
    const response = await GET(request as any)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.p1).toBe('Max')
    expect(data.p2).toBe('Gayco')
    expect(data.total).toBe(2)
    expect(data.p1Wins).toBe(1)
    expect(data.p2Wins).toBe(0)
    expect(data.draws).toBe(1)
    expect(data.p1Goals).toBe(5) // 3 + 2
    expect(data.p2Goals).toBe(3) // 1 + 2
    expect(data.matches).toHaveLength(2)
  })

  it('returns empty data when no matches found', async () => {
    mockDbAll.mockResolvedValueOnce([])
    const request = new Request('http://localhost/api/head-to-head?p1=Max&p2=Unknown')
    const response = await GET(request as any)
    const data = await response.json()
    expect(data.total).toBe(0)
    expect(data.p1Wins).toBe(0)
    expect(data.p2Wins).toBe(0)
    expect(data.draws).toBe(0)
  })
})
