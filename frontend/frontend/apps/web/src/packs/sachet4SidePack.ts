import {
  createDefaultHalfMoonCutouts,
  createDefaultHangerSlots,
  createDefaultSafeZones,
  createSachetBackAttributeBoxPreset,
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

const createDefaultSachet4SideSpec = (): FlowwrapSpec => {
  const { width, height, seals, foldLines } = buildSachetConstruction({
    width: 50,
    height: 100
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
    attributeBoxes: createSachetBackAttributeBoxPreset(),
    eyeMarks: createEyeMarkDefaults({
      position: "top-left",
      width: 5,
      height: 5
    }),
    hangerSlots: createDefaultHangerSlots(),
    foldLines,
    sachet: createSachetDefaults({
      trackWidth: 0,
      stepEnabled: true,
      stepCount: 2,
      stepPair: true,
      showOverallMeasure: true,
      showTrackMeasure: false,
      showLaneLabels: true,
      tearNotch: {
        enabled: false,
        style: "triangle",
        offsetX: 6,
        width: 6,
        depth: 3
      }
    })
  }
}

export const sachet4SidePack: PackModule<
  FlowwrapSpec,
  ReturnType<typeof resolveFlowwrapGeometry>
> = {
  id: "sachet-4-side-seal",
  name: "4-Side Seal Sachet",
  version: 1,
  getDefaults: () => initialiseSachetSteps(createDefaultSachet4SideSpec()),
  resolveGeometry: spec => composeSachetPack("sachet-4-side-seal", spec).geometry,
  validate: spec => composeSachetPack("sachet-4-side-seal", spec).validation,
  render: (spec, options: RenderOptions = {}) => {
    const composed = composeSachetPack("sachet-4-side-seal", spec)
    return renderResolvedSachet(spec, composed.layout, options)
  }
}
