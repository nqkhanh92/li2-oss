import { describe, it, expect } from 'vitest'
import { gaussianKernel } from '@/ee/features/heatmap/lib/gaussian-kernel'

describe('gaussianKernel', () => {
  const radius = 30

  it('returns 1.0 at the center (0, 0)', () => {
    expect(gaussianKernel(0, 0, radius)).toBe(1.0)
  })

  it('returns ~0 at the edge (radius distance)', () => {
    expect(gaussianKernel(radius, 0, radius)).toBeLessThan(0.02)
    expect(gaussianKernel(0, radius, radius)).toBeLessThan(0.02)
  })

  it('returns 0 beyond the radius', () => {
    expect(gaussianKernel(radius + 1, 0, radius)).toBe(0)
    expect(gaussianKernel(0, radius + 1, radius)).toBe(0)
    expect(gaussianKernel(50, 50, radius)).toBe(0)
  })

  it('returns value between 0 and 1 at half radius', () => {
    const val = gaussianKernel(radius / 2, 0, radius)
    expect(val).toBeGreaterThan(0)
    expect(val).toBeLessThan(1)
  })

  it('is symmetric: kernel(dx, dy) === kernel(-dx, -dy)', () => {
    expect(gaussianKernel(10, 5, radius)).toBe(gaussianKernel(-10, -5, radius))
    expect(gaussianKernel(15, -8, radius)).toBe(gaussianKernel(-15, 8, radius))
  })

  it('is symmetric: kernel(dx, dy) === kernel(dy, dx)', () => {
    expect(gaussianKernel(10, 5, radius)).toBe(gaussianKernel(5, 10, radius))
  })

  it('intensity decreases monotonically with distance', () => {
    const distances = [0, 5, 10, 15, 20, 25, 29]
    let prev = Infinity
    for (const d of distances) {
      const val = gaussianKernel(d, 0, radius)
      expect(val).toBeLessThanOrEqual(prev)
      prev = val
    }
  })

  it('works with different radius values', () => {
    expect(gaussianKernel(0, 0, 10)).toBe(1.0)
    expect(gaussianKernel(0, 0, 50)).toBe(1.0)
    expect(gaussianKernel(11, 0, 10)).toBe(0)
    expect(gaussianKernel(51, 0, 50)).toBe(0)
  })

  it('uses default radius of 30 when not specified', () => {
    expect(gaussianKernel(0, 0)).toBe(1.0)
    expect(gaussianKernel(31, 0)).toBe(0)
  })
})
