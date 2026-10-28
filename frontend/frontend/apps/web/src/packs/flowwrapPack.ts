import {
  createDefaultHalfMoonCutouts,
  createDefaultHangerSlots,
  createDefaultSafeZones,
  createDefaultWindows,
  createStandardPouchAttributeBoxPreset
} from "../defaults"
import {
  createBaseSpecDefaults,
  createEyeMarkDefaults,
  PARAMETER_ENUMS
} from "../core/model/parameterSchema"
import { composeFlowwrapPack } from "../core/packComposer"
import { resolveFlowwrapGeometry } from "../geometry/flowwrapGeometry"
import { renderResolvedFlowwrap } from "../renderers/flowwrapSvg"
import type { FlowwrapSpec, RenderOptions } from "../types/flowwrap"
import type { PackModule } from "./packModule"

const DEFAULT_FLOWWRAP_SPEC: FlowwrapSpec = {
  ...createBaseSpecDefaults({ sealClearance: 5 }),
  safeZones: createDefaultSafeZones(),
  windows: createDefaultWindows(),
  halfMoonCutouts: createDefaultHalfMoonCutouts(),
  attributeBoxes: createStandardPouchAttributeBoxPreset(),
  eyeMarks: createEyeMarkDefaults({
    count: 2,
    position: PARAMETER_ENUMS.eyeMarkPositionDouble.default,
    width: 15,
    height: 5,
    width2: 15,
    height2: 5,
    offsetY: 7.5
  }),
  hangerSlots: createDefaultHangerSlots()
}

export const flowwrapPack: PackModule<FlowwrapSpec, ReturnType<typeof resolveFlowwrapGeometry>> = {
  id: "flowwrap",
  name: "Flowwrap",
  version: 1,
  getDefaults: () => ({ ...DEFAULT_FLOWWRAP_SPEC }),
  resolveGeometry: spec => composeFlowwrapPack(spec).geometry,
  validate: spec => composeFlowwrapPack(spec).validation,
  render: (spec, options: RenderOptions = {}) => {
    const composed = composeFlowwrapPack(spec)
    return renderResolvedFlowwrap(spec, composed.layout, options)
  }
}
