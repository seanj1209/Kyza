import type { EyeMarkSpec } from "../types/eyeMarks"
import {
  DEFAULT_EYEMARK_EDGE_CLEARANCE_MM,
  placeEyemarkWithEdgeClearance
} from "./eyemarkPlacement"
import {
  getEyeMarkOffsetsForIndex,
  getEyeMarkSizeForIndex
} from "./eyeMarkState"
import type { SealSizes } from "./flowwrapGeometry"
import type { Rect } from "./rect"

export interface EyeMarkRect {
  x: number
  y: number
  width: number
  height: number
}

export type EyeMarkPlacementOptions = {
  edgeClearanceMm?: number
  seals?: SealSizes
}

export function buildEyeMarkRects(
  spec: EyeMarkSpec,
  cutterOriginX: number,
  cutterOriginY: number,
  cutterWidth: number,
  cutterHeight: number,
  placement: EyeMarkPlacementOptions = {}
): EyeMarkRect[] {
  if (spec.count === 0 || spec.count > 2) {
    return []
  }

  const edgeClearanceMm =
    placement.edgeClearanceMm ?? DEFAULT_EYEMARK_EDGE_CLEARANCE_MM
  const cutter: Rect = {
    x: cutterOriginX,
    y: cutterOriginY,
    width: cutterWidth,
    height: cutterHeight
  }

  if (spec.count === 1) {
    const offsets = getEyeMarkOffsetsForIndex(spec, 0)
    return [
      placeEyemarkWithEdgeClearance(
        spec.position,
        0,
        1,
        cutter,
        getEyeMarkSizeForIndex(spec, 0),
        edgeClearanceMm,
        offsets.offsetX,
        offsets.offsetY
      )
    ]
  }

  return [0, 1].map(index => {
    const size = getEyeMarkSizeForIndex(spec, index)
    const offsets = getEyeMarkOffsetsForIndex(spec, index)
    return placeEyemarkWithEdgeClearance(
      spec.position,
      index,
      2,
      cutter,
      size,
      edgeClearanceMm,
      offsets.offsetX,
      offsets.offsetY
    )
  })
}
