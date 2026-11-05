import { intensityToColor } from './color-ramp'
import type { ScrollDepthMilestone } from '../types'

const MILESTONE_ZONES = [0, 25, 50, 75, 90, 100]

/**
 * Renders horizontal gradient bands on a canvas representing scroll depth reach.
 * Top = red (high reach), bottom = blue/transparent (low reach).
 */
export function renderScrollHeatmap(
  canvas: HTMLCanvasElement,
  milestones: ScrollDepthMilestone[],
  totalSessions: number,
  canvasHeight: number
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx || canvasHeight === 0) return

  canvas.height = canvasHeight
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (totalSessions === 0 || milestones.length === 0) return

  // Build a map of depth% → sessions_reached
  const milestoneMap = new Map<number, number>()
  for (const m of milestones) {
    milestoneMap.set(m.scroll_depth_percent, m.sessions_reached)
  }

  // Draw colored bands only
  for (let i = 0; i < MILESTONE_ZONES.length - 1; i++) {
    const prevDepth = MILESTONE_ZONES[i]
    const depth = MILESTONE_ZONES[i + 1]

    const yStart = (prevDepth / 100) * canvasHeight
    const yEnd = (depth / 100) * canvasHeight

    // sessions_reached for this zone = sessions that entered it (reached the start of this zone)
    const sessionsReached = i === 0 ? totalSessions : (milestoneMap.get(prevDepth) ?? 0)
    const intensity = sessionsReached / totalSessions

    const [r, g, b, a] = intensityToColor(intensity)
    ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`
    ctx.fillRect(0, yStart, canvas.width, yEnd - yStart)
  }
}
