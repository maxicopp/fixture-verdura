import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockExecute = vi.fn().mockResolvedValue({ rows: [] })
const mockExecuteMultiple = vi.fn().mockResolvedValue(undefined)

vi.mock('@libsql/client', () => ({
  createClient: vi.fn(() => ({
    execute: mockExecute,
    executeMultiple: mockExecuteMultiple,
  })),
}))

describe('db', () => {
  let db: typeof import('../../app/lib/db')

  beforeEach(async () => {
    vi.resetModules()
    mockExecute.mockReset().mockResolvedValue({ rows: [] })
    mockExecuteMultiple.mockReset().mockResolvedValue(undefined)
    db = await import('../../app/lib/db')
  })

  describe('getDb', () => {
    it('creates a client and returns it', () => {
      const client = db.getDb()
      expect(client).toBeDefined()
      expect(client.execute).toBeDefined()
    })

    it('returns the same client on subsequent calls (singleton)', () => {
      const client1 = db.getDb()
      const client2 = db.getDb()
      expect(client1).toBe(client2)
    })
  })

  describe('dbAll', () => {
    it('executes a query and returns all rows', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] })
      const rows = await db.dbAll('SELECT * FROM test')
      expect(rows).toEqual([{ id: 1 }, { id: 2 }])
      expect(mockExecute).toHaveBeenCalledWith({ sql: 'SELECT * FROM test', args: [] })
    })

    it('passes args to the query', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] })
      await db.dbAll('SELECT * FROM test WHERE id = ?', [1])
      expect(mockExecute).toHaveBeenCalledWith({ sql: 'SELECT * FROM test WHERE id = ?', args: [1] })
    })
  })

  describe('dbGet', () => {
    it('returns the first row', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ id: 1, name: 'test' }] })
      const row = await db.dbGet('SELECT * FROM test LIMIT 1')
      expect(row).toEqual({ id: 1, name: 'test' })
    })

    it('returns null when no rows', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] })
      const row = await db.dbGet('SELECT * FROM test WHERE id = ?', [999])
      expect(row).toBeNull()
    })
  })

  describe('dbRun', () => {
    it('executes an INSERT/UPDATE/DELETE and returns result', async () => {
      const mockResult = { rows: [], rowsAffected: 1, lastInsertRowid: BigInt(5) }
      mockExecute.mockResolvedValueOnce(mockResult)
      const result = await db.dbRun('INSERT INTO test (name) VALUES (?)', ['hello'])
      expect(result).toEqual(mockResult)
      expect(mockExecute).toHaveBeenCalledWith({ sql: 'INSERT INTO test (name) VALUES (?)', args: ['hello'] })
    })
  })

  describe('initSchema', () => {
    it('calls executeMultiple for schema creation', async () => {
      await db.initSchema()
      expect(mockExecuteMultiple).toHaveBeenCalled()
      const sqlArg = mockExecuteMultiple.mock.calls[0][0]
      expect(sqlArg).toContain('CREATE TABLE IF NOT EXISTS tournaments')
      expect(sqlArg).toContain('CREATE TABLE IF NOT EXISTS tournament_players')
      expect(sqlArg).toContain('CREATE TABLE IF NOT EXISTS matches')
    })

    it('runs ALTER TABLE migrations without failing', async () => {
      mockExecute.mockRejectedValue(new Error('column already exists'))
      // initSchema should not throw even if ALTER TABLE fails
      await expect(db.initSchema()).resolves.not.toThrow()
    })
  })
})
