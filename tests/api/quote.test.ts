import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../public/frases.json', () => ({
  default: [
    { text: 'Frase uno', author: 'Autor 1' },
    { text: 'Frase dos', author: 'Autor 2' },
  ],
}))

describe('GET /api/quote', () => {
  let GET: typeof import('../../app/api/quote/route.ts').GET

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../../app/api/quote/route.ts')
    GET = mod.GET
  })

  it('returns a quote with text and author', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('text')
    expect(data).toHaveProperty('author')
    expect(typeof data.text).toBe('string')
    expect(typeof data.author).toBe('string')
  })
})
