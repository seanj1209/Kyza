import { safeZoneRespectsConstruction } from "../../../../packages/cutter-engine/actions/safeZoneContours"
import { laserLaneSpacingAdvice } from "../../../../packages/cutter-engine/validation/laserLaneAdvice"
import {
  PARAMETER_CONSTRAINTS,
  PARAMETER_ENUMS,
  ensureFinite
} from "../core/model/parameterSchema"
import { resolveFlowwrapGeometry } from "../geometry/flowwrapGeometry"
import { getSealClearanceBounds } from "./sealClearance"
import { evaluateHalfMoonCutout } from "./halfMoonCutouts"
import {
  clampPaperStripClearStripAttribute,
  getPaperStripPlacementMetrics,
  isPaperStripClearStripAttribute
} from "./paperStrip"
import type { AttributeBoxSpec, FlowwrapSpec, SafeZoneSpec } from "../types/flowwrap"
import type { EyeMarkPositionOne, EyeMarkPositionTwo } from "../types/eyeMarks"

export const MIN_SEAL_CLEARANCE_MM = 5
export const DEFAULT_SEAL_CLEARANCE_MM = 5
/** Amends v12: 3SS and 4SS sachets (the only specs carrying `sachet`) allow 1 mm or more. */
export const SACHET_MIN_SEAL_CLEARANCE_MM = 1
export const SACHET_DEFAULT_SEAL_CLEARANCE_MM = 1

export const isSachetClearanceScope = (spec: Pick<FlowwrapSpec, "sachet">) => spec.sachet !== undefined

/** Pouches use entered clearance; 3 mm is a production default, not a new hard minimum. */
export function getMinimumSealClearanceMm(spec: Pick<FlowwrapSpec, "sachet" | "doyPouch" | "kSealPouch">, packId?:string) {
  return isSachetClearanceScope(spec) ? SACHET_MIN_SEAL_CLEARANCE_MM : packId==="pillow-pack" ? 3 : spec.doyPouch || spec.kSealPouch ? 0 : MIN_SEAL_CLEARANCE_MM
}

/** Safe zones use entered clearance (at least 1 mm for sachets), without an internal bleed floor. */
export function getSafeZoneSealClearanceMm(spec: Pick<FlowwrapSpec, "sachet" | "doyPouch" | "kSealPouch" | "seal" | "sealClearance">, sealClearance = spec.sealClearance ?? DEFAULT_SEAL_CLEARANCE_MM) {
  if (isSachetClearanceScope(spec)) return Math.max(SACHET_MIN_SEAL_CLEARANCE_MM, sealClearance)
  return Math.max(0, sealClearance)
}
export const MAX_SAFE_ZONES = 10

type ValidationResult = {
  errors: string[]
  warnings?: string[]
  sealClearance: number
}

function describeZone(zone: SafeZoneSpec) {
  const name = zone.label?.trim() ? zone.label : zone.id
  return name ? `"${name}"` : "unnamed zone"
}

function describeAttributeBox(box: AttributeBoxSpec) {
  const kindLabel =
    box.kind === "qr"
      ? "QR box"
      : box.kind === "bbe"
        ? "BBE box"
        : box.kind === "barcode"
          ? "Barcode box"
          : box.kind === "clear-strip"
            ? "Clear strip"
            : "Label box"
  return `"${box.id}" (${kindLabel})`
}

function getSafeZoneBounds(zone: SafeZoneSpec) {
  const rotation = ((zone.rotation ?? 0) * Math.PI) / 180
  const cx = zone.x + zone.width / 2
  const cy = zone.y + zone.height / 2
  const corners = [
    { x: zone.x, y: zone.y },
    { x: zone.x + zone.width, y: zone.y },
    { x: zone.x, y: zone.y + zone.height },
    { x: zone.x + zone.width, y: zone.y + zone.height }
  ].map(point => {
    if (rotation === 0) {
      return point
    }
    const dx = point.x - cx
    const dy = point.y - cy
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos
    }
  })
  const xs = corners.map(point => point.x)
  const ys = corners.map(point => point.y)
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  }
}

function isPlainFilmContext(spec: FlowwrapSpec) {
  return (
    spec.seal === 0 &&
    spec.seals?.top === 0 &&
    spec.seals?.bottom === 0 &&
    spec.seals?.left === 0 &&
    spec.seals?.right === 0
  )
}

