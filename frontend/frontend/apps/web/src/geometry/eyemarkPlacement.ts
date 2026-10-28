import type {
  EyeMarkPositionOne,
  EyeMarkPositionTwo,
  EyeMarkSpec
} from "../types/eyeMarks"
import type { SealSizes } from "./flowwrapGeometry"
import type { Rect } from "./rect"

export const DEFAULT_EYEMARK_EDGE_CLEARANCE_MM = 1.5
export const DEFAULT_EYEMARK_WIDTH_MM = 10
export const DEFAULT_EYEMARK_HEIGHT_MM = 5
export const DEFAULT_PILLOW_PACK_SEAL_MM = 15

type EyeMarkPlacementPosition = EyeMarkPositionOne | EyeMarkPositionTwo

function getEyeMarkSize(spec: EyeMarkSpec, index: number) {
  if (index === 1) {
    return {
      width: spec.width2 ?? spec.width,
      height: spec.height2 ?? spec.height
    }
  }
  return {
    width: spec.width,
    height: spec.height
  }
}

function buildSealRects(cutter: Rect, seals: SealSizes) {
  return {
    top: {
      x: cutter.x,
      y: cutter.y,
      width: cutter.width,
      height: seals.top
    },
    bottom: {
      x: cutter.x,
      y: cutter.y + cutter.height - seals.bottom,
      width: cutter.width,
      height: seals.bottom
    },
    left: {
      x: cutter.x,
      y: cutter.y,
      width: seals.left,
      height: cutter.height
    },
    right: {
      x: cutter.x + cutter.width - seals.right,
      y: cutter.y,
      width: seals.right,
      height: cutter.height
    },
    topLeft: {
      x: cutter.x,
      y: cutter.y,
      width: seals.left,
      height: seals.top
    },
    topRight: {
      x: cutter.x + cutter.width - seals.right,
      y: cutter.y,
      width: seals.right,
      height: seals.top
    },
    bottomLeft: {
      x: cutter.x,
      y: cutter.y + cutter.height - seals.bottom,
      width: seals.left,
      height: seals.bottom
    },
    bottomRight: {
      x: cutter.x + cutter.width - seals.right,
      y: cutter.y + cutter.height - seals.bottom,
      width: seals.right,
      height: seals.bottom
    }
  }
}

export function getEyemarkPlacementArea(
  position: EyeMarkPlacementPosition,
  index: number,
  count: number,
  cutter: Rect,
  seals: SealSizes
): Rect {
  const sealRects = buildSealRects(cutter, seals)
  if (count === 1) {
    switch (position) {
      case "top-left":
        return sealRects.topLeft
      case "top-right":
        return sealRects.topRight
      case "bottom-left":
        return sealRects.bottomLeft
      case "bottom-right":
        return sealRects.bottomRight
      case "centre-left":
        return sealRects.left
      case "centre-right":
        return sealRects.right
      case "centre":
        return sealRects.top
    }
  }

  if (count === 2) {
    switch (position) {
      case "top":
        return index === 0 ? sealRects.topLeft : sealRects.topRight
      case "bottom":
        return index === 0 ? sealRects.bottomLeft : sealRects.bottomRight
      case "centre":
        return index === 0 ? sealRects.left : sealRects.right
    }
  }

  return sealRects.top
}

export function canEyemarkFitInSealArea(
  rect: Rect,
  placementArea: Rect
): boolean {
  const epsilon = 0.0001
  return (
    rect.x >= placementArea.x - epsilon &&
    rect.y >= placementArea.y - epsilon &&
    rect.x + rect.width <= placementArea.x + placementArea.width + epsilon &&
    rect.y + rect.height <= placementArea.y + placementArea.height + epsilon
  )
}

export function placeEyemarkWithEdgeClearance(
  position: EyeMarkPlacementPosition,
  index: number,
  count: number,
  cutter: Rect,
  size: { width: number; height: number },
  edgeClearanceMm = DEFAULT_EYEMARK_EDGE_CLEARANCE_MM,
  offsetX = 0,
  offsetY = 0
): Rect {
  const width = size.width
  const height = size.height
  const rightX = cutter.x + cutter.width - width - edgeClearanceMm
  const bottomY = cutter.y + cutter.height - height - edgeClearanceMm
  const centreCutterY = cutter.y + (cutter.height - height) / 2
  const centreCutterX = cutter.x + (cutter.width - width) / 2

  if (count === 1) {
    switch (position) {
      case "top-left":
        return {
          x: cutter.x + edgeClearanceMm + offsetX,
          y: cutter.y + edgeClearanceMm + offsetY,
          width,
          height
        }
      case "top-right":
        return {
          x: rightX + offsetX,
          y: cutter.y + edgeClearanceMm + offsetY,
          width,
          height
        }
      case "bottom-left":
        return {
          x: cutter.x + edgeClearanceMm + offsetX,
          y: bottomY + offsetY,
          width,
          height
        }
      case "bottom-right":
        return {
          x: rightX + offsetX,
          y: bottomY + offsetY,
          width,
          height
        }
      case "centre":
        return {
          x: centreCutterX + offsetX,
          y: centreCutterY + offsetY,
          width,
          height
        }
      case "centre-left":
        return {
          x: cutter.x + edgeClearanceMm + offsetX,
          y: centreCutterY + offsetY,
          width,
          height
        }
      case "centre-right":
        return {
          x: rightX + offsetX,
          y: centreCutterY + offsetY,
          width,
          height
        }
    }
  }

  if (count === 2) {
    switch (position) {
      case "top":
        return {
          x: index === 0 ? cutter.x + edgeClearanceMm + offsetX : rightX + offsetX,
          y: cutter.y + edgeClearanceMm + offsetY,
          width,
          height
        }
      case "bottom":
        return {
          x: index === 0 ? cutter.x + edgeClearanceMm + offsetX : rightX + offsetX,
          y: bottomY + offsetY,
          width,
          height
        }
      case "centre":
        return {
          x: index === 0 ? cutter.x + edgeClearanceMm + offsetX : rightX + offsetX,
          y: centreCutterY + offsetY,
          width,
          height
        }
    }
  }

  return {
    x: cutter.x + edgeClearanceMm + offsetX,
    y: cutter.y + edgeClearanceMm + offsetY,
    width,
    height
  }
}

export function getEyemarkSealFitWarning(
  spec: EyeMarkSpec | undefined,
  cutter: Rect,
  seals: SealSizes,
  edgeClearanceMm = DEFAULT_EYEMARK_EDGE_CLEARANCE_MM
): string | null {
  if (!spec || spec.count < 1 || spec.count > 2) {
    return null
  }

  const offsetX = spec.offsetX ?? 0
  const offsetY = spec.offsetY ?? 0
  const rects = Array.from({ length: spec.count }, (_, index) => {
    const size = getEyeMarkSize(spec, index)
    return placeEyemarkWithEdgeClearance(
      spec.position,
      index,
      spec.count,
      cutter,
      size,
      edgeClearanceMm,
      offsetX,
      offsetY
    )
  })

  const fitsAllRects = rects.every((rect, index) =>
    canEyemarkFitInSealArea(
      rect,
      getEyemarkPlacementArea(spec.position, index, spec.count, cutter, seals)
    )
  )

  return fitsAllRects
    ? null
    : "Eyemark may not fit cleanly inside the seal/track area with the current seal size."
}
