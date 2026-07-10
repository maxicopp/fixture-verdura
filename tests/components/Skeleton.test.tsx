import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Sk } from '../../app/components/Skeleton'

describe('Skeleton Components', () => {
  it('renders Sk with default class', () => {
    const { container } = render(<Sk />)
    expect(container.firstChild).toHaveClass('sk')
  })

  it('renders Sk with circle class', () => {
    const { container } = render(<Sk circle />)
    expect(container.firstChild).toHaveClass('sk-circle')
  })

  it('renders Sk with rounded class', () => {
    const { container } = render(<Sk rounded />)
    expect(container.firstChild).toHaveClass('sk-rounded')
  })

  it('applies custom style', () => {
    const { container } = render(<Sk style={{ width: 100, height: 20 }} />)
    const el = container.firstChild as HTMLElement
    expect(el.style.width).toBe('100px')
    expect(el.style.height).toBe('20px')
  })

  it('applies custom className', () => {
    const { container } = render(<Sk className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has aria-hidden attribute', () => {
    const { container } = render(<Sk />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })
})
