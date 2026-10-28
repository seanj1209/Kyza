export type FoldLineOrientation = "vertical" | "horizontal"

export interface FoldLineSpec {
  id: string
  orientation: FoldLineOrientation
  offset: number
}

export interface FoldLineSegment {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max))
}

export function buildFoldLines(
  foldLines: FoldLineSpec[],
  liveOriginX: number,
  cutterOriginX: number,
  cutterOriginY: number,
  cutterWidth: number,
  cutterHeight: number,
  minX: number,
  maxX: number
): FoldLineSegment[] {
  return foldLines.map(line => {
    if (line.orientation === "vertical") {
      const desiredX = liveOriginX + line.offset
      const x = clamp(desiredX, minX, maxX)
      return {
        id: line.id,
        x1: x,
        y1: cutterOriginY,
        x2: x,
        y2: cutterOriginY + cutterHeight
      }
    }

    const y = cutterOriginY + cutterHeight / 2
    return {
      id: line.id,
      x1: cutterOriginX,
      y1: y,
      x2: cutterOriginX + cutterWidth,
      y2: y
    }
  })
}
