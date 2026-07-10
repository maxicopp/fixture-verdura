import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDbAll = vi.fn()
const mockDbGet = vi.fn()
const mockDbRun = vi.fn()
const mockInitSchema = vi.fn()
const mockRequireAuth = vi.fn()

vi.mock('../../app/lib/db', () => ({
  dbAll: (...args: unknown[]) => mockDbAll(...args),
  dbGet: (...args: unknown[]) => mockDbGet(...args),
  dbRun: (...args: unknown[]) => mockDbRun(...args),
  initSchema: () => mockInitSchema(),
}))

vi.mock('../../app/lib/auth', () => ({
  requireAuth: () => mockRequireAuth(),
  isValidGoals: (v: unknown) => {
    if (v == null) return false
    const num = Number(v)
    return Number.isInteger(num) && num >= 0 && num <= 99
  },
}))

describe('GET /api/copa', () => {
  let GET: typeof import('../../app/api/copa/route.ts').GET

  beforeEach(async () => {
    vi.resetModules()
    mockDbAll.mockReset()
    mockDbGet.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)

    const mod = await import('../../app/api/copa/route.ts')
    GET = mod.GET
  })

  it('returns 404 when no copa exists', async () => {
    mockDbGet.mockResolvedValue(null)
    const response = await GET()
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.exists).toBe(false)
  })

  it('returns copa data when exists', async () => {
    mockDbGet
      .mockResolvedValueOnce({ id: 5, type: 'copa', status: 'active', champion: null })
    mockDbAll
      .mockResolvedValueOnce([
        { name: 'Max', seed_position: 1 },
        { name: 'Gayco', seed_position: 2 },
      ])
      .mockResolvedValueOnce([
        { match_key: 'qf1', round: 1, stage: 'quarterfinal', home: 'Vulvega', away: 'Negro', home_goals: null, away_goals: null, played: 0, penalty_winner: null, home_penalties: null, away_penalties: null },
      ])

    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.exists).toBe(true)
    expect(data.matches).toHaveLength(1)
    expect(data.players).toHaveLength(2)
  })
})

describe('POST /api/copa', () => {
  let POST: typeof import('../../app/api/copa/route.ts').POST

  beforeEach(async () => {
    vi.resetModules()
    mockDbAll.mockReset()
    mockDbGet.mockReset()
    mockDbRun.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)
    mockRequireAuth.mockReset().mockResolvedValue(null)

    const mod = await import('../../app/api/copa/route.ts')
    POST = mod.POST
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValueOnce(Response.json({ error: 'No autorizado' }, { status: 401 }))
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(401)
  })

  it('returns 400 with fewer than 6 standings', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Copa', season: 'S', year: 2026, standings: ['A', 'B'] }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })

  it('creates copa successfully', async () => {
    mockDbRun.mockResolvedValue({ lastInsertRowid: BigInt(10) })
    const standings = ['Max', 'Gayco', 'Vulvega', 'Nacho', 'Kevin', 'Negro']
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Copa Verdura', season: 'Clausura 2026', year: 2026, standings }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.message).toContain('Copa creada')
    // 1 insert tournament + 6 players + 5 matches = 12 dbRun calls
    expect(mockDbRun).toHaveBeenCalledTimes(12)
  })
})
