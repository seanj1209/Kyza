import {
  createDefaultHalfMoonCutouts,
  createDefaultHangerSlots,
  createDefaultSafeZones,
  createDefaultWindows,
  createStandardPouchAttributeBoxPreset
} from "../defaults"
import {
  createBaseSpecDefaults,
  createDoyPouchDefaults,
  createEyeMarkDefaults,
  PARAMETER_DEFAULTS
} from "../core/model/parameterSchema"
import { composeFlowwrapPack } from "../core/packComposer"
import { resolveFlowwrapGeometry } from "../geometry/flowwrapGeometry"
import { renderResolvedFlowwrap } from "../renderers/flowwrapSvg"
import type { FlowwrapSpec, RenderOptions } from "../types/flowwrap"
import type { PackModule } from "./packModule"

const DEFAULT_DOY_POUCH_SPEC: FlowwrapSpec = {
  ...createBaseSpecDefaults({ width: 580, height: 140, seal: 7.5 }),
  seals: {
    left: 0,
    right: 0
  },
  safeZones: createDefaultSafeZones(),
  windows: createDefaultWindows(),
  halfMoonCutouts: createDefaultHalfMoonCutouts(),
  attributeBoxes: createStandardPouchAttributeBoxPreset(),
  eyeMarks: createEyeMarkDefaults({ position: "centre" }),
  hangerSlots: createDefaultHangerSlots(),
  doyPouch: createDoyPouchDefaults({
    panelWidths: {
      left: 250,
      center: 80,
      right: 250
    },
    ovalWidth: PARAMETER_DEFAULTS.doy.ovalWidth,
    ovalOffsetX: PARAMETER_DEFAULTS.doy.ovalOffsetX,
    centerOffsetX: PARAMETER_DEFAULTS.doy.centerOffsetX
  })
}

export const doyPouchPack: PackModule<
  FlowwrapSpec,
  ReturnType<typeof resolveFlowwrapGeometry>
> = {
  id: "doy-pouch",
  name: "DOY Pouch",
  version: 1,
  getDefaults: () => ({ ...DEFAULT_DOY_POUCH_SPEC }),
  resolveGeometry: spec => composeFlowwrapPack(spec).geometry,
  validate: spec => composeFlowwrapPack(spec).validation,
  render: (spec, options: RenderOptions = {}) => {
    const composed = composeFlowwrapPack(spec)
    return renderResolvedFlowwrap(spec, composed.layout, options)
  }
}
