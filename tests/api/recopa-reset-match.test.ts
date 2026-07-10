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

describe('POST /api/recopa/reset-match', () => {
  let POST: typeof import('../../app/api/recopa/reset-match/route.ts').POST

  beforeEach(async () => {
    vi.resetModules()
    mockDbGet.mockReset()
    mockDbRun.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)
    mockRequireAuth.mockReset().mockResolvedValue(null)

    const mod = await import('../../app/api/recopa/reset-match/route.ts')
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

  it('returns 404 when no recopa exists', async () => {
    mockDbGet
      .mockResolvedValueOnce(null) // no active
      .mockResolvedValueOnce(null) // no finished
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(404)
  })

  it('resets recopa match and tournament status', async () => {
    mockDbGet.mockResolvedValueOnce({ id: 3 }) // active recopa
    mockDbRun.mockResolvedValue({})
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(mockDbRun).toHaveBeenCalledTimes(2) // reset match + update tournament
  })

  it('uses provided tournament_id', async () => {
    mockDbRun.mockResolvedValue({})
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ tournament_id: 10 }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(200)
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('recopa-final'),
      [10]
    )
  })

  it('falls back to finished recopa when no active', async () => {
    mockDbGet
      .mockResolvedValueOnce(null)      // no active
      .mockResolvedValueOnce({ id: 7 }) // finished
    mockDbRun.mockResolvedValue({})
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(200)
  })
})
