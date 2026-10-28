import type { PerfSpec } from "../types/perfs"

export interface PerfPoint {
  x: number
  y: number
  laneIndex?: number
  radius?: number
}

export function buildPerfCenters(
  spec: PerfSpec,
  liveOriginX: number,
  liveOriginY: number,
  _liveWidth: number,
  _liveHeight: number,
  cutterOriginX: number,
  cutterOriginY: number,
  cutterWidth: number,
  cutterHeight: number
): PerfPoint[] {
  const centers: PerfPoint[] = []
  const lanes = spec.lanes?.length
    ? spec.lanes
    : [{ originX: spec.originX, originY: spec.originY }]

  for (let laneIndex = 0; laneIndex < lanes.length; laneIndex += 1) {
    const lane = lanes[laneIndex]
    const laneDiameter = Math.max(0.1, lane.diameter ?? spec.diameter)
    const radius = laneDiameter / 2
    const x = liveOriginX + lane.originX
    if (spec.mode === "continuous") {
      if (spec.separation <= 0) {
        continue
      }
      const startY =
        spec.sealEdge === "bottom"
          ? cutterOriginY + cutterHeight - radius
          : cutterOriginY + radius
      const endY =
        spec.sealEdge === "bottom"
          ? cutterOriginY + radius
          : cutterOriginY + cutterHeight - radius
      const step = spec.sealEdge === "bottom" ? -spec.separation : spec.separation
      for (let y = startY; step > 0 ? y <= endY : y >= endY; y += step) {
        if (
          x - radius < cutterOriginX ||
          x + radius > cutterOriginX + cutterWidth ||
          y - radius < cutterOriginY ||
          y + radius > cutterOriginY + cutterHeight
        ) {
          continue
        }
        centers.push({ x, y, laneIndex, radius })
      }
      continue
    }

    const count = spec.count ?? 0
    const originY = liveOriginY + (lane.originY ?? 0)
    for (let i = 0; i < count; i += 1) {
      centers.push({
        x,
        y: originY + i * spec.separation,
        laneIndex,
        radius
      })
    }
  }
  return centers
}
