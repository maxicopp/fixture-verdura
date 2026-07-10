import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Fixture from '../../app/components/Fixture'
import type { Round } from '../../app/types'

const mockFixture: Round[] = [
  {
    round: 1,
    matches: [
      { id: '0-0', home: 'Max', away: 'Gayco', homeGoals: 2, awayGoals: 1, played: true },
      { id: '0-1', home: 'Vulvega', away: 'Nacho', homeGoals: null, awayGoals: null, played: false },
    ],
  },
  {
    round: 2,
    matches: [
      { id: '1-0', home: 'Kevin', away: 'Negro', homeGoals: null, awayGoals: null, played: false },
    ],
  },
]

describe('Fixture Component', () => {
  const mockOnResult = vi.fn()
  const mockOnReset = vi.fn()
  const mockOnResetAll = vi.fn()

  it('renders the fixture title', () => {
    render(<Fixture fixture={mockFixture} onResult={mockOnResult} onReset={mockOnReset} onResetAll={mockOnResetAll} />)
    expect(screen.getByText('Fixture completo')).toBeInTheDocument()
  })

  it('renders all rounds', () => {
    render(<Fixture fixture={mockFixture} onResult={mockOnResult} onReset={mockOnReset} onResetAll={mockOnResetAll} />)
    expect(screen.getByText('Fecha 1')).toBeInTheDocument()
    expect(screen.getByText('Fecha 2')).toBeInTheDocument()
  })

  it('shows progress badge for partially played round', () => {
    render(<Fixture fixture={mockFixture} onResult={mockOnResult} onReset={mockOnReset} onResetAll={mockOnResetAll} />)
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('0/1')).toBeInTheDocument()
  })

  it('expands first round by default', () => {
    render(<Fixture fixture={mockFixture} onResult={mockOnResult} onReset={mockOnReset} onResetAll={mockOnResetAll} />)
    // First round expanded - should show match content
    expect(screen.getByText('Max')).toBeInTheDocument()
  })

  it('toggles rounds on click', () => {
    render(<Fixture fixture={mockFixture} onResult={mockOnResult} onReset={mockOnReset} onResetAll={mockOnResetAll} />)
    // Click Fecha 2 to expand it
    fireEvent.click(screen.getByText('Fecha 2'))
    expect(screen.getAllByText('Kevin').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Negro').length).toBeGreaterThanOrEqual(1)
  })

  it('has reset all button', () => {
    render(<Fixture fixture={mockFixture} onResult={mockOnResult} onReset={mockOnReset} onResetAll={mockOnResetAll} />)
    const resetBtn = screen.getByText('🔄 Reiniciar todo')
    expect(resetBtn).toBeInTheDocument()
    fireEvent.click(resetBtn)
    expect(mockOnResetAll).toHaveBeenCalled()
  })

  it('renders empty fixture', () => {
    render(<Fixture fixture={[]} onResult={mockOnResult} onReset={mockOnReset} onResetAll={mockOnResetAll} />)
    expect(screen.getByText('Fixture completo')).toBeInTheDocument()
  })
})
