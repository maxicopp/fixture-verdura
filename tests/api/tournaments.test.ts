import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
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

describe('GET /api/tournaments', () => {
  let GET: typeof import('../../app/api/tournaments/route.ts').GET

  beforeEach(async () => {
    vi.resetModules()
    mockDbAll.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)

    const mod = await import('../../app/api/tournaments/route.ts')
    GET = mod.GET
  })

  it('returns list of tournaments', async () => {
    mockDbAll.mockResolvedValueOnce([
      { id: 1, name: 'Torneo', season: 'Clausura 2026', year: 2026, type: 'league', status: 'active' },
    ])

    const response = await GET()
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].name).toBe('Torneo')
  })

  it('returns empty array when no tournaments', async () => {
    mockDbAll.mockResolvedValueOnce([])
    const response = await GET()
    const data = await response.json()
    expect(data).toEqual([])
  })
})

describe('POST /api/tournaments', () => {
  let POST: typeof import('../../app/api/tournaments/route.ts').POST

  beforeEach(async () => {
    vi.resetModules()
    mockDbAll.mockReset()
    mockDbRun.mockReset()
    mockInitSchema.mockReset().mockResolvedValue(undefined)
    mockRequireAuth.mockReset().mockResolvedValue(null) // authenticated

    const mod = await import('../../app/api/tournaments/route.ts')
    POST = mod.POST
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValueOnce(Response.json({ error: 'No autorizado' }, { status: 401 }))
    const request = new Request('http://localhost/api/tournaments', {
      method: 'POST',
      body: JSON.stringify({ name: 'T', season: 'S', year: 2026, players: ['A'] }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(401)
  })

  it('returns 400 when missing fields', async () => {
    const request = new Request('http://localhost/api/tournaments', {
      method: 'POST',
      body: JSON.stringify({ name: '', season: 'S', year: 2026, players: [] }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid year', async () => {
    const request = new Request('http://localhost/api/tournaments', {
      method: 'POST',
      body: JSON.stringify({ name: 'T', season: 'S', year: 1999, players: ['Max'] }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Año inválido')
  })

  it('returns 400 for invalid players', async () => {
    const request = new Request('http://localhost/api/tournaments', {
      method: 'POST',
      body: JSON.stringify({ name: 'T', season: 'S', year: 2026, players: ['', 'Max'] }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })

  it('creates tournament and inserts players', async () => {
    mockDbRun.mockResolvedValue({ lastInsertRowid: BigInt(1) })
    const request = new Request('http://localhost/api/tournaments', {
      method: 'POST',
      body: JSON.stringify({ name: 'Torneo X', season: 'Apertura', year: 2026, players: ['Max', 'Gayco'] }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.message).toBe('Torneo creado')
    // Should insert tournament + 2 players = 3 calls
    expect(mockDbRun).toHaveBeenCalledTimes(3)
  })
})
