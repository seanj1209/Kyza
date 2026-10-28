import {
  createBarcodeAttributeBoxPreset,
  createDefaultHalfMoonCutouts,
  createDefaultHangerSlots,
  createDefaultSafeZones,
  createDefaultWindows
} from "../defaults"
import {
  createBaseSpecDefaults,
  createEyeMarkDefaults,
  createSachetDefaults
} from "../core/model/parameterSchema"
import { composeSachetPack } from "../core/packComposer"
import { buildSachetConstruction } from "../geometry/sachetConstruction"
import { resolveFlowwrapGeometry } from "../geometry/flowwrapGeometry"
import { renderResolvedSachet } from "../renderers/sachetSvg"
import type { FlowwrapSpec, RenderOptions } from "../types/flowwrap"
import type { PackModule } from "./packModule"
import { SACHET_DEFAULT_SEAL_CLEARANCE_MM } from "../constraints/flowwrap"
import { initialiseSachetSteps } from "../../../../packages/cutter-engine/actions/sachetSteps"

export const SACHET_3SS_DEFAULT_TRIM_MM = 8

const createDefaultSachetSpec = (): FlowwrapSpec => {
  const { width, height, seals, foldLines } = buildSachetConstruction({
    width: 76,
    height: 100,
    foldLinePrefix: "sachet-fold"
  })
  return {
    ...createBaseSpecDefaults({
      width,
      height,
      seal: 3,
      sealClearance: SACHET_DEFAULT_SEAL_CLEARANCE_MM
    }),
    seals,
    safeZones: createDefaultSafeZones(),
    windows: createDefaultWindows(),
    halfMoonCutouts: createDefaultHalfMoonCutouts(),
    attributeBoxes: createBarcodeAttributeBoxPreset(),
    // Amends v12: one existing-convention 5 x 5 mm mark. buildEyeMarkRects keeps
    // DEFAULT_EYEMARK_EDGE_CLEARANCE_MM (1.5 mm) from the outer edge of the trim cutter.
    eyeMarks: createEyeMarkDefaults({
      count: 1,
      position: "top-left",
      width: 5,
      height: 5
    }),
    hangerSlots: createDefaultHangerSlots(),
    foldLines,
    // Amends v12: 3SS loads with an 8 mm Left trim (supersedes the earlier no-trim default).
    sachet: createSachetDefaults({ trimPosition: "left", trimWidth: SACHET_3SS_DEFAULT_TRIM_MM })
  }
}

export const sachetPack: PackModule<
  FlowwrapSpec,
  ReturnType<typeof resolveFlowwrapGeometry>
> = {
  id: "sachet-3-side-seal",
  name: "3-Side Seal Sachet",
  version: 1,
  getDefaults: () => initialiseSachetSteps(createDefaultSachetSpec()),
  resolveGeometry: spec => composeSachetPack("sachet-3-side-seal", spec).geometry,
  validate: spec => composeSachetPack("sachet-3-side-seal", spec).validation,
  render: (spec, options: RenderOptions = {}) => {
    const composed = composeSachetPack("sachet-3-side-seal", spec)
    return renderResolvedSachet(spec, composed.layout, options)
  }
}
