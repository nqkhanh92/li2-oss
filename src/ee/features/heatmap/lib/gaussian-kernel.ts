/**
 * 2D Gaussian kernel — returns intensity (0-1) based on distance from center.
 * sigma = radius / 3 so that 99.7% of the distribution falls within the radius.
 */
export function gaussianKernel(
  dx: number,
  dy: number,
  radius: number = 30
): number {
  const distSq = dx * dx + dy * dy
  if (distSq > radius * radius) return 0
  const sigma = radius / 3
  return Math.exp(-distSq / (2 * sigma * sigma))
}
