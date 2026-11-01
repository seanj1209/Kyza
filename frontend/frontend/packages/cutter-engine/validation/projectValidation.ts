import { safeZoneRespectsConstruction } from "../actions/safeZoneContours"
import { pouchEyemarkPlacements } from "../actions/pouchEyemarkZones"
import { INTERNAL_BLEED_MM } from "../../../apps/web/src/constraints/bleed"
import { getSafeZoneSealClearanceMm } from "../../../apps/web/src/constraints/flowwrap"
import { createPackValidator } from "../../../apps/web/src/engines/validation-engine/createPackValidator"
import {
  canEyemarkFitInSealArea,
  DEFAULT_EYEMARK_EDGE_CLEARANCE_MM,
  getEyemarkPlacementArea,
  placeEyemarkWithEdgeClearance
} from "../../../apps/web/src/geometry/eyemarkPlacement"
import {
  resolveFlowwrapGeometry,
  resolveSealSizes
} from "../../../apps/web/src/geometry/flowwrapGeometry"
import {
  buildKSealEyeMarkRects,
  resolveKSealPouchGeometry
} from "../../../apps/web/src/geometry/kSealPouchGeometry"
import type { FlowwrapSpec, SafeZoneSpec } from "../../../apps/web/src/types/flowwrap"
import {
  KSEAL_EYEMARK_CLEARANCE_MM,
  getKSealDualEyemarkClearances,
  getKSealDualEyemarkTarget,
  getKSealEyemarkOffsetX,
  getKSealEyemarkSize,
  getKSealEyemarkThresholds
} from "../../../apps/web/src/rules/kSealEyemarkRules"
import {
  isKSealTacHole,
  isKSealTacOffCentre
} from "../../../apps/web/src/rules/kSealTacHoleRules"
import {
  getEyemarkElementRefs,
  getTearNotchElementRefs,
  parseKyzaProject,
  type KyzaProjectV1
} from "../project"
import type { ValidationMessage, ValidationResult } from "./validationTypes"
import { resolveSachetEyemarkPlacements } from "../../../apps/web/src/core/geometry/resolvers/resolveSachetEyemarkPlacement"
import { liddingEyemarkRects } from "../../../apps/web/src/constraints/lidding"
import { resolveSymmetricPillowFoldLines } from "../../../apps/web/src/core/geometry/resolvers/resolvePillowLayout"

type Rect = {
  x: number
  y: number
  width: number
  height: number
}

const SUPPORTED_PACK_TYPES = new Set([
  "flowwrap",
  "pillow-pack",
  "doy-pouch",
  "k-seal-pouch",
  "sachet-3-side-seal",
  "sachet-4-side-seal",
  "plain-web",
  "plain-film",
  "lidding",
  "2-side-seal-pouch",
  "3-side-seal-pouch",
  "paper-strip"
])

const PACKS_WITH_KNOWN_EYEMARK_SEAL_ZONES = new Set([
  "flowwrap",
  "pillow-pack",
  "paper-strip"
])

/** Amends v12: sachet eyemarks are validated from resolveSachetEyemarkPlacements. */
const SACHET_EYEMARK_PACK_TYPES = new Set(["sachet-3-side-seal", "sachet-4-side-seal", "2-side-seal-pouch", "3-side-seal-pouch"])

const PACKS_WITH_RENDERER_PARITY_EYEMARK_POSITION = new Set([
  "flowwrap",
  "pillow-pack",
  "doy-pouch",
  "k-seal-pouch",
  "paper-strip"
])

const hasKnownEyemarkAllowedZone = (
  packType: string,
  count: number,
  position: string
) =>
  PACKS_WITH_KNOWN_EYEMARK_SEAL_ZONES.has(packType) &&
  !(count === 1 && position === "centre")

const packRequiresSeals = (packType: string) => packType !== "plain-web" && packType !== "plain-film" && packType !== "lidding"

const resolvePackValidationGeometry = (spec: FlowwrapSpec, packType: string) => {
  if (packType !== "k-seal-pouch") {
    return {
      geometry: resolveFlowwrapGeometry(spec),
      kSealGeometry: null
    }
  }
  const kSealGeometry = resolveKSealPouchGeometry(spec)
  return {
    geometry: resolveFlowwrapGeometry({
      ...spec,
      width: kSealGeometry.width,
      height: kSealGeometry.height,
      seal: kSealGeometry.sideSeal,
      seals: {
        top: kSealGeometry.sideSeal,
        bottom: kSealGeometry.sideSeal,
        left: kSealGeometry.trimWidth,
        right: kSealGeometry.trimWidth
      }
    }),
    kSealGeometry
  }
}

const rectIsInside = (rect: Rect, bounds: Rect) => {
  const epsilon = 0.0001
  return (
    rect.x >= bounds.x - epsilon &&
    rect.y >= bounds.y - epsilon &&
    rect.x + rect.width <= bounds.x + bounds.width + epsilon &&
    rect.y + rect.height <= bounds.y + bounds.height + epsilon
  )
}

const cloneRect = (rect: Rect): Rect => ({ ...rect })