export function validateFlowwrapSpec(spec: FlowwrapSpec,packId?:string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const laneAdvice = laserLaneSpacingAdvice(spec.perfs)
  if (laneAdvice) warnings.push(laneAdvice)
  const minWidth = ensureFinite(PARAMETER_CONSTRAINTS.base.width.min, 1)
  const minHeight = ensureFinite(PARAMETER_CONSTRAINTS.base.height.min, 1)
  const minSeal = ensureFinite(PARAMETER_CONSTRAINTS.base.seal.min, 1)
  const minSealClearance = ensureFinite(
    PARAMETER_CONSTRAINTS.base.sealClearance.min,
    0
  )
  const minEyeMarkCount = ensureFinite(
    PARAMETER_CONSTRAINTS.eyeMarks.count.min,
    1
  )
  const maxEyeMarkCount = ensureFinite(
    PARAMETER_CONSTRAINTS.eyeMarks.count.max,
    2
  )
  const plainFilmContext = isPlainFilmContext(spec)

  if (spec.width < minWidth) {
    errors.push("Width must be greater than 0mm.")
  }

  if (spec.height < minHeight) {
    errors.push("Height must be greater than 0mm.")
  }

  if (!plainFilmContext && spec.seal < minSeal) {
    errors.push("Seal must be greater than 0mm.")
  }

  if (
    spec.bleed !== undefined &&
    spec.bleed < ensureFinite(PARAMETER_CONSTRAINTS.base.bleed.min, 0)
  ) {
    errors.push("Bleed must be 0mm or greater")
  }

  const geometry = resolveFlowwrapGeometry(spec)
  const liveWidth = geometry.liveRect.width
  const liveHeight = geometry.liveRect.height

  if (liveWidth <= 0) {
    errors.push("Cutter width must be greater than total left/right seals.")
  }

  if (liveHeight <= 0) {
    errors.push("Cutter height must be greater than total top/bottom seals.")
  }


  const sealClearance =
    spec.sealClearance === undefined
      ? (spec.sachet?.safeZoneBuffer ?? DEFAULT_SEAL_CLEARANCE_MM)
      : spec.sealClearance

  const requiredSealClearance = Math.max(
    minSealClearance,
    getMinimumSealClearanceMm(spec,packId)
  )
  if (spec.seal > 0 && sealClearance < requiredSealClearance) {
    errors.push(
      `Seal clearance must be at least ${requiredSealClearance}mm.`
    )
  }

  if (spec.safeZones && spec.safeZones.length > MAX_SAFE_ZONES) {
    errors.push(`No more than ${MAX_SAFE_ZONES} safe zones are allowed.`)
  }

  const perfs = spec.perfs
  if (perfs) {
    if (perfs.separation <= 0) {
      errors.push("Perf separation must be greater than 0mm.")
    }
    if (perfs.diameter <= 0) {
      errors.push("Perf diameter must be greater than 0mm.")
    }
    if (perfs.diameter > 12) {
      errors.push("Perf diameter cannot exceed 12mm.")
    }
    const lanes = perfs.lanes?.length
      ? perfs.lanes
      : [{ originX: perfs.originX, originY: perfs.originY }]
    if (lanes.length > 3) {
      errors.push("No more than 3 perf lanes are allowed.")
    }
    lanes.forEach((lane, index) => {
      const laneDiameter = lane.diameter ?? perfs.diameter
      if (laneDiameter <= 0) {
        errors.push(`Perf lane ${index + 1} diameter must be greater than 0mm.`)
      }
      if (laneDiameter > 12) {
        errors.push(`Perf lane ${index + 1} diameter cannot exceed 12mm.`)
      }
      if (lane.originX < 0) {
        errors.push(`Perf lane ${index + 1} origin X must be inside the live area.`)
      }
      if (perfs.mode === "regulated") {
        if (lane.originY === undefined || lane.originY < 0) {
          errors.push(`Perf lane ${index + 1} origin Y must be inside the live area.`)
        }
      }
    })
    if (perfs.mode === "continuous") {
      if (!perfs.sealEdge) {
        errors.push("Perf seal edge is required for continuous mode.")
      }
    }
    if (perfs.mode === "regulated") {
      if (perfs.count === undefined || perfs.count <= 0) {
        errors.push("Perf count must be greater than 0 for regulated mode.")
      }
    }
  }

  if (spec.eyeMarks) {
    const supportedCount =
      spec.eyeMarks.count >= minEyeMarkCount &&
      spec.eyeMarks.count <= maxEyeMarkCount
    if (supportedCount) {
      if (spec.eyeMarks.width <= 0 || spec.eyeMarks.height <= 0) {
        errors.push("Eyemark size must be greater than 0mm.")
      }
      const validSinglePositions = new Set(
        PARAMETER_ENUMS.eyeMarkPositionSingle.options
      )
      const validDoublePositions = new Set(
        PARAMETER_ENUMS.eyeMarkPositionDouble.options
      )
      const position = spec.eyeMarks.position
      if (
        spec.eyeMarks.count === 1 &&
        !validSinglePositions.has(position as EyeMarkPositionOne)
      ) {
        errors.push("Eyemark position is invalid for a single mark.")
      }
      if (
        spec.eyeMarks.count === 2 &&
        !validDoublePositions.has(position as EyeMarkPositionTwo)
      ) {
        errors.push("Eyemark position is invalid for two marks.")
      }
    }
  }

  if (spec.windows && spec.windows.length > 1) {
    errors.push("Only one window is allowed.")
  }

  if (spec.halfMoonCutouts && spec.halfMoonCutouts.length > 0) {
    if (spec.halfMoonCutouts.length > 2) {
      errors.push("No more than two half-moon cut-outs are allowed.")
    }
    spec.halfMoonCutouts.forEach(cutout => {
      const result = evaluateHalfMoonCutout(spec, cutout)
      result.hardErrors.forEach(message => {
        if (!errors.includes(message)) {
          errors.push(message)
        }
      })
      result.warnings.forEach(message => {
        if (!warnings.includes(message)) {
          warnings.push(message)
        }
      })
    })
  }

  let hasSafeZoneClearanceWarning = false
  if (spec.safeZones) {
    for (const zone of spec.safeZones) {
      if (zone.enabled === false) {
        continue
      }

      if (zone.width <= 0 || zone.height <= 0) {
        errors.push(
          `Safe zone ${describeZone(zone)} must have positive width and height.`
        )
        continue
      }

      const bounds = getSafeZoneBounds(zone)
      if (!safeZoneRespectsConstruction(spec, zone)) warnings.push(`Safe zone ${describeZone(zone)} cannot maintain the entered clearance from clear strips, gusset arcs or K-Seal construction. Move the zone or adjust the working area.`)
      const cutterMinX = -geometry.seals.left
      const cutterMinY = -geometry.seals.top
      const cutterMaxX = liveWidth + geometry.seals.right
      const cutterMaxY = liveHeight + geometry.seals.bottom

      if (
        bounds.minX < cutterMinX ||
        bounds.minY < cutterMinY ||
        bounds.maxX > cutterMaxX ||
        bounds.maxY > cutterMaxY
      ) {
        errors.push(
          `Safe zone ${describeZone(zone)} must stay inside the cutter area.`
        )
        continue
      }

      if (
        bounds.minX < 0 ||
        bounds.minY < 0 ||
        bounds.maxX > liveWidth ||
        bounds.maxY > liveHeight
      ) {
        hasSafeZoneClearanceWarning = true
        continue
      }

      const effectiveClearance = getSafeZoneSealClearanceMm(spec, sealClearance)
      const clearanceMinX = effectiveClearance
      const clearanceMinY = effectiveClearance
      const clearanceMaxX = liveWidth - effectiveClearance
      const clearanceMaxY = liveHeight - effectiveClearance
      if (
        bounds.minX < clearanceMinX ||
        bounds.minY < clearanceMinY ||
        bounds.maxX > clearanceMaxX ||
        bounds.maxY > clearanceMaxY
      ) {
        hasSafeZoneClearanceWarning = true
      }
    }
  }

  if (hasSafeZoneClearanceWarning) {
    warnings.push("Safe zone needs more seal clearance — move or resize it to stay within the working area.")
  }

  let hasAttributeBoxClearanceWarning = false
  if (spec.attributeBoxes) {
    for (const box of spec.attributeBoxes) {
      if (box.enabled === false) {
        continue
      }

      if (isPaperStripClearStripAttribute(box) && spec.paperStrip) {
        if (box.width <= 0 || box.height <= 0) {
          errors.push(
            `Attribute ${describeAttributeBox(box)} must have positive width and height.`
          )
          continue
        }
        const normalizedBox = clampPaperStripClearStripAttribute(spec, box)
        const metrics = getPaperStripPlacementMetrics(spec, normalizedBox.width)
        if (!metrics.fits) {
          errors.push("Clear strip group does not fit within live width")
          continue
        }
        if (box.x !== normalizedBox.x || box.width !== normalizedBox.width) {
          hasAttributeBoxClearanceWarning = true
        }
        continue
      }

      if (box.width <= 0 || box.height <= 0) {
        errors.push(
          `Attribute ${describeAttributeBox(box)} must have positive width and height.`
        )
        continue
      }

      const cutterMinX = -geometry.seals.left
      const cutterMinY = -geometry.seals.top
      const cutterMaxX = liveWidth + geometry.seals.right
      const cutterMaxY = liveHeight + geometry.seals.bottom
      if (
        box.x < cutterMinX ||
        box.y < cutterMinY ||
        box.x + box.width > cutterMaxX ||
        box.y + box.height > cutterMaxY
      ) {
        errors.push(
          `Attribute ${describeAttributeBox(box)} must stay inside the cutter area.`
        )
        continue
      }

      if (
        box.x < 0 ||
        box.y < 0 ||
        box.x + box.width > liveWidth ||
        box.y + box.height > liveHeight
      ) {
        if(box.kind==="label")continue
        hasAttributeBoxClearanceWarning = true
        continue
      }

      if(box.kind==="label")continue

      const effectiveClearance = getSafeZoneSealClearanceMm(spec, sealClearance)
      const { minX, minY, maxX, maxY } = getSealClearanceBounds(
        liveWidth,
        liveHeight,
        effectiveClearance,
        box.width,
        box.height
      )

      if (maxX < minX || maxY < minY) {
        hasAttributeBoxClearanceWarning = true
        continue
      }

      if (box.x < minX || box.y < minY || box.x > maxX || box.y > maxY) {
        hasAttributeBoxClearanceWarning = true
      }
    }
  }

  if (hasAttributeBoxClearanceWarning) {
    warnings.push("Attribute box needs more seal clearance — move it away from the seal area.")
  }

  return { errors, warnings, sealClearance }
}
