import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Standings from '../../app/components/Standings'
import type { Standing } from '../../app/types'

// Mock fetch for quote
beforeEach(() => {
  vi.mocked(global.fetch).mockResolvedValue({
    ok: true,
    json: async () => ({ text: 'Quote test', author: 'Test Author' }),
  } as any)
})

const mockStandings: Standing[] = [
  { name: 'Max', pj: 5, pg: 4, pe: 1, pp: 0, gf: 12, gc: 3, pts: 13 },
  { name: 'Gayco', pj: 5, pg: 3, pe: 1, pp: 1, gf: 9, gc: 5, pts: 10 },
  { name: 'Vulvega', pj: 5, pg: 2, pe: 1, pp: 2, gf: 7, gc: 7, pts: 7 },
  { name: 'Nacho', pj: 5, pg: 1, pe: 2, pp: 2, gf: 5, gc: 8, pts: 5 },
  { name: 'Kevin', pj: 5, pg: 1, pe: 1, pp: 3, gf: 4, gc: 9, pts: 4 },
  { name: 'Negro', pj: 5, pg: 0, pe: 2, pp: 3, gf: 3, gc: 10, pts: 2 },
]

describe('Standings Component', () => {
  it('renders table header with correct columns', () => {
    render(<Standings standings={mockStandings} />)
    expect(screen.getByText('#')).toBeInTheDocument()
    expect(screen.getByText('Jugador')).toBeInTheDocument()
    expect(screen.getByText('PJ')).toBeInTheDocument()
    expect(screen.getByText('PG')).toBeInTheDocument()
    expect(screen.getByText('PE')).toBeInTheDocument()
    expect(screen.getByText('PP')).toBeInTheDocument()
    expect(screen.getByText('GF')).toBeInTheDocument()
    expect(screen.getByText('GC')).toBeInTheDocument()
    expect(screen.getByText('DG')).toBeInTheDocument()
    expect(screen.getByText('PTS')).toBeInTheDocument()
  })

  it('renders all player names', () => {
    render(<Standings standings={mockStandings} />)
    mockStandings.forEach(s => {
      expect(screen.getByText(s.name)).toBeInTheDocument()
    })
  })

  it('shows medal for leader', () => {
    render(<Standings standings={mockStandings} />)
    expect(screen.getByText('🥇')).toBeInTheDocument()
    expect(screen.getByText('🥈')).toBeInTheDocument()
    expect(screen.getByText('🥉')).toBeInTheDocument()
  })

  it('marks disabled players', () => {
    render(<Standings standings={mockStandings} disabledPlayers={['Negro']} />)
    expect(screen.getByText('inactivo')).toBeInTheDocument()
    expect(screen.getByText('⏸')).toBeInTheDocument()
  })

  it('shows pause icon for disabled player position', () => {
    render(<Standings standings={mockStandings} disabledPlayers={['Max']} />)
    expect(screen.getByText('⏸')).toBeInTheDocument()
  })

  it('renders title', () => {
    render(<Standings standings={mockStandings} />)
    expect(screen.getByText('🏆 Tabla de Posiciones')).toBeInTheDocument()
  })

  it('renders with empty standings', () => {
    render(<Standings standings={[]} />)
    expect(screen.getByText('🏆 Tabla de Posiciones')).toBeInTheDocument()
  })
})
