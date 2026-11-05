'use client'

import { useEffect, useRef } from 'react'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f97316']

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
  opacity: number
  shape: 'rect' | 'circle'
}

function createParticle(canvasWidth: number): Particle {
  return {
    x: Math.random() * canvasWidth,
    y: -10,
    vx: (Math.random() - 0.5) * 3,
    vy: Math.random() * 3 + 2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 8 + 4,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 6,
    opacity: 1,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  }
}

interface Props {
  /** Number of burst waves (default 8) */
  bursts?: number
  /** Particles per burst (default 12) */
  perBurst?: number
  /** Ms between bursts (default 180) */
  interval?: number
  className?: string
}

export const ConfettiCanvas = ({ bursts = 8, perBurst = 12, interval = 180, className }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: Particle[] = []
    let burstCount = 0
    let rafId: number
    let timeoutId: ReturnType<typeof setTimeout>

    const burst = () => {
      for (let i = 0; i < perBurst; i++) particles.push(createParticle(canvas.width))
      burstCount++
      if (burstCount < bursts) timeoutId = setTimeout(burst, interval)
    }
    burst()

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        if (p.opacity <= 0.05) { particles.splice(i, 1); continue }
        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.08
        p.rotation += p.rotationSpeed
        if (p.y > canvas.height * 0.6) p.opacity -= 0.025
      }
      rafId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timeoutId)
      window.removeEventListener('resize', resize)
    }
  }, [bursts, perBurst, interval])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  )
}
