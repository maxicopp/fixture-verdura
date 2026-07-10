import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cookies, headers } from 'next/headers'

// Mock env variables
const originalEnv = process.env

describe('POST /api/admin/auth (login)', () => {
  let POST: typeof import('../../app/api/admin/auth/route.ts').POST

  beforeEach(async () => {
    vi.resetModules()
    process.env = { ...originalEnv, ADMIN_USER: 'admin', ADMIN_PASS: 'secret123', ADMIN_SECRET: 'hmac-key' }

    const mockCookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
    const mockHeadersList = { get: vi.fn().mockReturnValue('127.0.0.1') }

    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any)
    vi.mocked(headers).mockResolvedValue(mockHeadersList as any)

    const mod = await import('../../app/api/admin/auth/route.ts')
    POST = mod.POST
  })

  it('returns 401 for wrong credentials', async () => {
    const request = new Request('http://localhost/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'wrong' }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Credenciales inválidas')
  })

  it('returns 200 with ok for correct credentials', async () => {
    const request = new Request('http://localhost/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'secret123' }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ok).toBe(true)
  })

  it('sets httpOnly cookie on success', async () => {
    const mockCookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any)

    const request = new Request('http://localhost/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'secret123' }),
    })
    await POST(request as any)
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'verdura-admin-session',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' })
    )
  })
})

describe('DELETE /api/admin/auth (logout)', () => {
  let DELETE: typeof import('../../app/api/admin/auth/route.ts').DELETE

  beforeEach(async () => {
    vi.resetModules()
    process.env = { ...originalEnv, ADMIN_USER: 'admin', ADMIN_PASS: 'secret123' }

    const mockCookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any)

    const mod = await import('../../app/api/admin/auth/route.ts')
    DELETE = mod.DELETE
  })

  it('deletes session cookie', async () => {
    const mockCookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any)

    const response = await DELETE()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(mockCookieStore.delete).toHaveBeenCalledWith('verdura-admin-session')
  })
})

describe('GET /api/admin/auth (verify)', () => {
  let GET: typeof import('../../app/api/admin/auth/route.ts').GET

  beforeEach(async () => {
    vi.resetModules()
    process.env = { ...originalEnv, ADMIN_USER: 'admin', ADMIN_PASS: 'secret123', ADMIN_SECRET: 'hmac-key' }

    const mod = await import('../../app/api/admin/auth/route.ts')
    GET = mod.GET
  })

  it('returns authenticated: false with no cookie', async () => {
    const mockCookieStore = { get: vi.fn().mockReturnValue(undefined), set: vi.fn(), delete: vi.fn() }
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any)

    const response = await GET()
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.authenticated).toBe(false)
  })

  it('returns authenticated: true with valid token', async () => {
    // Generate a valid token
    const { generateToken } = await import('../../app/lib/auth')
    const token = generateToken('admin')

    const mockCookieStore = { get: vi.fn().mockReturnValue({ value: token }), set: vi.fn(), delete: vi.fn() }
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any)

    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.authenticated).toBe(true)
  })
})
