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

describe('GET /api/recopa', () => {
  let GET: typeof import('../../app/api/recopa/route.ts').GET

  beforeEach(async () => {
    vi.resetModules()
    mockDbAll.mockReset()
    mockDbGet.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)

    const mod = await import('../../app/api/recopa/route.ts')
    GET = mod.GET
  })

  it('returns 404 with context when no recopa exists', async () => {
    mockDbGet
      .mockResolvedValueOnce(null) // no active recopa
      .mockResolvedValueOnce(null) // no any recopa
      .mockResolvedValueOnce({ champion: 'Max', season: 'Clausura', year: 2026 }) // league champion
      .mockResolvedValueOnce({ champion: 'Gayco', season: 'Clausura', year: 2026, status: 'finished' }) // copa
    const response = await GET()
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.exists).toBe(false)
    expect(data.context.leagueChampion).toBe('Max')
    expect(data.context.copaChampion).toBe('Gayco')
  })

  it('returns recopa data when exists', async () => {
    mockDbGet
      .mockResolvedValueOnce({ id: 10, type: 'recopa', status: 'active', champion: null })
      .mockResolvedValueOnce({ match_key: 'recopa-final', stage: 'final', home: 'Max', away: 'Gayco', home_goals: null, away_goals: null, played: 0, penalty_winner: null, home_penalties: null, away_penalties: null })
    mockDbAll.mockResolvedValueOnce([
      { name: 'Max', seed_position: 1 },
      { name: 'Gayco', seed_position: 2 },
    ])

    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.exists).toBe(true)
    expect(data.match.home).toBe('Max')
    expect(data.match.away).toBe('Gayco')
  })
})

describe('POST /api/recopa', () => {
  let POST: typeof import('../../app/api/recopa/route.ts').POST

  beforeEach(async () => {
    vi.resetModules()
    mockDbAll.mockReset()
    mockDbGet.mockReset()
    mockDbRun.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)
    mockRequireAuth.mockReset().mockResolvedValue(null)

    const mod = await import('../../app/api/recopa/route.ts')
    POST = mod.POST
  })

  it('returns 400 when fields are missing', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Recopa' }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })

  it('returns 400 when existing active recopa', async () => {
    mockDbGet.mockResolvedValueOnce({ id: 5 }) // existing active
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Recopa', season: 'S', year: 2026, league_champion: 'Max', copa_champion: 'Gayco' }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Ya existe')
  })

  it('creates recopa with two different champions', async () => {
    mockDbGet.mockResolvedValueOnce(null) // no existing
    mockDbRun.mockResolvedValue({ lastInsertRowid: BigInt(20) })
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Recopa', season: 'Clausura', year: 2026, league_champion: 'Max', copa_champion: 'Gayco' }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.autoWin).toBe(false)
    expect(data.champion).toBeNull()
  })

  it('auto-wins when same champion', async () => {
    mockDbGet.mockResolvedValueOnce(null) // no existing
    mockDbRun.mockResolvedValue({ lastInsertRowid: BigInt(21) })
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Recopa', season: 'Clausura', year: 2026, league_champion: 'Max', copa_champion: 'Max' }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.autoWin).toBe(true)
    expect(data.champion).toBe('Max')
  })
})
