import { perfPatternExceedsSeal } from "../../../constraints/perfSealBounds"
import { validateFlowwrapSpec } from "../../../constraints/flowwrap"
import type { FoldLineSpec } from "../../../geometry/foldLines"
import { buildPerfCenters } from "../../../geometry/perfs"
import type { FlowwrapGeometry } from "../../../geometry/flowwrapGeometry"
import { resolveFlowwrapGeometry } from "../../../geometry/flowwrapGeometry"
import {
  resolveDoyLayout,
  type ResolvedDoyLayout
} from "./resolveDoyLayout"
import type {
  AttributeBoxSpec,
  FlowwrapSpec,
  HangerSlotSpec,
  SafeZoneSpec,
  WindowSpec
} from "../../../types/flowwrap"

const DEFAULT_CANVAS_MARGIN = 80

function resolveFoldLines(spec: FlowwrapSpec): FoldLineSpec[] {
  return spec.foldLines ?? []
}

export type ResolvedFlowwrapLayout = {
  validationErrors: string[]
  warnings: string[]
  geometry: FlowwrapGeometry
  cutterWidth: number
  cutterHeight: number
  seals: FlowwrapGeometry["seals"]
  bleedInset: number
  margin: number
  originX: number
  originY: number
  liveOriginX: number
  liveOriginY: number
  liveWidth: number
  liveHeight: number
  totalWidth: number
  totalHeight: number
  substrate: NonNullable<FlowwrapSpec["substrate"]>
  substrateFill: string
  substrateOpacity: number
  safeZones: SafeZoneSpec[]
  windows: WindowSpec[]
  attributeBoxes: AttributeBoxSpec[]
  hangerSlots: HangerSlotSpec[]
  foldLines: FoldLineSpec[]
  doyLayout: ResolvedDoyLayout | null
  doyOval: { centerX: number; width: number } | null
  perfCenters: ReturnType<typeof buildPerfCenters> | null
  perfMaxRadius: number | null
  perfPatternOverflow: boolean
}

export function resolveFlowwrapLayout(spec: FlowwrapSpec,packId?:string): ResolvedFlowwrapLayout {
  const validation = validateFlowwrapSpec(spec,packId)
  const doyTrimWidth = spec.doyPouch?.trimEnabled ?? false
    ? Math.max(0, spec.doyPouch?.trim ?? 0)
    : 0
  const geometrySpec = doyTrimWidth > 0
    ? { ...spec, width: spec.width + doyTrimWidth * 2 }
    : spec
  const geometry = resolveFlowwrapGeometry(geometrySpec)
  const cutterWidth = geometry.cutterRect.width
  const cutterHeight = geometry.cutterRect.height
  const seals = geometry.seals
  const bleedInset = geometry.bleedInset
  const margin = DEFAULT_CANVAS_MARGIN
  const originX = margin
  const originY = margin
  const liveOriginX = originX + geometry.liveRect.x + doyTrimWidth
  const liveOriginY = originY + geometry.liveRect.y
  const liveWidth = Math.max(0, geometry.liveRect.width - doyTrimWidth * 2)
  const liveHeight = geometry.liveRect.height
  const totalWidth = cutterWidth + margin * 2
  const totalHeight = cutterHeight + margin * 2
  const substrate = spec.substrate ?? "clear"
  const substrateFill =
    substrate === "paper"
      ? "#e8e1d6"
      : substrate === "white"
        ? "#f5f5f5"
        : "#b9dfe8"
  const substrateOpacity = substrate === "clear" ? 0.6 : 0.35
  const safeZones = spec.safeZones ?? []
  const windows = spec.windows ?? []
  const attributeBoxes = spec.attributeBoxes ?? []
  const hangerSlots = spec.hangerSlots ?? []
  const foldLines = resolveFoldLines(spec)
  const doyLayout =
    spec.doyPouch && (spec.doyPouch?.showGusset ?? true)
      ? resolveDoyLayout(geometrySpec, originX, liveOriginX, liveWidth, cutterWidth)
      : null
  const doyOval = doyLayout
    ? {
        centerX: doyLayout.ovalCenterX,
        width: doyLayout.ovalWidth
      }
    : null
  const perfCenters = spec.perfs
    ? buildPerfCenters(
        spec.perfs,
        liveOriginX,
        liveOriginY,
        liveWidth,
        liveHeight,
        originX,
        originY,
        cutterWidth,
        cutterHeight
      )
    : null
  const perfMaxRadius = spec.perfs
    ? Math.max(
        spec.perfs.diameter,
        ...(spec.perfs.lanes?.map(lane => lane.diameter ?? spec.perfs!.diameter) ?? [])
      ) / 2
    : null
  const perfPatternOverflow =
    spec.perfs?.mode === "regulated" &&
    perfCenters !== null &&
    perfMaxRadius !== null
      ? perfPatternExceedsSeal(
          perfCenters,
          perfMaxRadius,
          liveOriginX,
          liveOriginY,
          liveWidth,
          liveHeight
        )
      : false

  return {
    validationErrors: validation.errors ?? [],
    warnings: validation.warnings ?? [],
    geometry,
    cutterWidth,
    cutterHeight,
    seals,
    bleedInset,
    margin,
    originX,
    originY,
    liveOriginX,
    liveOriginY,
    liveWidth,
    liveHeight,
    totalWidth,
    totalHeight,
    substrate,
    substrateFill,
    substrateOpacity,
    safeZones,
    windows,
    attributeBoxes,
    hangerSlots,
    foldLines,
    doyLayout,
    doyOval,
    perfCenters,
    perfMaxRadius,
    perfPatternOverflow
  }
}
