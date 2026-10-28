import {
  createDefaultHalfMoonCutouts,
  createDefaultHangerSlots,
  createDefaultSafeZones,
  createDefaultWindows,
  createEmptyAttributeBoxPreset
} from "../defaults"
import { createBaseSpecDefaults } from "../core/model/parameterSchema"
import { composePlainWebPack } from "../core/packComposer"
import { resolveFlowwrapGeometry } from "../geometry/flowwrapGeometry"
import { renderResolvedPlainWeb } from "../renderers/plainWebSvg"
import type { FlowwrapSpec } from "../types/flowwrap"
import type { PackModule } from "./packModule"

const DEFAULT_PLAIN_WEB_SPEC: FlowwrapSpec = {
  ...createBaseSpecDefaults({ width: 460, height: 160, seal: 0, sealClearance: 0 }),
  seals: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  },
  safeZones: createDefaultSafeZones(),
  windows: createDefaultWindows(),
  halfMoonCutouts: createDefaultHalfMoonCutouts(),
  attributeBoxes: createEmptyAttributeBoxPreset(),
  hangerSlots: createDefaultHangerSlots(),
  plainWeb: {
    guideLines: []
  }
}

export const plainWebPack: PackModule<
  FlowwrapSpec,
  ReturnType<typeof resolveFlowwrapGeometry>
> = {
  id: "plain-web",
  name: "Plain Web",
  version: 1,
  getDefaults: () => ({ ...DEFAULT_PLAIN_WEB_SPEC }),
  resolveGeometry: spec => composePlainWebPack(spec).geometry,
  validate: spec => composePlainWebPack(spec).validation,
  render: spec => {
    const composed = composePlainWebPack(spec)
    return renderResolvedPlainWeb(composed.layout)
  }
}
