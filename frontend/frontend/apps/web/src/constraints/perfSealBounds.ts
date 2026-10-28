import type { PerfPoint } from "../geometry/perfs"

export function perfPatternExceedsSeal(
  centers: PerfPoint[],
  radius: number,
  liveOriginX: number,
  liveOriginY: number,
  liveWidth: number,
  liveHeight: number
) {
  const minX = liveOriginX
  const minY = liveOriginY
  const maxX = liveOriginX + liveWidth
  const maxY = liveOriginY + liveHeight

  for (const center of centers) {
    const pointRadius = center.radius ?? radius
    if (
      center.x - pointRadius < minX ||
      center.x + pointRadius > maxX ||
      center.y - pointRadius < minY ||
      center.y + pointRadius > maxY
    ) {
      return true
    }
  }

  return false
}
