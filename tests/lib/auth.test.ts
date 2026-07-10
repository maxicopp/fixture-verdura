import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to mock the module before importing
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

describe('auth', () => {
  let auth: typeof import('../../app/lib/auth')

  beforeEach(async () => {
    vi.resetModules()
    process.env.ADMIN_PASS = 'test-secret-pass'
    process.env.ADMIN_SECRET = 'test-secret-key-for-hmac'
    auth = await import('../../app/lib/auth')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.ADMIN_PASS
    delete process.env.ADMIN_SECRET
  })

  describe('generateToken', () => {
    it('generates a base64.signature format token', () => {
      const token = auth.generateToken('admin')
      expect(token).toContain('.')
      const parts = token.split('.')
      expect(parts).toHaveLength(2)
    })

    it('payload contains username and timestamp', () => {
      const token = auth.generateToken('testuser')
      const [payloadB64] = token.split('.')
      const payload = Buffer.from(payloadB64, 'base64').toString()
      expect(payload).toContain('testuser')
      expect(payload).toMatch(/testuser:\d+/)
    })

    it('generates different tokens for different usernames', () => {
      const token1 = auth.generateToken('user1')
      const token2 = auth.generateToken('user2')
      expect(token1).not.toBe(token2)
    })

    it('generates different tokens at different times', async () => {
      const token1 = auth.generateToken('admin')
      await new Promise(r => setTimeout(r, 10))
      const token2 = auth.generateToken('admin')
      expect(token1).not.toBe(token2)
    })
  })

  describe('verifyToken', () => {
    it('returns true for valid token', () => {
      const token = auth.generateToken('admin')
      expect(auth.verifyToken(token)).toBe(true)
    })

    it('returns false for null/undefined token', () => {
      expect(auth.verifyToken(null)).toBe(false)
      expect(auth.verifyToken(undefined)).toBe(false)
      expect(auth.verifyToken('')).toBe(false)
    })

    it('returns false for tampered signature', () => {
      const token = auth.generateToken('admin')
      const [payload, signature] = token.split('.')
      // Use same length but different content
      const fakeSignature = signature.split('').reverse().join('')
      const fakeToken = `${payload}.${fakeSignature}`
      expect(auth.verifyToken(fakeToken)).toBe(false)
    })

    it('returns false for tampered payload', () => {
      const token = auth.generateToken('admin')
      const [, signature] = token.split('.')
      const fakePayload = Buffer.from('hacker:999999999999').toString('base64')
      expect(auth.verifyToken(`${fakePayload}.${signature}`)).toBe(false)
    })

    it('returns false for token without dot separator', () => {
      expect(auth.verifyToken('invalidtoken')).toBe(false)
    })

    it('returns false for expired token (>8 hours)', async () => {
      // Mock Date.now to be in the past
      const realNow = Date.now
      const eightHoursAgo = realNow() - 8 * 60 * 60 * 1000 - 1000
      vi.spyOn(Date, 'now').mockReturnValueOnce(eightHoursAgo)
      const token = auth.generateToken('admin')
      vi.spyOn(Date, 'now').mockRestore()
      // Now verify with real time - should be expired
      expect(auth.verifyToken(token)).toBe(false)
    })
  })

  describe('isValidGoals', () => {
    it('returns true for valid integers 0-99', () => {
      expect(auth.isValidGoals(0)).toBe(true)
      expect(auth.isValidGoals(1)).toBe(true)
      expect(auth.isValidGoals(50)).toBe(true)
      expect(auth.isValidGoals(99)).toBe(true)
    })

    it('returns true for numeric strings', () => {
      expect(auth.isValidGoals('0')).toBe(true)
      expect(auth.isValidGoals('5')).toBe(true)
      expect(auth.isValidGoals('99')).toBe(true)
    })

    it('returns false for null/undefined', () => {
      expect(auth.isValidGoals(null)).toBe(false)
      expect(auth.isValidGoals(undefined)).toBe(false)
    })

    it('returns false for negative numbers', () => {
      expect(auth.isValidGoals(-1)).toBe(false)
      expect(auth.isValidGoals(-100)).toBe(false)
    })

    it('returns false for numbers > 99', () => {
      expect(auth.isValidGoals(100)).toBe(false)
      expect(auth.isValidGoals(1000)).toBe(false)
    })

    it('returns false for non-integer values', () => {
      expect(auth.isValidGoals(1.5)).toBe(false)
      expect(auth.isValidGoals(0.1)).toBe(false)
    })

    it('returns false for non-numeric strings', () => {
      expect(auth.isValidGoals('abc')).toBe(false)
      // Note: '' converts to 0 via Number(''), which is valid
    })
  })

  describe('isRateLimited / recordFailedAttempt / clearAttempts', () => {
    it('is not rate limited with no attempts', () => {
      expect(auth.isRateLimited('1.2.3.4')).toBe(false)
    })

    it('is not rate limited with less than 5 attempts', () => {
      for (let i = 0; i < 4; i++) {
        auth.recordFailedAttempt('5.5.5.5')
      }
      expect(auth.isRateLimited('5.5.5.5')).toBe(false)
    })

    it('is rate limited after 5 failed attempts', () => {
      const ip = '10.0.0.1'
      for (let i = 0; i < 5; i++) {
        auth.recordFailedAttempt(ip)
      }
      expect(auth.isRateLimited(ip)).toBe(true)
    })

    it('clears attempts for an IP', () => {
      const ip = '10.0.0.2'
      for (let i = 0; i < 5; i++) {
        auth.recordFailedAttempt(ip)
      }
      expect(auth.isRateLimited(ip)).toBe(true)
      auth.clearAttempts(ip)
      expect(auth.isRateLimited(ip)).toBe(false)
    })

    it('different IPs are tracked independently', () => {
      for (let i = 0; i < 5; i++) {
        auth.recordFailedAttempt('ip-a')
      }
      expect(auth.isRateLimited('ip-a')).toBe(true)
      expect(auth.isRateLimited('ip-b')).toBe(false)
    })
  })
})
