import { describe, it, expect } from 'vitest'
import { DISABLED_PLAYERS } from '../../app/lib/disabled-players'

describe('DISABLED_PLAYERS', () => {
  it('exports an array', () => {
    expect(Array.isArray(DISABLED_PLAYERS)).toBe(true)
  })

  it('contains only strings if not empty', () => {
    DISABLED_PLAYERS.forEach(player => {
      expect(typeof player).toBe('string')
    })
  })

  it('has no duplicate entries', () => {
    const unique = new Set(DISABLED_PLAYERS)
    expect(unique.size).toBe(DISABLED_PLAYERS.length)
  })
})
