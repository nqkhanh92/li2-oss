/**
 * Maps a normalized intensity value (0-1) to an RGBA color tuple.
 * Color ramp: indigo → blue → green → yellow → red
 */

type RGBA = [number, number, number, number]

const COLOR_STOPS: [number, RGBA][] = [
  [0.0,  [79,  70,  229, 128]], // indigo  #4f46e5
  [0.25, [67,  126, 247, 180]], // blue    #437ef7
  [0.5,  [22,  163, 74,  210]], // green   #16a34a
  [0.75, [247, 183, 19,  235]], // yellow  #f7b713
  [1.0,  [220, 38,  38,  255]], // red     #dc2626
]

export function intensityToColor(intensity: number): RGBA {
  if (intensity <= 0) return [0, 0, 0, 0]

  const t = Math.min(1, Math.max(0, intensity))

  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const [t0, c0] = COLOR_STOPS[i]
    const [t1, c1] = COLOR_STOPS[i + 1]
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0)
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f),
        Math.round(c0[3] + (c1[3] - c0[3]) * f),
      ]
    }
  }

  return [255, 0, 0, 255]
}
