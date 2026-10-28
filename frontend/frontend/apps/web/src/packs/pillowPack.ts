import {
  createDefaultHalfMoonCutouts,
  createDefaultHangerSlots,
  createDefaultSafeZones,
  createDefaultWindows,
  createStandardPouchAttributeBoxPreset
} from "../defaults"
import {
  createBaseSpecDefaults,
  createEyeMarkDefaults
} from "../core/model/parameterSchema"
import { composePillowPack } from "../core/packComposer"
import { resolveFlowwrapGeometry } from "../geometry/flowwrapGeometry"
import { DEFAULT_PILLOW_PACK_SEAL_MM } from "../geometry/eyemarkPlacement"
import { renderResolvedFlowwrap } from "../renderers/flowwrapSvg"
import type { FlowwrapSpec, RenderOptions } from "../types/flowwrap"
import type { PackModule } from "./packModule"

const DEFAULT_PILLOW_PACK_SPEC: FlowwrapSpec = {
  ...createBaseSpecDefaults({
    width: 440,
    height: 200,
    seal: DEFAULT_PILLOW_PACK_SEAL_MM,
    sealClearance: 3
  }),
  safeZones: createDefaultSafeZones(),
  windows: createDefaultWindows(),
  halfMoonCutouts: createDefaultHalfMoonCutouts(),
  attributeBoxes: createStandardPouchAttributeBoxPreset(),
  eyeMarks: createEyeMarkDefaults(),
  hangerSlots: createDefaultHangerSlots(),
  foldLines: [
    {
      id: "pillow-fold-left",
      orientation: "vertical",
      offset: (440 - DEFAULT_PILLOW_PACK_SEAL_MM * 2) / 4
    },
    {
      id: "pillow-fold-right",
      orientation: "vertical",
      offset: ((440 - DEFAULT_PILLOW_PACK_SEAL_MM * 2) * 3) / 4
    }
  ]
}

export const pillowPack: PackModule<
  FlowwrapSpec,
  ReturnType<typeof resolveFlowwrapGeometry>
> = {
  id: "pillow-pack",
  name: "Pillow Pack",
  version: 1,
  getDefaults: () => ({ ...DEFAULT_PILLOW_PACK_SPEC }),
  resolveGeometry: spec => composePillowPack(spec).geometry,
  validate: spec => {
    const composed = composePillowPack(spec)
    return {
      ...composed.validation,
      warnings: composed.warnings
    }
  },
  render: (spec, options: RenderOptions = {}) => {
    const composed = composePillowPack(spec)
    return renderResolvedFlowwrap(spec, composed.layout, options)
  }
}
