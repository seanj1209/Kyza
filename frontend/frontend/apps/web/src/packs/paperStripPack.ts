import {
  createStandardPouchAttributeBoxPreset
} from "../defaults"
import { createBaseSpecDefaults } from "../core/model/parameterSchema"
import { composePaperStripPack } from "../core/packComposer"
import { resolveFlowwrapGeometry } from "../geometry/flowwrapGeometry"
import { renderResolvedPaperStrip } from "../renderers/paperStripSvg"
import type { FlowwrapSpec, RenderOptions } from "../types/flowwrap"
import type { PackModule } from "./packModule"

const DEFAULT_PAPER_STRIP_SPEC: FlowwrapSpec = (() => {
  const baseSpec: FlowwrapSpec = {
    ...createBaseSpecDefaults({
      width: 310,
      height: 260,
      seal: 10,
      bleed: 3,
      sealClearance: 5
    }),
    substrate: "paper",
    seals: {
      top: 10,
      bottom: 10,
      left: 10,
      right: 10
    },
    safeZones: [],
    attributeBoxes: createStandardPouchAttributeBoxPreset(),
    paperStrip: {
      paperColor: "#8B5A2B",
      stepping: {
        stepCount: 1,
        gap: 0
      }
    }
  }
  return baseSpec
})()

export const paperStripPack: PackModule<
  FlowwrapSpec,
  ReturnType<typeof resolveFlowwrapGeometry>
> = {
  id: "paper-strip",
  // Display name only (Amends v12); the "paper-strip" id keeps saved projects and routes working.
  name: "Strip Laminate",
  version: 1,
  getDefaults: () => ({
    ...DEFAULT_PAPER_STRIP_SPEC,
    seals: { ...DEFAULT_PAPER_STRIP_SPEC.seals },
    safeZones: DEFAULT_PAPER_STRIP_SPEC.safeZones?.map(zone => ({ ...zone })),
    attributeBoxes: DEFAULT_PAPER_STRIP_SPEC.attributeBoxes?.map(box => ({ ...box })),
    paperStrip: {
      ...DEFAULT_PAPER_STRIP_SPEC.paperStrip,
      stepping: { ...DEFAULT_PAPER_STRIP_SPEC.paperStrip?.stepping }
    }
  }),
  resolveGeometry: spec => composePaperStripPack(spec).geometry,
  validate: spec => composePaperStripPack(spec).validation,
  render: (spec, options: RenderOptions = {}) => {
    const composed = composePaperStripPack(spec)
    return renderResolvedPaperStrip(composed.normalizedSpec, composed.layout, options)
  }
}
