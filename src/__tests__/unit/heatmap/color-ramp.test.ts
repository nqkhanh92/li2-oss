import { describe, it, expect } from 'vitest'
import { intensityToColor } from '@/ee/features/heatmap/lib/color-ramp'

describe('intensityToColor', () => {
  it('returns transparent for intensity 0', () => {
    const [r, g, b, a] = intensityToColor(0)
    expect(a).toBe(0)
  })

  it('returns transparent for negative intensity', () => {
    const [, , , a] = intensityToColor(-0.5)
    expect(a).toBe(0)
  })

  it('returns red at intensity 1.0', () => {
    // Stop: #dc2626 → [220, 38, 38, 255]
    const [r, g, b, a] = intensityToColor(1.0)
    expect(r).toBe(220)
    expect(g).toBe(38)
    expect(b).toBe(38)
    expect(a).toBe(255)
  })

  it('returns blue/indigo at low intensity (0.0+)', () => {
    // Near stop 0.0: indigo [79, 70, 229] — blue channel dominates
    const [r, g, b] = intensityToColor(0.01)
    expect(b).toBeGreaterThan(r)
    expect(b).toBeGreaterThan(g)
  })

  it('returns green-ish at mid intensity (0.5)', () => {
    // Stop: #16a34a → [22, 163, 74] — green channel dominates
    const [r, g, b] = intensityToColor(0.5)
    expect(g).toBeGreaterThan(r)
    expect(g).toBeGreaterThan(b)
  })

  it('returns yellow-ish at intensity 0.75', () => {
    // Stop: #f7b713 → [247, 183, 19] — red and green dominate over blue
    const [r, g, b] = intensityToColor(0.75)
    expect(r).toBeGreaterThan(b)
    expect(g).toBeGreaterThan(b)
  })

  it('clamps intensity above 1 to red', () => {
    // Same as 1.0 stop: #dc2626 → [220, 38, 38, 255]
    const [r, g, b, a] = intensityToColor(1.5)
    expect(r).toBe(220)
    expect(g).toBe(38)
    expect(b).toBe(38)
    expect(a).toBe(255)
  })

  it('alpha increases monotonically with intensity', () => {
    const steps = [0.05, 0.1, 0.25, 0.5, 0.75, 1.0]
    let prevAlpha = 0
    for (const t of steps) {
      const [, , , a] = intensityToColor(t)
      expect(a).toBeGreaterThanOrEqual(prevAlpha)
      prevAlpha = a
    }
  })

  it('returns valid RGBA values (0-255 range)', () => {
    const steps = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
    for (const t of steps) {
      const [r, g, b, a] = intensityToColor(t)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThanOrEqual(255)
      expect(g).toBeGreaterThanOrEqual(0)
      expect(g).toBeLessThanOrEqual(255)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(255)
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThanOrEqual(255)
    }
  })
})
