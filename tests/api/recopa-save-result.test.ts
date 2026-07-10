import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDbGet = vi.fn()
const mockDbRun = vi.fn()
const mockInitSchema = vi.fn()
const mockRequireAuth = vi.fn()

vi.mock('../../app/lib/db', () => ({
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

describe('POST /api/recopa/save-result', () => {
  let POST: typeof import('../../app/api/recopa/save-result/route.ts').POST

  beforeEach(async () => {
    vi.resetModules()
    mockDbGet.mockReset()
    mockDbRun.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)
    mockRequireAuth.mockReset().mockResolvedValue(null)

    const mod = await import('../../app/api/recopa/save-result/route.ts')
    POST = mod.POST
  })

  it('returns 400 with invalid goals', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ home_goals: -1, away_goals: 0 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })

  it('returns 404 when no active recopa', async () => {
    mockDbGet.mockResolvedValueOnce(null)
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ home_goals: 2, away_goals: 1 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(404)
  })

  it('returns 404 when match not found', async () => {
    mockDbGet
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce(null) // no match
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ home_goals: 2, away_goals: 1 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(404)
  })

  it('saves result when home wins (no draw)', async () => {
    mockDbGet
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ match_key: 'recopa-final', home: 'Max', away: 'Gayco', played: 0 })
    mockDbRun.mockResolvedValue({})

    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ home_goals: 3, away_goals: 1 }),
    })
    const response = await POST(request as any)
    const data = await response.json()
    expect(data.winner).toBe('Max')
    expect(data.finished).toBe(true)
    expect(data.isDraw).toBe(false)
  })

  it('saves result when away wins', async () => {
    mockDbGet
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ match_key: 'recopa-final', home: 'Max', away: 'Gayco', played: 0 })
    mockDbRun.mockResolvedValue({})

    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ home_goals: 0, away_goals: 2 }),
    })
    const response = await POST(request as any)
    const data = await response.json()
    expect(data.winner).toBe('Gayco')
  })

  it('returns 400 on draw without penalty_winner', async () => {
    mockDbGet
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ match_key: 'recopa-final', home: 'Max', away: 'Gayco', played: 0 })

    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ home_goals: 1, away_goals: 1 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('penales')
  })

  it('resolves draw with penalty_winner', async () => {
    mockDbGet
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ match_key: 'recopa-final', home: 'Max', away: 'Gayco', played: 0 })
    mockDbRun.mockResolvedValue({})

    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ home_goals: 1, away_goals: 1, penalty_winner: 'Gayco', home_penalties: 3, away_penalties: 4 }),
    })
    const response = await POST(request as any)
    const data = await response.json()
    expect(data.winner).toBe('Gayco')
    expect(data.isDraw).toBe(true)
    expect(data.finished).toBe(true)
  })
})
