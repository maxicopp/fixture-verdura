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

describe('GET /api/tournaments/[id]', () => {
  let GET: typeof import('../../app/api/tournaments/[id]/route.ts').GET

  beforeEach(async () => {
    vi.resetModules()
    mockDbAll.mockReset()
    mockDbGet.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)

    const mod = await import('../../app/api/tournaments/[id]/route.ts')
    GET = mod.GET
  })

  it('returns 404 when tournament not found', async () => {
    mockDbGet.mockResolvedValueOnce(null)
    mockDbAll.mockResolvedValue([])
    const request = new Request('http://localhost/api/tournaments/999')
    const response = await GET(request as any, { params: Promise.resolve({ id: '999' }) })
    expect(response.status).toBe(404)
  })

  it('returns tournament detail with standings', async () => {
    mockDbGet.mockResolvedValueOnce({ id: 1, name: 'Torneo', status: 'active' })
    mockDbAll
      .mockResolvedValueOnce([{ name: 'Max', disabled: 0 }, { name: 'Gayco', disabled: 0 }])
      .mockResolvedValueOnce([
        { match_key: '0-0', round: 1, home: 'Max', away: 'Gayco', home_goals: 2, away_goals: 0, played: 1, stage: null, penalty_winner: null, home_penalties: null, away_penalties: null },
      ])

    const request = new Request('http://localhost/api/tournaments/1')
    const response = await GET(request as any, { params: Promise.resolve({ id: '1' }) })
    expect(response.status).toBe(200)
    const data = JSON.parse(await response.text())
    expect(data.standings).toHaveLength(2)
    expect(data.standings[0].name).toBe('Max')
    expect(data.standings[0].pts).toBe(3)
  })
})

describe('PATCH /api/tournaments/[id]', () => {
  let PATCH: typeof import('../../app/api/tournaments/[id]/route.ts').PATCH

  beforeEach(async () => {
    vi.resetModules()
    mockDbGet.mockReset()
    mockDbRun.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)
    mockRequireAuth.mockReset().mockResolvedValue(null)

    const mod = await import('../../app/api/tournaments/[id]/route.ts')
    PATCH = mod.PATCH
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValueOnce(Response.json({ error: 'No autorizado' }, { status: 401 }))
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'finish', champion: 'Max' }),
    })
    const response = await PATCH(request as any, { params: Promise.resolve({ id: '1' }) })
    expect(response.status).toBe(401)
  })

  it('finishes tournament with action=finish', async () => {
    mockDbRun.mockResolvedValue({})
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'finish', champion: 'Max', top_scorer: 'Max', top_scorer_goals: 10 }),
    })
    const response = await PATCH(request as any, { params: Promise.resolve({ id: '1' }) })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toContain('finalizado')
  })

  it('returns 400 for finish without champion', async () => {
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'finish' }),
    })
    const response = await PATCH(request as any, { params: Promise.resolve({ id: '1' }) })
    expect(response.status).toBe(400)
  })

  it('saves result with action=result', async () => {
    mockDbRun.mockResolvedValue({})
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'result', match_key: '0-0', home_goals: 2, away_goals: 1 }),
    })
    const response = await PATCH(request as any, { params: Promise.resolve({ id: '1' }) })
    expect(response.status).toBe(200)
  })

  it('resets match with action=reset', async () => {
    mockDbRun.mockResolvedValue({})
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'reset', match_key: '0-0' }),
    })
    const response = await PATCH(request as any, { params: Promise.resolve({ id: '1' }) })
    expect(response.status).toBe(200)
  })

  it('returns 400 for unknown action', async () => {
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'invalid' }),
    })
    const response = await PATCH(request as any, { params: Promise.resolve({ id: '1' }) })
    expect(response.status).toBe(400)
  })
})
