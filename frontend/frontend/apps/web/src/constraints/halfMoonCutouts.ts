import { resolveFlowwrapGeometry } from "../geometry/flowwrapGeometry"
import { resolveDoyBounds } from "../core/geometry/resolvers/doyBounds"
import { DEFAULT_SEAL_CLEARANCE_MM } from "./flowwrap"
import type { FlowwrapSpec, HalfMoonCutoutSpec } from "../types/flowwrap"

export const DEFAULT_HALF_MOON_RADIUS = 6
export const HALF_MOON_GUSSET_CLEARANCE_MM = 5
export const HALF_MOON_ZIPPER_CLEARANCE_MM = 10
export const HALFMOON_OUTSIDE_GUSSET_ERROR =
  "Halfmoon outside gusset area, consider moving"

type HalfMoonEvaluation = {
  hardErrors: string[]
  warnings: string[]
  flags: {
    hardViolation: boolean
    warning: boolean
    nearGusset: boolean
    nearZipper: boolean
    notCentered: boolean
  }
}

export function clampHalfMoonRadius(spec: FlowwrapSpec, radius: number) {
  const geometry = resolveFlowwrapGeometry(spec)
  const sealClearance = spec.sealClearance ?? DEFAULT_SEAL_CLEARANCE_MM
  const maxSeal = Math.min(geometry.seals.top, geometry.seals.bottom)
  const maxRadius = Math.max(1, maxSeal - sealClearance)
  const candidates = [3, 4].filter(value => value <= maxRadius)
  if (!candidates.length) {
    return Math.min(maxRadius, Math.max(1, radius))
  }
  const closest = candidates.reduce((best, value) =>
    Math.abs(value - radius) < Math.abs(best - radius) ? value : best
  )
  return closest
}

export function evaluateHalfMoonCutout(
  spec: FlowwrapSpec,
  cutout: HalfMoonCutoutSpec
): HalfMoonEvaluation {
  const hardErrors: string[] = []
  const warnings: string[] = []
  const geometry = resolveFlowwrapGeometry(spec)
  const seals = geometry.seals
  const cutterWidth = geometry.cutterRect.width
  const sealClearance = spec.sealClearance ?? DEFAULT_SEAL_CLEARANCE_MM
  const radius = cutout.radius
  const leftEdge = cutout.centerX - radius
  const rightEdge = cutout.centerX + radius
  const isOnCutterEdge = Math.abs(cutout.centerY) <= 0.25
  if (!isOnCutterEdge) {
    hardErrors.push("Half-moon cut-out must sit on the top cutter edge.")
  }

  if (leftEdge < seals.left || rightEdge > cutterWidth - seals.right) {
    hardErrors.push("Half-moon cut-out must not intersect side seals.")
  }

  if (seals.top - radius < sealClearance) {
    hardErrors.push("Half-moon cut-out reduces seal width below minimum spec.")
  }
  if (seals.bottom - radius < sealClearance) {
    hardErrors.push("Half-moon cut-out reduces seal width below minimum spec.")
  }

  const layout = resolveDoyBounds(spec, {
    originX: 0,
    liveOriginX: seals.left,
    liveWidth: cutterWidth - seals.left - seals.right,
    cutterWidth
  })
  if (layout && spec.doyPouch) {
    if (spec.doyPouch.showGusset !== false) {
      const inGussetZone =
        cutout.centerX - radius >= layout.gussetLeftX &&
        cutout.centerX + radius <= layout.gussetRightX
      if (!inGussetZone) {
        hardErrors.push(HALFMOON_OUTSIDE_GUSSET_ERROR)
      }
    }

    if (spec.doyPouch.showGripSeal !== false && layout.gripSealWidth > 0) {
      const leftGripHit =
        rightEdge >= layout.leftGripX && leftEdge <= layout.leftGripX + layout.gripSealWidth
      const rightGripHit =
        rightEdge >= layout.rightGripX && leftEdge <= layout.rightGripX + layout.gripSealWidth
      if (leftGripHit || rightGripHit) {
        hardErrors.push("Half-moon cut-out must not intersect grip seals.")
      }
    }

    if (spec.doyPouch.showZipper !== false && layout.zipperWidth > 0) {
      const leftZipperHit =
        rightEdge >= layout.zipperLeftX && leftEdge <= layout.zipperLeftX + layout.zipperWidth
      const rightZipperHit =
        rightEdge >= layout.zipperRightX &&
        leftEdge <= layout.zipperRightX + layout.zipperWidth
      if (leftZipperHit || rightZipperHit) {
        hardErrors.push("Half-moon cut-out must not intersect zipper profiles.")
      }
      const leftZipperEdge = layout.zipperLeftX + layout.zipperWidth
      const rightZipperEdge = layout.zipperRightX
      const leftZipperGap = Math.max(0, Math.min(
        Math.abs(leftEdge - leftZipperEdge),
        Math.abs(rightEdge - layout.zipperLeftX)
      ))
      const rightZipperGap = Math.max(0, Math.min(
        Math.abs(leftEdge - (layout.zipperRightX + layout.zipperWidth)),
        Math.abs(rightEdge - rightZipperEdge)
      ))
      if (
        leftZipperGap < HALF_MOON_ZIPPER_CLEARANCE_MM ||
        rightZipperGap < HALF_MOON_ZIPPER_CLEARANCE_MM
      ) {
        hardErrors.push("Half-moon cut-out must be at least 10mm from zipper edges.")
      }
    }

    if (spec.doyPouch.showTearNotch !== false && layout.notchHalf > 0) {
      const leftNotchEdgeLeft = layout.notchLeftX - layout.notchHalf
      const leftNotchEdgeRight = layout.notchLeftX + layout.notchHalf
      const rightNotchEdgeLeft = layout.notchRightX - layout.notchHalf
      const rightNotchEdgeRight = layout.notchRightX + layout.notchHalf
      const leftNotchGap = Math.max(
        0,
        Math.min(
          Math.abs(leftEdge - leftNotchEdgeRight),
          Math.abs(rightEdge - leftNotchEdgeLeft)
        )
      )
      const rightNotchGap = Math.max(
        0,
        Math.min(
          Math.abs(leftEdge - rightNotchEdgeRight),
          Math.abs(rightEdge - rightNotchEdgeLeft)
        )
      )
      if (leftNotchGap <= 0 || rightNotchGap <= 0) {
        hardErrors.push("Half-moon cut-out must not intersect tear notches.")
      }
      if (
        leftNotchGap < HALF_MOON_ZIPPER_CLEARANCE_MM ||
        rightNotchGap < HALF_MOON_ZIPPER_CLEARANCE_MM
      ) {
        hardErrors.push("Half-moon cut-out must be at least 10mm from tear notch edges.")
      }
    }
  }

  const nearGusset = warnings.some(message =>
    message.includes("gusset fold line")
  )
  const nearZipper = warnings.some(message =>
    message.includes("zipper or tear notch")
  )

  return {
    hardErrors,
    warnings,
    flags: {
      hardViolation: hardErrors.length > 0,
      warning: warnings.length > 0,
      nearGusset,
      nearZipper,
      notCentered: false
    }
  }
}
