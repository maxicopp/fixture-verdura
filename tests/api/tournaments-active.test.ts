import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDbAll = vi.fn()
const mockDbGet = vi.fn()
const mockInitSchema = vi.fn()

vi.mock('../../app/lib/db', () => ({
  dbAll: (...args: unknown[]) => mockDbAll(...args),
  dbGet: (...args: unknown[]) => mockDbGet(...args),
  initSchema: () => mockInitSchema(),
}))

describe('GET /api/tournaments/active', () => {
  let GET: typeof import('../../app/api/tournaments/active/route.ts').GET

  beforeEach(async () => {
    vi.resetModules()
    mockDbAll.mockReset()
    mockDbGet.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)

    const mod = await import('../../app/api/tournaments/active/route.ts')
    GET = mod.GET
  })

  it('returns 404 when no tournaments exist', async () => {
    mockDbGet.mockResolvedValue(null)
    const response = await GET()
    expect(response.status).toBe(404)
  })

  it('returns active tournament with fixture and players', async () => {
    mockDbGet.mockResolvedValueOnce({ id: 1, name: 'Torneo', status: 'active' })
    mockDbAll
      .mockResolvedValueOnce([
        { name: 'Max', disabled: 0 },
        { name: 'Gayco', disabled: 1 },
      ])
      .mockResolvedValueOnce([
        { match_key: '0-0', round: 1, home: 'Max', away: 'Gayco', home_goals: 2, away_goals: 1, played: 1 },
        { match_key: '0-1', round: 1, home: 'Vulvega', away: 'Nacho', home_goals: null, away_goals: null, played: 0 },
      ])
      .mockResolvedValueOnce([]) // historical matches

    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.players).toEqual(['Max', 'Gayco'])
    expect(data.disabledPlayers).toEqual(['Gayco'])
    expect(data.fixture).toHaveLength(1)
    expect(data.fixture[0].matches).toHaveLength(2)
    expect(data.histStats).toBeDefined()
  })

  it('falls back to latest tournament when no active', async () => {
    mockDbGet
      .mockResolvedValueOnce(null) // no active
      .mockResolvedValueOnce({ id: 2, name: 'Old Torneo', status: 'finished' }) // fallback
    mockDbAll
      .mockResolvedValueOnce([{ name: 'Max', disabled: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const response = await GET()
    expect(response.status).toBe(200)
  })
})
