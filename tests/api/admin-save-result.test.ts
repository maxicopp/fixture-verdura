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

describe('POST /api/admin/save-result', () => {
  let POST: typeof import('../../app/api/admin/save-result/route.ts').POST

  beforeEach(async () => {
    vi.resetModules()
    mockDbAll.mockReset()
    mockDbGet.mockReset()
    mockDbRun.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)
    mockRequireAuth.mockReset().mockResolvedValue(null)

    const mod = await import('../../app/api/admin/save-result/route.ts')
    POST = mod.POST
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValueOnce(Response.json({ error: 'No autorizado' }, { status: 401 }))
    const request = new Request('http://localhost/api/admin/save-result', {
      method: 'POST',
      body: JSON.stringify({ match_key: '0-0', home_goals: 1, away_goals: 0 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(401)
  })

  it('returns 400 when match_key is missing', async () => {
    const request = new Request('http://localhost/api/admin/save-result', {
      method: 'POST',
      body: JSON.stringify({ home_goals: 1, away_goals: 0 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })

  it('returns 400 when goals are invalid', async () => {
    const request = new Request('http://localhost/api/admin/save-result', {
      method: 'POST',
      body: JSON.stringify({ match_key: '0-0', home_goals: -1, away_goals: 0 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })

  it('returns 404 when no active tournament', async () => {
    mockDbGet.mockResolvedValueOnce(null) // no active tournament
    const request = new Request('http://localhost/api/admin/save-result', {
      method: 'POST',
      body: JSON.stringify({ match_key: '0-0', home_goals: 2, away_goals: 1 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(404)
  })

  it('saves result successfully when tournament is not finished', async () => {
    mockDbGet
      .mockResolvedValueOnce({ id: 1 }) // active tournament
      .mockResolvedValueOnce({ c: 5 })  // pending matches > 0
    mockDbRun.mockResolvedValue({})

    const request = new Request('http://localhost/api/admin/save-result', {
      method: 'POST',
      body: JSON.stringify({ match_key: '0-0', home_goals: 2, away_goals: 1 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(data.message).toBe('Resultado guardado')
  })

  it('finishes tournament when all matches are played', async () => {
    mockDbGet
      .mockResolvedValueOnce({ id: 1 })  // active tournament
      .mockResolvedValueOnce({ c: 0 })   // no pending matches
    mockDbAll
      .mockResolvedValueOnce([{ name: 'Max' }, { name: 'Gayco' }]) // players
      .mockResolvedValueOnce([                                      // matchRows
        { match_key: '0-0', round: 1, home: 'Max', away: 'Gayco', home_goals: 3, away_goals: 0, played: 1 },
      ])
    mockDbRun.mockResolvedValue({})

    const request = new Request('http://localhost/api/admin/save-result', {
      method: 'POST',
      body: JSON.stringify({ match_key: '0-0', home_goals: 3, away_goals: 0 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.finished).toBe(true)
  })

  it('uses provided tournament_id', async () => {
    mockDbGet.mockResolvedValueOnce({ c: 3 }) // pending matches
    mockDbRun.mockResolvedValue({})

    const request = new Request('http://localhost/api/admin/save-result', {
      method: 'POST',
      body: JSON.stringify({ match_key: '1-0', home_goals: 0, away_goals: 0, tournament_id: 5 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(200)
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE matches'),
      expect.arrayContaining([5, '1-0'])
    )
  })
})
