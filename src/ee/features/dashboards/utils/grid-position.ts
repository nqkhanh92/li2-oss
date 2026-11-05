import { WIDGET_SIZE_MAP } from '../types'
import type { WidgetSize, GridPosition } from '../types'

/**
 * Compute a grid position for a new widget at the bottom of the grid.
 * Pass the current widget list (from query cache or props) as `widgets`.
 */
export function computePosition(
  size: WidgetSize,
  widgets: { position: { y: number; h: number } }[],
): GridPosition {
  const dims = WIDGET_SIZE_MAP[size]
  const nextY = widgets.length === 0
    ? 0
    : Math.max(...widgets.map((w) => w.position.y + w.position.h))
  return { x: 0, y: nextY, w: dims.w, h: dims.h }
}
