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

describe('POST /api/copa/save-result', () => {
  let POST: typeof import('../../app/api/copa/save-result/route.ts').POST

  beforeEach(async () => {
    vi.resetModules()
    mockDbAll.mockReset()
    mockDbGet.mockReset()
    mockDbRun.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)
    mockRequireAuth.mockReset().mockResolvedValue(null)

    const mod = await import('../../app/api/copa/save-result/route.ts')
    POST = mod.POST
  })

  it('returns 400 with missing fields', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ home_goals: 1 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })

  it('returns 404 when no active copa', async () => {
    mockDbGet.mockResolvedValueOnce(null) // no active copa
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ match_key: 'qf1', home_goals: 2, away_goals: 1 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(404)
  })

  it('returns 404 when match not found', async () => {
    mockDbGet
      .mockResolvedValueOnce({ id: 1 })   // active copa
      .mockResolvedValueOnce(null)          // match not found
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ match_key: 'xyz', home_goals: 1, away_goals: 0 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(404)
  })

  it('returns 400 when match depends on TBD', async () => {
    mockDbGet
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ match_key: 'sf1', home: 'Max', away: 'TBD', stage: 'semifinal' })
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ match_key: 'sf1', home_goals: 2, away_goals: 0 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('depende')
  })

  it('saves QF result and propagates winner (home wins)', async () => {
    mockDbGet
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ match_key: 'qf1', home: 'Vulvega', away: 'Negro', stage: 'quarterfinal' })
    mockDbRun.mockResolvedValue({})

    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ match_key: 'qf1', home_goals: 3, away_goals: 1 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.winner).toBe('Vulvega')
    // Should update sf1 away
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining("match_key = 'sf1'"),
      expect.arrayContaining(['Vulvega'])
    )
  })

  it('in QF draw, higher seed advances', async () => {
    mockDbGet
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ match_key: 'qf1', home: 'Vulvega', away: 'Negro', stage: 'quarterfinal' })
      .mockResolvedValueOnce({ seed_position: 3 }) // Vulvega seed
      .mockResolvedValueOnce({ seed_position: 6 }) // Negro seed
    mockDbRun.mockResolvedValue({})

    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ match_key: 'qf1', home_goals: 1, away_goals: 1 }),
    })
    const response = await POST(request as any)
    const data = await response.json()
    expect(data.winner).toBe('Vulvega')
    expect(data.isDraw).toBe(true)
  })

  it('returns error in SF draw without penalty_winner', async () => {
    mockDbGet
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ match_key: 'sf1', home: 'Max', away: 'Vulvega', stage: 'semifinal' })
    mockDbRun.mockResolvedValue({})

    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ match_key: 'sf1', home_goals: 1, away_goals: 1 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('penales')
  })

  it('finishes copa when final is played', async () => {
    mockDbGet
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ match_key: 'final', home: 'Max', away: 'Gayco', stage: 'final' })
    mockDbAll.mockResolvedValueOnce([
      { home: 'Max', away: 'Gayco', home_goals: 3, away_goals: 1 },
    ])
    mockDbRun.mockResolvedValue({})

    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ match_key: 'final', home_goals: 3, away_goals: 1 }),
    })
    const response = await POST(request as any)
    const data = await response.json()
    expect(data.finished).toBe(true)
    expect(data.winner).toBe('Max')
  })
})
