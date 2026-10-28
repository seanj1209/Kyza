import {
  createDefaultHalfMoonCutouts,
  createDefaultHangerSlots,
  createDefaultSafeZones,
  createDefaultWindows,
  createEmptyAttributeBoxPreset,
} from "../defaults"
import { createBaseSpecDefaults, createEyeMarkDefaults, createSachetDefaults } from "../core/model/parameterSchema"
import { composeSachetPack, composePlainWebPack } from "../core/packComposer"
import { renderResolvedSachet } from "../renderers/sachetSvg"
import { renderSideSealPouch } from "../renderers/sideSealPouchSvg"
import { renderResolvedPlainWeb } from "../renderers/plainWebSvg"
import type { FlowwrapSpec, RenderOptions } from "../types/flowwrap"
import type { PackModule } from "./packModule"

export const SIDE_POUCH_TRIM_MM = 15
export const SIDE_POUCH_SEAL_MM = 7.5

const sidePouchDefaults = (sides: 2 | 3): FlowwrapSpec => ({
  ...createBaseSpecDefaults({ width: 190, height: 250, seal: SIDE_POUCH_SEAL_MM, sealClearance: 5 }),
  seals: { top: 0, bottom: sides === 3 ? SIDE_POUCH_SEAL_MM : 0, left: SIDE_POUCH_SEAL_MM, right: SIDE_POUCH_SEAL_MM },
  substrate: "clear",
  safeZones: createDefaultSafeZones(),
  windows: createDefaultWindows(),
  halfMoonCutouts: createDefaultHalfMoonCutouts(),
  attributeBoxes: createEmptyAttributeBoxPreset(),
  hangerSlots: createDefaultHangerSlots(),
  eyeMarks: createEyeMarkDefaults({ count: 2, position: "top", width: 10, height: 6, width2: 10, height2: 6 }),
  sachet: createSachetDefaults({ trimPosition: "both", trimWidth: SIDE_POUCH_TRIM_MM, trackWidth: 0, stepEnabled: false, stepCount: 1, tearNotch: { enabled: false } }),
  sideSealPouch: { sides, trimEnabled: true, trimWidth: SIDE_POUCH_TRIM_MM, sealSync: sides === 3 },
})

const sidePouchModule = (sides: 2 | 3): PackModule<FlowwrapSpec, ReturnType<typeof composeSachetPack>["geometry"]> => {
  const id = sides === 2 ? "2-side-seal-pouch" : "3-side-seal-pouch"
  const composed = (spec: FlowwrapSpec) => composeSachetPack(id, spec)
  return {
    id,
    name: sides === 2 ? "2-Side Seal Pouch" : "3-Side Seal Pouch",
    version: 1,
    getDefaults: () => sidePouchDefaults(sides),
    resolveGeometry: spec => composed(spec).geometry,
    validate: spec => composed(spec).validation,
    render: (spec, options: RenderOptions = {}) => renderSideSealPouch(spec, options),
  }
}

export const twoSideSealPouchPack = sidePouchModule(2)
export const threeSideSealPouchPack = sidePouchModule(3)

export const plainFilmPack: PackModule<FlowwrapSpec, ReturnType<typeof composePlainWebPack>["geometry"]> = {
  id: "plain-film",
  name: "Plain Film",
  version: 1,
  getDefaults: () => ({
    ...createBaseSpecDefaults({ width: 400, height: 240, seal: 0, sealClearance: 0 }),
    seals: { top: 0, bottom: 0, left: 0, right: 0 },
    substrate: "clear",
    safeZones: [],
    windows: [],
    halfMoonCutouts: [],
    attributeBoxes: [],
    hangerSlots: [],
    eyeMarks: createEyeMarkDefaults({ count: 0, position: "top-left", width: 10, height: 6 }),
    plainWeb: { guideLines: [] },
  }),
  resolveGeometry: spec => composePlainWebPack(spec).geometry,
  validate: spec => composePlainWebPack(spec).validation,
  render: spec => renderResolvedPlainWeb(composePlainWebPack(spec).layout, spec),
}
