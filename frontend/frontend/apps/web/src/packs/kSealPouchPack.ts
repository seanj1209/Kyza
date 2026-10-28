import {
  createDefaultHalfMoonCutouts,
  createDefaultHangerSlots,
  createDefaultSafeZones,
  createDefaultWindows,
  createEmptyAttributeBoxPreset
} from "../defaults"
import {
  createBaseSpecDefaults,
  createDoyPouchDefaults,
  createEyeMarkDefaults,
  createKSealDefaults
} from "../core/model/parameterSchema"
import { composeKSealPack } from "../core/packComposer"
import type { PackModule } from "./packModule"
import { renderResolvedKSealPouch } from "../renderers/kSealPouchSvg"
import { resolveKSealPouchGeometry } from "../geometry/kSealPouchGeometry"
import type { FlowwrapSpec, RenderOptions } from "../types/flowwrap"

const DEFAULT_K_SEAL_SPEC: FlowwrapSpec = {
  ...createBaseSpecDefaults(
    { width: 510, height: 190, seal: 7.5 },
    { includeSealClearance: false }
  ),
  seals: {
    top: 7.5,
    bottom: 7.5,
    left: 15,
    right: 15
  },
  safeZones: createDefaultSafeZones(),
  windows: createDefaultWindows(),
  halfMoonCutouts: createDefaultHalfMoonCutouts(),
  attributeBoxes: createEmptyAttributeBoxPreset(),
  hangerSlots: createDefaultHangerSlots(),
  eyeMarks: createEyeMarkDefaults({ position: "centre", width: 15, height: 5 }),
  kSealPouch: createKSealDefaults({
    midSectionWidthRatio: 83 / 480,
    shoulderHeightRatio: 23 / 205
  }),
  doyPouch: createDoyPouchDefaults({
    panelWidths: {
      left: 160,
      center: 100,
      right: 160
    },
    gussetDepth: 35,
    showGusset: false,
    showCenterBox: false,
    showOval: false
  })
}

export const kSealPouchPack: PackModule<
  FlowwrapSpec,
  ReturnType<typeof resolveKSealPouchGeometry>
> = {
  id: "k-seal-pouch",
  name: "K Seal Pouch",
  version: 1,
  getDefaults: () => ({ ...DEFAULT_K_SEAL_SPEC }),
  resolveGeometry: spec => composeKSealPack(spec).geometry,
  validate: spec => composeKSealPack(spec).validation,
  render: (spec, options: RenderOptions = {}) => {
    const composed = composeKSealPack(spec)
    return renderResolvedKSealPouch(spec, composed.layout, options)
  }
}
