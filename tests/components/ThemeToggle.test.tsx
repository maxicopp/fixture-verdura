import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ThemeToggle from '../../app/components/ThemeToggle'

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    // Reset DOM
    document.documentElement.setAttribute('data-theme', 'light')
    localStorage.clear()
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('renders toggle button', async () => {
    await act(async () => {
      render(<ThemeToggle />)
    })
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('toggles theme on click', async () => {
    await act(async () => {
      render(<ThemeToggle />)
    })
    const button = screen.getByRole('button')
    await act(async () => {
      fireEvent.click(button)
    })
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    await act(async () => {
      fireEvent.click(button)
    })
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('persists theme in localStorage', async () => {
    await act(async () => {
      render(<ThemeToggle />)
    })
    const button = screen.getByRole('button')
    await act(async () => {
      fireEvent.click(button)
    })
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})
