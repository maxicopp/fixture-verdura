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
}))

describe('POST /api/admin/reset-match', () => {
  let POST: typeof import('../../app/api/admin/reset-match/route.ts').POST

  beforeEach(async () => {
    vi.resetModules()
    mockDbGet.mockReset()
    mockDbRun.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)
    mockRequireAuth.mockReset().mockResolvedValue(null)

    const mod = await import('../../app/api/admin/reset-match/route.ts')
    POST = mod.POST
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValueOnce(Response.json({ error: 'No autorizado' }, { status: 401 }))
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ match_key: '0-0' }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(401)
  })

  it('returns 400 when match_key is missing', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })

  it('returns 404 when no active tournament and no tournament_id', async () => {
    mockDbGet.mockResolvedValueOnce(null)
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ match_key: '0-0' }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(404)
  })

  it('resets a match successfully', async () => {
    mockDbGet.mockResolvedValueOnce({ id: 1 })
    mockDbRun.mockResolvedValue({})
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ match_key: '0-0' }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE matches SET home_goals = NULL'),
      [1, '0-0']
    )
  })

  it('uses provided tournament_id', async () => {
    mockDbRun.mockResolvedValue({})
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ match_key: '1-2', tournament_id: 7 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(200)
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.any(String),
      [7, '1-2']
    )
  })
})