type MutableValidationContext = {
  projectId: string
  revision: string
  packType?: string
  messages: ValidationMessage[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const addMessage = (
  context: MutableValidationContext,
  message: Omit<ValidationMessage, "packType"> & { packType?: string }
) => {
  const next: ValidationMessage = {
    ...message,
    packType: message.packType ?? context.packType
  }
  const key = `${next.code}|${next.message}|${next.elementIds.join(",")}|${next.fieldPath ?? ""}`
  const exists = context.messages.some(existing =>
    `${existing.code}|${existing.message}|${existing.elementIds.join(",")}|${existing.fieldPath ?? ""}` === key
  )
  if (!exists) {
    context.messages.push(next)
  }
}

const createResult = (context: MutableValidationContext): ValidationResult => ({
  projectId: context.projectId,
  revision: context.revision,
  valid: !context.messages.some(message => message.severity === "error"),
  messages: context.messages
})

const getRawProjectIdentity = (value: unknown) => {
  if (!isRecord(value)) {
    return { projectId: "unknown", revision: "unknown", packType: undefined }
  }
  const cutter = isRecord(value.cutter) ? value.cutter : undefined
  return {
    projectId: typeof value.id === "string" ? value.id : "unknown",
    revision:
      typeof value.revision === "number" || typeof value.revision === "string"
        ? String(value.revision)
        : "unknown",
    packType: cutter && typeof cutter.packType === "string" ? cutter.packType : undefined
  }
}

const inspectRawIdentity = (
  value: unknown,
  context: MutableValidationContext
) => {
  if (!isRecord(value) || !isRecord(value.cutter)) {
    return
  }
  const cutter = value.cutter
  const identityMap = isRecord(cutter.identityMap) ? cutter.identityMap : undefined
  const elements = identityMap && Array.isArray(identityMap.elements)
    ? identityMap.elements
    : null
  if (!elements) {
    addMessage(context, {
      code: "ELEMENT_ID_MISSING",
      severity: "warning",
      message: "Element identity metadata is missing and must be repaired before export.",
      elementIds: [],
      fieldPath: "cutter.identityMap",
      fixable: true,
      suggestedFixId: "normalise-element-identity"
    })
    return
  }

  const seen = new Set<string>()
  const activeCounts = new Map<string, number>()
  elements.forEach((element, index) => {
    if (!isRecord(element) || typeof element.id !== "string" || !element.id.trim()) {
      addMessage(context, {
        code: "ELEMENT_ID_MISSING",
        severity: "warning",
        message: `Element ref ${index + 1} is missing a stable ID.`,
        elementIds: [],
        fieldPath: `cutter.identityMap.elements[${index}].id`,
        fixable: true,
        suggestedFixId: "normalise-element-identity"
      })
      return
    }
    if (seen.has(element.id)) {
      addMessage(context, {
        code: "ELEMENT_ID_DUPLICATE",
        severity: "error",
        message: `Duplicate cutter element ID: ${element.id}.`,
        elementIds: [element.id],
        fieldPath: "cutter.identityMap.elements"
      })
    }
    seen.add(element.id)
    if (element.status === "active" && typeof element.type === "string") {
      activeCounts.set(element.type, (activeCounts.get(element.type) ?? 0) + 1)
    }
  })

  const spec = isRecord(cutter.legacySpec) ? cutter.legacySpec : undefined
  if (!spec) {
    return
  }
  const eyeMarks = isRecord(spec.eyeMarks) ? spec.eyeMarks : undefined
  const expectedEyemarks = eyeMarks && typeof eyeMarks.count === "number"
    ? Math.max(0, Math.min(2, Math.trunc(eyeMarks.count)))
    : 0
  const perfs = isRecord(spec.perfs) ? spec.perfs : undefined
  const expectedPerfLanes = perfs
    ? Array.isArray(perfs.lanes) && perfs.lanes.length > 0
      ? perfs.lanes.length
      : 1
    : 0
  const doyPouch = isRecord(spec.doyPouch) ? spec.doyPouch : undefined
  const sachet = isRecord(spec.sachet) ? spec.sachet : undefined
  const expectedNotches =
    (doyPouch && isRecord(doyPouch.tearNotch) && doyPouch.showTearNotch !== false ? 1 : 0) +
    (sachet && isRecord(sachet.tearNotch) && sachet.tearNotch.enabled === true ? 1 : 0)

  ;([
    ["eyemark", expectedEyemarks],
    ["perf-lane", expectedPerfLanes],
    ["tear-notch", expectedNotches]
  ] as const).forEach(([type, expected]) => {
    const actual = activeCounts.get(type) ?? 0
    if (actual !== expected) {
      addMessage(context, {
        code: "ELEMENT_IDENTITY_MISMATCH",
        severity: "error",
        message: `${type} identity count ${actual} does not match active legacy count ${expected}.`,
        elementIds: [],
        fieldPath: "cutter.identityMap.elements",
        fixable: true,
        suggestedFixId: "normalise-element-identity"
      })
    }
  })
}

const getRotatedSafeZoneBounds = (zone: SafeZoneSpec) => {
  const rotation = ((zone.rotation ?? 0) * Math.PI) / 180
  const cx = zone.x + zone.width / 2
  const cy = zone.y + zone.height / 2
  const corners = [
    { x: zone.x, y: zone.y },
    { x: zone.x + zone.width, y: zone.y },
    { x: zone.x, y: zone.y + zone.height },
    { x: zone.x + zone.width, y: zone.y + zone.height }
  ].map(point => {
    const dx = point.x - cx
    const dy = point.y - cy
    return {
      x: cx + dx * Math.cos(rotation) - dy * Math.sin(rotation),
      y: cy + dx * Math.sin(rotation) + dy * Math.cos(rotation)
    }
  })
  return {
    minX: Math.min(...corners.map(point => point.x)),
    minY: Math.min(...corners.map(point => point.y)),
    maxX: Math.max(...corners.map(point => point.x)),
    maxY: Math.max(...corners.map(point => point.y))
  }
}

const validateStructuredSpec = (
  project: KyzaProjectV1,
  context: MutableValidationContext
) => {
  const spec = project.cutter.legacySpec
  const packType = project.cutter.packType
  if (!(spec.width > 0) || !(spec.height > 0)) {
    addMessage(context, {
      code: "CUTTER_DIMENSIONS_INVALID",
      severity: "error",
      message: "Cutter width and height must be greater than 0mm.",
      elementIds: [],
      fieldPath: "cutter.legacySpec"
    })
  }

  const seals = resolveSealSizes(spec)
  if (Object.values(seals).some(value => !Number.isFinite(value) || value < 0)) {
    addMessage(context, {
      code: "SEAL_INVALID_DIMENSION",
      severity: "error",
      message: "Seal dimensions must be finite, non-negative millimetre values.",
      elementIds: [],
      fieldPath: "cutter.legacySpec.seals"
    })
  }
  if (packRequiresSeals(packType) && !(spec.seal > 0)) {
    addMessage(context, {
      code: "SEAL_INVALID_DIMENSION",
      severity: "error",
      message: "This pack type requires a seal greater than 0mm.",
      elementIds: [],
      fieldPath: "cutter.legacySpec.seal"
    })
  }
  const { geometry, kSealGeometry } = resolvePackValidationGeometry(spec, packType)
  if (geometry.liveRect.width <= 0 || geometry.liveRect.height <= 0) {
    addMessage(context, {
      code: "SEAL_LIVE_AREA_IMPOSSIBLE",
      severity: "error",
      message: "Seal dimensions leave an impossible live area.",
      elementIds: [],
      fieldPath: "cutter.legacySpec.seals"
    })
  }
  if (!SUPPORTED_PACK_TYPES.has(packType)) {
    addMessage(context, {
      code: "SEAL_GEOMETRY_UNRESOLVED",
      severity: "warning",
      message: "Pack-specific seal geometry is not exposed for this pack type.",
      elementIds: [],
      fieldPath: "cutter.legacySpec.seals",
      fixable: false
    })
  }

  if (spec.bleed !== undefined) {
    if (spec.bleed < 0) {
      addMessage(context, {
        code: "BLEED_NEGATIVE",
        severity: "error",
        message: "Bleed must be 0mm or greater.",
        elementIds: [],
        fieldPath: "cutter.legacySpec.bleed"
      })
    } else if (
      spec.bleed * 2 >= geometry.liveRect.width ||
      spec.bleed * 2 >= geometry.liveRect.height
    ) {
      addMessage(context, {
        code: "BLEED_OUTSIDE_LIVE_AREA",
        severity: "error",
        message: "Bleed does not fit inside the available live area.",
        elementIds: [],
        fieldPath: "cutter.legacySpec.bleed"
      })
    }
    if (spec.bleed !== INTERNAL_BLEED_MM) {
      addMessage(context, {
        code: "BLEED_RENDERER_VALUE_MISMATCH",
        severity: "warning",
        message: `The project requests ${spec.bleed}mm bleed while the renderer still uses ${INTERNAL_BLEED_MM}mm.`,
        elementIds: [],
        fieldPath: "cutter.legacySpec.bleed",
        fixable: false
      })
    }
  }

  const eyeMarks = spec.eyeMarks
  if (!eyeMarks || eyeMarks.count === 0) {
    addMessage(context, {
      code: "EYEMARK_NONE_ADVISORY",
      severity: "info",
      message: "If design is to printed, consider adding an eyemark or two",
      elementIds: [],
      fieldPath: "cutter.legacySpec.eyeMarks.count",
      fixable: false
    })
  } else {
    const refs = getEyemarkElementRefs(project).filter(ref => ref.status === "active")
    if (eyeMarks.count !== 1 && eyeMarks.count !== 2) {
      addMessage(context, {
        code: "EYEMARK_COUNT_UNSUPPORTED",
        severity: "error",
        message: "Eyemark count must be 1 or 2.",
        elementIds: refs.map(ref => ref.id),
        fieldPath: "cutter.legacySpec.eyeMarks.count"
      })
    } else {
      if (spec.doyPouch && !spec.kSealPouch && !spec.doyPouch.trimEnabled && eyeMarks.count === 2) {
        addMessage(context, {
          code: "DOY_EYEMARK_TRIM_REQUIRED",
          severity: "error",
          message: "Enable DOY trim before using two eyemarks.",
          elementIds: refs.map(ref => ref.id),
          fieldPath: "cutter.legacySpec.eyeMarks.count"
        })
      }
      if (kSealGeometry) {
        const thresholds = getKSealEyemarkThresholds(eyeMarks.count)
        for (let index = 0; index < eyeMarks.count; index += 1) {
          const ref = refs.find(item => item.index === index)
          const size = getKSealEyemarkSize(eyeMarks, index)
          const critical =
            size.width < thresholds.criticalMinimum.width ||
            size.height < thresholds.criticalMinimum.height
          const advisory = !critical && (
            size.width < thresholds.productionMinimum.width ||
            size.height < thresholds.productionMinimum.height
          )
          if (critical || advisory) {
            addMessage(context, {
              code: critical
                ? "KSEAL_EYEMARK_SIZE_CRITICAL"
                : "KSEAL_EYEMARK_SIZE_ADVISORY",
              severity: critical ? "error" : "info",
              message: critical
                ? `Eyemark ${index + 1} is below the supported K-Seal minimum.`
                : `Eyemark ${index + 1} is below the K-Seal production minimum.`,
              elementIds: ref ? [ref.id] : [],
              fieldPath: "cutter.legacySpec.eyeMarks",
              fixable: true,
              suggestedFixId: eyeMarks.count === 2
                ? "kseal-fit-dual-eyemarks-to-trim"
                : "kseal-eyemark-size"
            })
          }
        }
      }
      if (kSealGeometry && eyeMarks.count === 2) {
        const target = getKSealDualEyemarkTarget(kSealGeometry.trimWidth)
        const oversizedRefs: string[] = []
        let exceedsTrim = false
        for (let index = 0; index < 2; index += 1) {
          const ref = refs.find(item => item.index === index)
          const size = getKSealEyemarkSize(eyeMarks, index)
          const offset = getKSealEyemarkOffsetX(eyeMarks, index)
          const clearances = getKSealDualEyemarkClearances(
            kSealGeometry.trimWidth,
            size.width,
            offset
          )
          const outsideTrim = clearances.outer < 0 || clearances.inner < 0
          if (size.width > target && ref) oversizedRefs.push(ref.id)
          if (size.width > kSealGeometry.trimWidth) exceedsTrim = true
          if (outsideTrim) {
            addMessage(context, {
              code: "KSEAL_EYEMARK_TRIM_BOUNDS",
              severity: "error",
              message: `Eyemark ${index + 1} must remain inside the K-Seal trim.`,
              elementIds: ref ? [ref.id] : [],
              fieldPath: "cutter.legacySpec.eyeMarks"
            })
          } else if (
            size.width <= target &&
            (
              clearances.outer < KSEAL_EYEMARK_CLEARANCE_MM ||
              clearances.inner < KSEAL_EYEMARK_CLEARANCE_MM
            )
          ) {
            addMessage(context, {
              code: "KSEAL_EYEMARK_EDGE_TOLERANCE",
              severity: "warning",
              message: "Consider moving eyemark away from edge to allow for conversion tolerances",
              elementIds: ref ? [ref.id] : [],
              fieldPath: "cutter.legacySpec.eyeMarks",
              fixable: true,
              suggestedFixId: "kseal-eyemark-centre"
            })
          }
        }
        if (oversizedRefs.length > 0) {
          addMessage(context, {
            code: "KSEAL_EYEMARK_TRIM_TOLERANCE",
            severity: exceedsTrim ? "error" : "warning",
            message: `Fit dual eyemarks to the ${target}mm width available within trim.`,
            elementIds: oversizedRefs,
            fieldPath: "cutter.legacySpec.eyeMarks",
            fixable: true,
            suggestedFixId: "kseal-fit-dual-eyemarks-to-trim"
          })
        }
      }
      // Amends v12: 3SS/4SS placement is resolved by the same function the renderer uses.
      const sachetEyemarks = SACHET_EYEMARK_PACK_TYPES.has(packType) ? resolveSachetEyemarkPlacements(spec) : null
      for (const placement of sachetEyemarks?.placements ?? []) {
        const ref = refs.find(item => item.index === placement.index)
        const elementIds = ref ? [ref.id] : []
        if (placement.status === "outside-cutter") {
          addMessage(context, { code: "EYEMARK_OUTSIDE_CUTTER", severity: "error", message: placement.message ?? `Eyemark ${placement.index + 1} is outside the cutter bounds.`, elementIds, fieldPath: "cutter.legacySpec.eyeMarks" })
        } else if (placement.status === "outside-zone") {
          addMessage(context, {
            code: sachetEyemarks?.mode === "pair" ? "SACHET_EYEMARK_LANE_ALIGNMENT" : "SACHET_EYEMARK_OUTSIDE_TRIM",
            severity: "warning",
            message: placement.message ?? `Eyemark ${placement.index + 1} is outside its sachet placement zone.`,
            elementIds, fieldPath: "cutter.legacySpec.eyeMarks", fixable: false
          })
        } else if (placement.status === "no-zone") {
          addMessage(context, { code: "EYEMARK_ALLOWED_ZONE_UNRESOLVED", severity: "warning", message: placement.message ?? `Eyemark ${placement.index + 1} has no sachet placement zone to check against.`, elementIds, fieldPath: "cutter.legacySpec.eyeMarks", fixable: false })
        }
      }
      if (!sachetEyemarks) for (let index = 0; index < eyeMarks.count; index += 1) {
        const ref = refs.find(item => item.index === index)
        const width = index === 1 ? eyeMarks.width2 ?? eyeMarks.width : eyeMarks.width
        const height = index === 1 ? eyeMarks.height2 ?? eyeMarks.height : eyeMarks.height
        const offsetX = index === 1 ? eyeMarks.offsetX2 ?? 0 : eyeMarks.offsetX ?? 0
        const offsetY = index === 1 ? eyeMarks.offsetY2 ?? 0 : eyeMarks.offsetY ?? 0
        const elementIds = ref ? [ref.id] : []
        if (width <= 0 || height <= 0) {
          addMessage(context, {
            code: "EYEMARK_SIZE_INVALID",
            severity: "error",
            message: `Eyemark ${index + 1} must have positive width and height.`,
            elementIds,
            fieldPath: "cutter.legacySpec.eyeMarks"
          })
          continue
        }
        if (packType === "lidding" && spec.lidding) {
          const mark = liddingEyemarkRects(spec)[index]
          if (!mark || mark.x < 0 || mark.y < 0 || mark.x + mark.width > spec.width || mark.y + mark.height > spec.height) {
            addMessage(context, {
              code: "EYEMARK_OUTSIDE_CUTTER", severity: "error",
              message: `Eyemark ${index + 1} is outside the cutter bounds.`, elementIds,
              fieldPath: "cutter.legacySpec.eyeMarks"
            })
          }
          continue
        }
        const pouchPlacement = pouchEyemarkPlacements(spec)?.placements[index]
        const rect = pouchPlacement?.rect ?? (kSealGeometry
          ? buildKSealEyeMarkRects(
              spec,
              kSealGeometry
            )[index]
          : placeEyemarkWithEdgeClearance(
              eyeMarks.position,
              index,
              eyeMarks.count,
              geometry.cutterRect,
              { width, height },
              DEFAULT_EYEMARK_EDGE_CLEARANCE_MM,
              offsetX,
              offsetY
            ))
        if (!rect) {
          continue
        }
        const placement = getEyemarkPlacementArea(
          eyeMarks.position,
          index,
          eyeMarks.count,
          geometry.cutterRect,
          geometry.seals
        )
        const positionIsResolved = PACKS_WITH_RENDERER_PARITY_EYEMARK_POSITION.has(packType)
        const allowedZoneIsResolved = hasKnownEyemarkAllowedZone(
          packType,
          eyeMarks.count,
          eyeMarks.position
        )
        if (!positionIsResolved) {
          addMessage(context, {
            code: "EYEMARK_POSITION_UNRESOLVED",
            severity: "warning",
            message: `Eyemark ${index + 1} uses pack-specific position geometry that is not exposed to validation yet.`,
            elementIds,
            fieldPath: "cutter.legacySpec.eyeMarks",
            fixable: false
          })
        } else if (pouchPlacement ? !pouchPlacement.inside : !rectIsInside(rect, geometry.cutterRect)) {
          addMessage(context, {
            code: "EYEMARK_OUTSIDE_CUTTER",
            severity: "error",
            message: `Eyemark ${index + 1} is outside the cutter bounds.`,
            elementIds,
            fieldPath: "cutter.legacySpec.eyeMarks"
          })
        } else if (
          pouchPlacement ? !pouchPlacement.allowed : allowedZoneIsResolved &&
          !canEyemarkFitInSealArea(rect, placement)
        ) {
          addMessage(context, {
            code: "EYEMARK_ALLOWED_ZONE_VIOLATION",
            severity: "error",
            message: pouchPlacement ? "Place one eyemark inside the centre gusset, or one/two eyemarks wholly inside enabled outer trim." : `Eyemark ${index + 1} does not fit inside its resolved seal/track area.`,
            elementIds,
            fieldPath: "cutter.legacySpec.eyeMarks"
          })
        } else if (!pouchPlacement && !allowedZoneIsResolved && packType !== "k-seal-pouch") {
          addMessage(context, {
            code: "EYEMARK_ALLOWED_ZONE_UNRESOLVED",
            severity: "warning",
            message: `Eyemark ${index + 1} is inside the cutter, but this pack type does not expose a reliable allowed-zone geometry yet.`,
            elementIds,
            fieldPath: "cutter.legacySpec.eyeMarks",
            fixable: false
          })
        }
      }
    }
  }

  if (kSealGeometry) {
    spec.hangerSlots?.filter(isKSealTacHole).forEach(slot => {
      if (isKSealTacOffCentre(spec, slot)) {
        addMessage(context, {
          code: "KSEAL_TAC_OFF_CENTRE",
          severity: "warning",
          message: "Consider moving TAC Hole Central",
          elementIds: [slot.id],
          fieldPath: "cutter.legacySpec.hangerSlots",
          fixable: true,
          suggestedFixId: "kseal-tac-centre"
        })
      }
    })
  }

  spec.safeZones?.forEach(zone => {
    if (zone.enabled === false) {
      return
    }
    if (zone.width <= 0 || zone.height <= 0) {
      addMessage(context, {
        code: "SAFE_ZONE_SIZE_INVALID",
        severity: "error",
        message: `Safe zone "${zone.label || zone.id}" must have positive dimensions.`,
        elementIds: [zone.id],
        fieldPath: "cutter.legacySpec.safeZones"
      })
      return
    }
    const bounds = getRotatedSafeZoneBounds(zone)
    if (!safeZoneRespectsConstruction(spec, zone)) addMessage(context, {code:"SAFE_ZONE_CONSTRUCTION_CLEARANCE",severity:"warning",message:`Safe zone "${zone.label || zone.id}" cannot maintain the entered clearance from clear strips, gusset arcs or K-Seal construction.`,elementIds:[zone.id],fieldPath:"cutter.legacySpec.safeZones"})
    const cutterMinX = -geometry.seals.left
    const cutterMinY = -geometry.seals.top
    const cutterMaxX = geometry.liveRect.width + geometry.seals.right
    const cutterMaxY = geometry.liveRect.height + geometry.seals.bottom
    if (
      bounds.minX < cutterMinX ||
      bounds.minY < cutterMinY ||
      bounds.maxX > cutterMaxX ||
      bounds.maxY > cutterMaxY
    ) {
      addMessage(context, {
        code: "SAFE_ZONE_OUTSIDE_CUTTER",
        severity: "error",
        message: `Safe zone "${zone.label || zone.id}" must stay inside the cutter area.`,
        elementIds: [zone.id],
        fieldPath: "cutter.legacySpec.safeZones"
      })
      return
    }
    if (
      bounds.minX < 0 ||
      bounds.minY < 0 ||
      bounds.maxX > geometry.liveRect.width ||
      bounds.maxY > geometry.liveRect.height
    ) {
      addMessage(context, {
        code: "SAFE_ZONE_SEAL_OVERLAP",
        severity: "warning",
        message: `Safe zone "${zone.label || zone.id}" overlaps a seal area.`,
        elementIds: [zone.id],
        fieldPath: "cutter.legacySpec.safeZones"
      })
      return
    }
    const safeZoneClearance = getSafeZoneSealClearanceMm(spec)
    if (
      bounds.minX < safeZoneClearance ||
      bounds.minY < safeZoneClearance ||
      bounds.maxX > geometry.liveRect.width - safeZoneClearance ||
      bounds.maxY > geometry.liveRect.height - safeZoneClearance
    ) {
      addMessage(context, {
        code: "SAFE_ZONE_SEAL_OVERLAP",
        severity: "warning",
        message: `Safe zone "${zone.label || zone.id}" needs ${safeZoneClearance}mm seal clearance.`,
        elementIds: [zone.id],
        fieldPath: "cutter.legacySpec.safeZones"
      })
    }
  })

  const tearRefs = getTearNotchElementRefs(project)
  const validateNotch = (
    construction: "doy" | "sachet",
    notch: { width?: number; depth?: number; offsetX?: number; offsetY?: number } | undefined
  ) => {
    if (!notch) {
      return
    }
    const ref = tearRefs.find(item => item.construction === construction)
    const elementIds = ref ? [ref.id] : []
    if ((notch.width ?? 0) <= 0 || (notch.depth ?? 0) <= 0) {
      addMessage(context, {
        code: "TEAR_NOTCH_SIZE_INVALID",
        severity: "error",
        message: `${construction.toUpperCase()} tear notch must have positive width and depth.`,
        elementIds,
        fieldPath: `cutter.legacySpec.${construction === "doy" ? "doyPouch" : "sachet"}.tearNotch`
      })
    }
    if ((notch.offsetX ?? 0) < 0 || (notch.offsetY ?? 0) < 0) {
      addMessage(context, {
        code: "TEAR_NOTCH_OFFSET_INVALID",
        severity: "error",
        message: `${construction.toUpperCase()} tear-notch offsets must be non-negative.`,
        elementIds,
        fieldPath: `cutter.legacySpec.${construction === "doy" ? "doyPouch" : "sachet"}.tearNotch`
      })
    }
  }
  validateNotch("doy", spec.doyPouch?.showTearNotch === false ? undefined : spec.doyPouch?.tearNotch)
  validateNotch("sachet", spec.sachet?.tearNotch?.enabled ? spec.sachet.tearNotch : undefined)

  // Pillow construction derives its folds from the current live width. Validate
  // those same rendered folds rather than legacy offsets from a wider preset.
  const foldLines = project.cutter.packType === "pillow-pack"
    ? resolveSymmetricPillowFoldLines(spec)
    : spec.foldLines
  foldLines?.forEach(line => {
    if (!Number.isFinite(line.offset)) {
      addMessage(context, {
        code: "FOLD_OFFSET_INVALID",
        severity: "error",
        message: `Fold line "${line.id}" offset must be finite.`,
        elementIds: [line.id],
        fieldPath: "cutter.legacySpec.foldLines"
      })
      return
    }
    if (line.orientation === "vertical" && (line.offset < 0 || line.offset > geometry.liveRect.width)) {
      addMessage(context, {
        code: "FOLD_OFFSET_INVALID",
        severity: "error",
        message: `Vertical fold line "${line.id}" must stay inside the live width.`,
        elementIds: [line.id],
        fieldPath: "cutter.legacySpec.foldLines"
      })
    }
    if (line.orientation === "horizontal") {
      addMessage(context, {
        code: "FOLD_HORIZONTAL_OFFSET_UNSUPPORTED",
        severity: "warning",
        message: `Horizontal fold line "${line.id}" is currently rendered at centre; persisted offset semantics remain incomplete.`,
        elementIds: [line.id],
        fieldPath: "cutter.legacySpec.foldLines",
        fixable: false
      })
    }
  })
}

const mapLegacyValidation = (
  project: KyzaProjectV1,
  context: MutableValidationContext
) => {
  try {
    const legacy = createPackValidator(project.cutter.packType)(project.cutter.legacySpec)
    legacy.errors.forEach(message => {
      if (
        message === "K-seal single eyemark must be at least 8mm by 4mm." ||
        message === "K-seal dual eyemarks must each be at least 5mm by 4mm."
      ) {
        // Structured K-Seal eyemark rules above already emit element-linked issues.
        return
      }
      const unresolvedSealClearance = /^Seal clearance must be at least [\d.]+mm\.$/.test(message)
      const sealDimensionError = message === "Seal must be greater than 0mm."
      const impossibleLiveArea =
        message === "Cutter width must be greater than total left/right seals." ||
        message === "Cutter height must be greater than total top/bottom seals."
      const safeZoneSealOverlap =
        message.startsWith("Safe zone ") && message.includes(" seal clearance.")
      addMessage(context, {
        code: unresolvedSealClearance
          ? "SEAL_CLEARANCE_UNRESOLVED"
          : sealDimensionError
            ? "SEAL_INVALID_DIMENSION"
            : impossibleLiveArea
              ? "SEAL_LIVE_AREA_IMPOSSIBLE"
              : safeZoneSealOverlap
                ? "SAFE_ZONE_SEAL_OVERLAP"
                : "PACK_VALIDATION_ERROR",
        severity: unresolvedSealClearance ? "warning" : "error",
        message,
        elementIds: [],
        fieldPath: unresolvedSealClearance
          ? "cutter.legacySpec.sealClearance"
          : sealDimensionError || impossibleLiveArea
            ? "cutter.legacySpec.seals"
            : safeZoneSealOverlap
              ? "cutter.legacySpec.safeZones"
              : "cutter.legacySpec",
        ...(unresolvedSealClearance ? { fixable: false } : {})
      })
    })
    legacy.warnings?.forEach(message => {
      addMessage(context, {
        code: "PACK_VALIDATION_WARNING",
        severity: "warning",
        message,
        elementIds: [],
        fieldPath: "cutter.legacySpec"
      })
    })
  } catch {
    addMessage(context, {
      code: "VALIDATION_ENGINE_FAILURE",
      severity: "error",
      message: "The existing pack validator could not evaluate this project safely.",
      elementIds: [],
      fieldPath: "cutter.legacySpec"
    })
  }
}

export const validateKyzaProject = (value: unknown): ValidationResult => {
  const identity = getRawProjectIdentity(value)
  const context: MutableValidationContext = {
    ...identity,
    messages: []
  }
  inspectRawIdentity(value, context)
  const parsed = parseKyzaProject(value)
  if (parsed.ok === false) {
    addMessage(context, {
      code: "PROJECT_SCHEMA_INVALID",
      severity: "error",
      message: parsed.errors.join(" "),
      elementIds: [],
      fieldPath: "project"
    })
    return createResult(context)
  }

  const project = parsed.value
  context.projectId = project.id
  context.revision = String(project.revision)
  context.packType = project.cutter.packType
  parsed.warnings?.forEach(message => {
    addMessage(context, {
      code: "ELEMENT_IDENTITY_REPAIRED",
      severity: "warning",
      message,
      elementIds: [],
      fieldPath: "cutter.identityMap",
      fixable: true,
      suggestedFixId: "normalise-element-identity"
    })
  })
  validateStructuredSpec(project, context)
  mapLegacyValidation(project, context)
  return createResult(context)
}

export const validateLegacyFlowwrapSpec = validateKyzaProject

export type ValidationDebugSnapshot = {
  packType?: string
  eyemarks: Array<{
    validationCodes: string[]
    severity: ValidationMessage["severity"] | "none"
    elementIds: string[]
    fieldPath: string
    eyemarkCount: number
    resolvedSize: { width: number; height: number }
    resolvedPosition: Rect
    resolvedSealZones: ReturnType<typeof resolveFlowwrapGeometry>["sealRects"]
    resolvedAllowedZone: Rect | null
    definite: boolean
  }>
  seal: {
    validationCodes: string[]
    severity: ValidationMessage["severity"] | "none"
    cutterBounds: Rect
    rawSealValues: ReturnType<typeof resolveSealSizes>
    resolvedSealZones: ReturnType<typeof resolveFlowwrapGeometry>["sealRects"]
    resolvedLiveArea: Rect
    innerSealBoundary: Rect
    bleedValue?: number
    safeZonesChecked: string[]
    definite: boolean
    blocksExport: boolean
  } | null
}

const highestSeverity = (messages: ValidationMessage[]) =>
  messages.some(message => message.severity === "error")
    ? "error" as const
    : messages.some(message => message.severity === "warning")
      ? "warning" as const
      : messages.some(message => message.severity === "info")
        ? "info" as const
        : "none" as const

export const getValidationDebugSnapshot = (value: unknown): ValidationDebugSnapshot => {
  const validation = validateForExport(value)
  const parsed = parseKyzaProject(value)
  if (parsed.ok === false) {
    return {
      packType: getRawProjectIdentity(value).packType,
      eyemarks: [],
      seal: null
    }
  }

  const project = parsed.value
  const packType = project.cutter.packType
  const spec = project.cutter.legacySpec
  const { geometry, kSealGeometry } = resolvePackValidationGeometry(spec, packType)
  const refs = getEyemarkElementRefs(project).filter(ref => ref.status === "active")
  const eyeMarks = spec.eyeMarks
  const sachetEyemarks = SACHET_EYEMARK_PACK_TYPES.has(packType) ? resolveSachetEyemarkPlacements(spec) : null
  const eyemarks = eyeMarks && (eyeMarks.count === 1 || eyeMarks.count === 2)
    ? Array.from({ length: eyeMarks.count }, (_, index) => {
        const ref = refs.find(item => item.index === index)
        const sachetPlacement = sachetEyemarks?.placements.find(item => item.index === index)
        if (sachetEyemarks && sachetPlacement) {
          // Sachet coordinates are reported relative to the outer cutter edge (trim included).
          const toContent = (rect: { x: number; y: number; width: number; height: number }) => ({ ...rect, x: rect.x - sachetEyemarks.frame.originX, y: rect.y - sachetEyemarks.frame.originY })
          const messages = validation.messages.filter(message =>
            (message.code.startsWith("EYEMARK_") || message.code.startsWith("SACHET_EYEMARK_")) &&
            (ref ? message.elementIds.includes(ref.id) : message.elementIds.length === 0)
          )
          return {
            validationCodes: messages.map(message => message.code),
            severity: highestSeverity(messages),
            elementIds: ref ? [ref.id] : [],
            fieldPath: "cutter.legacySpec.eyeMarks",
            eyemarkCount: eyeMarks.count,
            resolvedSize: { width: sachetPlacement.rect.width, height: sachetPlacement.rect.height },
            resolvedPosition: toContent(sachetPlacement.rect),
            resolvedSealZones: geometry.sealRects,
            resolvedAllowedZone: sachetPlacement.allowedZones[0] ? toContent(sachetPlacement.allowedZones[0]) : null,
            definite: sachetPlacement.status !== "no-zone"
          }
        }
        const width = index === 1 ? eyeMarks.width2 ?? eyeMarks.width : eyeMarks.width
        const height = index === 1 ? eyeMarks.height2 ?? eyeMarks.height : eyeMarks.height
        const offsetX = index === 1 ? eyeMarks.offsetX2 ?? 0 : eyeMarks.offsetX ?? 0
        const offsetY = index === 1 ? eyeMarks.offsetY2 ?? 0 : eyeMarks.offsetY ?? 0
        const pouchZones=pouchEyemarkPlacements(spec)
        const resolvedPosition = pouchZones?.placements[index]?.rect ?? (kSealGeometry
          ? buildKSealEyeMarkRects(spec, kSealGeometry)[index]
          : placeEyemarkWithEdgeClearance(
              eyeMarks.position,
              index,
              eyeMarks.count,
              geometry.cutterRect,
              { width, height },
              DEFAULT_EYEMARK_EDGE_CLEARANCE_MM,
              offsetX,
              offsetY
            ))
        if (!resolvedPosition) {
          return null
        }
        const positionIsResolved = PACKS_WITH_RENDERER_PARITY_EYEMARK_POSITION.has(packType)
        const allowedZone = pouchZones ? (eyeMarks.count===1 ? pouchZones.center : pouchZones.bands[index]??null) : hasKnownEyemarkAllowedZone(
          packType,
          eyeMarks.count,
          eyeMarks.position
        )
          ? getEyemarkPlacementArea(
              eyeMarks.position,
              index,
              eyeMarks.count,
              geometry.cutterRect,
              geometry.seals
            )
          : null
        const messages = validation.messages.filter(message =>
          message.code.startsWith("EYEMARK_") &&
          (ref ? message.elementIds.includes(ref.id) : message.elementIds.length === 0)
        )
        return {
          validationCodes: messages.map(message => message.code),
          severity: highestSeverity(messages),
          elementIds: ref ? [ref.id] : [],
          fieldPath: "cutter.legacySpec.eyeMarks",
          eyemarkCount: eyeMarks.count,
          resolvedSize: { width, height },
          resolvedPosition,
          resolvedSealZones: geometry.sealRects,
          resolvedAllowedZone: allowedZone ? cloneRect(allowedZone) : null,
          definite:
            positionIsResolved &&
            (packType === "k-seal-pouch" ||
              Boolean(allowedZone) ||
              !rectIsInside(resolvedPosition, geometry.cutterRect))
        }
      }).filter((item): item is NonNullable<typeof item> => item !== null)
    : []

  const sealMessages = validation.messages.filter(message =>
    message.code.startsWith("SEAL_") ||
    message.code.startsWith("SAFE_ZONE_SEAL_") ||
    message.code === "BLEED_SEAL_GEOMETRY_UNRESOLVED"
  )
  return {
    packType,
    eyemarks,
    seal: {
      validationCodes: sealMessages.map(message => message.code),
      severity: highestSeverity(sealMessages),
      cutterBounds: cloneRect(geometry.cutterRect),
      rawSealValues: resolveSealSizes(spec),
      resolvedSealZones: geometry.sealRects,
      resolvedLiveArea: cloneRect(geometry.liveRect),
      innerSealBoundary: cloneRect(geometry.liveRect),
      ...(spec.bleed !== undefined ? { bleedValue: spec.bleed } : {}),
      safeZonesChecked: (spec.safeZones ?? [])
        .filter(zone => zone.enabled !== false)
        .map(zone => zone.id),
      definite: SUPPORTED_PACK_TYPES.has(packType),
      blocksExport: sealMessages.some(message => message.severity === "error")
    }
  }
}

export const validateForExport = (value: unknown): ValidationResult => {
  const result = validateKyzaProject(value)
  const messages = result.messages.map(message =>
    message.code === "ELEMENT_ID_MISSING"
      ? {
          ...message,
          severity: "error" as const,
          message: `${message.message} Export requires persisted critical element IDs.`
        }
      : message
  )
  return {
    ...result,
    valid: !messages.some(message => message.severity === "error"),
    messages
  }
}

export const getBlockingValidationMessages = (result: ValidationResult) =>
  result.messages.filter(message => message.severity === "error")

export const getWarnings = (result: ValidationResult) =>
  result.messages.filter(message => message.severity === "warning")

export const canExportProject = (value: unknown) => validateForExport(value).valid

export const getExportBlockingReasons = (value: unknown) =>
  getBlockingValidationMessages(validateForExport(value)).map(message => message.message)
