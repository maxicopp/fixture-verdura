'use client'

import { useEffect, useRef } from 'react'

const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#fbbf24',
  '#a3e635', '#fb923c',
]

interface Particle {
  x: number
  y: number
  w: number
  h: number
  color: string
  speedX: number
  speedY: number
  rotation: number
  rotationSpeed: number
  opacity: number
  shape: 'rect' | 'circle'
  wave: number
  waveSpeed: number
  waveAmp: number
}

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a)
}

function createParticle(canvasWidth: number): Particle {
  return {
    x: randomBetween(0, canvasWidth),
    y: randomBetween(-200, -10),
    w: randomBetween(7, 14),
    h: randomBetween(4, 9),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    speedX: randomBetween(-2.5, 2.5),
    speedY: randomBetween(2.5, 5.5),
    rotation: randomBetween(0, Math.PI * 2),
    rotationSpeed: randomBetween(-0.06, 0.06),
    opacity: 1,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
    wave: randomBetween(0, Math.PI * 2),
    waveSpeed: randomBetween(0.03, 0.07),
    waveAmp: randomBetween(0.5, 2),
  }
}

interface ConfettiProps {
  active?: boolean
  duration?: number
}

export default function Confetti({ active = true, duration = 6000 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<{ particles: Particle[]; animId: number | null; startTime: number | null; active: boolean }>({
    particles: [], animId: null, startTime: null, active: false,
  })

  useEffect(() => {
    if (!active) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const state = stateRef.current
    state.active = true
    state.startTime = performance.now()

    for (let i = 0; i < 180; i++) {
      state.particles.push(createParticle(canvas.width))
    }

    function draw(now: number) {
      const elapsed = now - state.startTime!
      const ratio = Math.max(0, 1 - elapsed / duration)

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      if (elapsed < duration * 0.5 && Math.random() < 0.35) {
        state.particles.push(createParticle(canvas!.width))
      }

      state.particles = state.particles.filter(p => {
        p.y += p.speedY
        p.x += p.speedX + Math.sin(p.wave) * p.waveAmp
        p.wave += p.waveSpeed
        p.rotation += p.rotationSpeed
        p.opacity = Math.min(p.opacity, ratio > 0 ? 1 : Math.max(0, p.opacity - 0.012))

        if (p.y > canvas!.height + 20 || p.opacity <= 0) return false

        ctx!.save()
        ctx!.globalAlpha = p.opacity
        ctx!.translate(p.x, p.y)
        ctx!.rotate(p.rotation)
        ctx!.fillStyle = p.color

        if (p.shape === 'circle') {
          ctx!.beginPath()
          ctx!.arc(0, 0, p.w / 2, 0, Math.PI * 2)
          ctx!.fill()
        } else {
          ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        }
        ctx!.restore()
        return true
      })

      if (state.particles.length > 0 || elapsed < duration) {
        state.animId = requestAnimationFrame(draw)
      } else {
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      }
    }

    state.animId = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      if (state.animId) cancelAnimationFrame(state.animId)
      state.particles = []
      state.active = false
    }
  }, [active, duration])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  )
}
