import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDbAll = vi.fn()
const mockDbGet = vi.fn()
const mockInitSchema = vi.fn()

vi.mock('../../app/lib/db', () => ({
  dbAll: (...args: unknown[]) => mockDbAll(...args),
  dbGet: (...args: unknown[]) => mockDbGet(...args),
  initSchema: () => mockInitSchema(),
}))

describe('GET /api/tournaments/latest', () => {
  let GET: typeof import('../../app/api/tournaments/latest/route.ts').GET

  beforeEach(async () => {
    vi.resetModules()
    mockDbAll.mockReset()
    mockDbGet.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)

    const mod = await import('../../app/api/tournaments/latest/route.ts')
    GET = mod.GET
  })

  it('returns 404 when no tournaments exist', async () => {
    mockDbGet.mockResolvedValueOnce(null)
    const response = await GET()
    expect(response.status).toBe(404)
  })

  it('returns latest tournament', async () => {
    mockDbGet.mockResolvedValueOnce({ id: 5, name: 'Torneo', status: 'finished' })
    mockDbAll
      .mockResolvedValueOnce([
        { name: 'Max', disabled: 0 },
        { name: 'Gayco', disabled: 1 },
      ])
      .mockResolvedValueOnce([
        { match_key: '0-0', round: 1, home: 'Max', away: 'Gayco', home_goals: 1, away_goals: 0, played: 1 },
      ])

    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.players).toEqual(['Max', 'Gayco'])
    expect(data.disabledPlayers).toEqual(['Gayco'])
    expect(data.fixture).toHaveLength(1)
  })
})
