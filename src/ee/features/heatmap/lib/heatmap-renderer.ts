import { intensityToColor } from './color-ramp'
import type { HeatmapGridPoint } from '../types'

const DEFAULT_RADIUS = 30

/**
 * Two-pass heatmap rendering:
 * 1. Intensity pass — draw white radial gradients on black canvas with additive blending
 * 2. Colorize pass — map pixel brightness to color ramp
 */
export function renderHeatmap(
  canvas: HTMLCanvasElement,
  grid: HeatmapGridPoint[],
  width: number,
  height: number,
  radius: number = DEFAULT_RADIUS
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx || grid.length === 0 || width === 0 || height === 0) return

  canvas.width = width
  canvas.height = height

  const maxCount = Math.max(...grid.map((p) => p.count))
  if (maxCount === 0) return

  // Pass 1: Intensity on off-screen canvas
  const offscreen = document.createElement('canvas')
  offscreen.width = width
  offscreen.height = height
  const offCtx = offscreen.getContext('2d')
  if (!offCtx) return

  offCtx.fillStyle = 'black'
  offCtx.fillRect(0, 0, width, height)
  offCtx.globalCompositeOperation = 'lighter'

  for (const point of grid) {
    // Skip points outside canvas bounds (with radius padding)
    if (
      point.x < -radius ||
      point.x > width + radius ||
      point.y < -radius ||
      point.y > height + radius
    ) {
      continue
    }

    const alpha = point.count / maxCount
    const gradient = offCtx.createRadialGradient(
      point.x,
      point.y,
      0,
      point.x,
      point.y,
      radius
    )
    // Approximate Gaussian falloff: peak → 1σ → 2σ → 3σ (edge)
    gradient.addColorStop(0, `rgba(255,255,255,${alpha})`)
    gradient.addColorStop(0.33, `rgba(255,255,255,${alpha * 0.607})`)
    gradient.addColorStop(0.67, `rgba(255,255,255,${alpha * 0.135})`)
    gradient.addColorStop(1, 'rgba(255,255,255,0)')

    offCtx.fillStyle = gradient
    offCtx.beginPath()
    offCtx.arc(point.x, point.y, radius, 0, Math.PI * 2)
    offCtx.fill()
  }

  // Pass 2: Read intensity → colorize
  const imageData = offCtx.getImageData(0, 0, width, height)
  const pixels = imageData.data
  const outputData = ctx.createImageData(width, height)
  const out = outputData.data

  for (let i = 0; i < pixels.length; i += 4) {
    const intensity = pixels[i] / 255 // Red channel = brightness
    if (intensity > 0.01) {
      const [r, g, b, a] = intensityToColor(intensity)
      out[i] = r
      out[i + 1] = g
      out[i + 2] = b
      out[i + 3] = a
    }
    // else: leave transparent (0,0,0,0)
  }

  ctx.putImageData(outputData, 0, 0)
}
