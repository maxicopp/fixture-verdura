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

describe('POST /api/copa/reset-match', () => {
  let POST: typeof import('../../app/api/copa/reset-match/route.ts').POST

  beforeEach(async () => {
    vi.resetModules()
    mockDbGet.mockReset()
    mockDbRun.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)
    mockRequireAuth.mockReset().mockResolvedValue(null)

    const mod = await import('../../app/api/copa/reset-match/route.ts')
    POST = mod.POST
  })

  it('returns 400 when match_key missing', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })

  it('returns 404 when no active copa', async () => {
    mockDbGet.mockResolvedValueOnce(null)
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ match_key: 'qf1' }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(404)
  })

  it('resets qf1 and cascades to sf1 and final', async () => {
    mockDbGet.mockResolvedValueOnce({ id: 1 })
    mockDbRun.mockResolvedValue({})
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ match_key: 'qf1' }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(200)
    // Should reset qf1, sf1, final, and update tournament
    expect(mockDbRun).toHaveBeenCalledTimes(4) // qf1 + sf1 + final + tournament
  })

  it('resets qf2 and cascades to sf2 and final', async () => {
    mockDbGet.mockResolvedValueOnce({ id: 1 })
    mockDbRun.mockResolvedValue({})
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ match_key: 'qf2' }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(200)
    expect(mockDbRun).toHaveBeenCalledTimes(4) // qf2 + sf2 + final + tournament
  })

  it('resets sf1 and cascades to final', async () => {
    mockDbGet.mockResolvedValueOnce({ id: 1 })
    mockDbRun.mockResolvedValue({})
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ match_key: 'sf1' }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(200)
    expect(mockDbRun).toHaveBeenCalledTimes(3) // sf1 + final + tournament
  })

  it('resets final without cascade', async () => {
    mockDbGet.mockResolvedValueOnce({ id: 1 })
    mockDbRun.mockResolvedValue({})
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ match_key: 'final' }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(200)
    expect(mockDbRun).toHaveBeenCalledTimes(2) // final + tournament
  })
})
