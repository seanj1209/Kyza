import { createBaseSpecDefaults, createEyeMarkDefaults } from "../core/model/parameterSchema"
import { LIDDING_DEFAULTS, liddingCutterSize, resolveLiddingLayout, validateLiddingSpec } from "../constraints/lidding"
import { renderLidding } from "../renderers/liddingSvg"
import type { FlowwrapSpec, RenderOptions } from "../types/flowwrap"
import type { PackModule } from "./packModule"

export const liddingPack: PackModule<FlowwrapSpec, ReturnType<typeof resolveLiddingLayout>> = {
  id: "lidding", name: "Lidding", version: 1,
  getDefaults: () => {
    const eyeMarks = createEyeMarkDefaults({ count: 2, position: "top", width: 10, height: 6, width2: 10, height2: 6 })
    return {
    ...createBaseSpecDefaults({ ...liddingCutterSize(LIDDING_DEFAULTS, eyeMarks), seal: 0, sealClearance: 0 }),
    seals: { top: 0, bottom: 0, left: 0, right: 0 },
    substrate: "clear", safeZones: [], windows: [], hangerSlots: [], halfMoonCutouts: [],
    attributeBoxes: [], foldLines: [],
    eyeMarks,
    lidding: { ...LIDDING_DEFAULTS }
  } },
  resolveGeometry: resolveLiddingLayout,
  validate: validateLiddingSpec,
  render: (spec, options: RenderOptions = {}) => renderLidding(spec, options),
}
