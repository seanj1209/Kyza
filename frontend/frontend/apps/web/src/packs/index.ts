import { isBetaPackEnabled } from "../../../../packages/shared/releaseScope"
import { embedReadyFonts } from "../typography/fontLibrary"
import { renderCustomMeasures } from "../renderers/customMeasures"
import { applyObjectAppearance } from "../renderers/objectAppearance"
import { doyPouchPack } from "./doyPouchPack"
import { flowwrapPack } from "./flowwrapPack"
import { pillowPack } from "./pillowPack"
import { kSealPouchPack } from "./kSealPouchPack"
import { paperStripPack } from "./paperStripPack"
import { sachetPack } from "./sachetPack"
import { sachet4SidePack } from "./sachet4SidePack"
import { renderCutterLegend } from "../renderers/cutterLegend"
import { pouchEyemarkPlacements } from "../../../../packages/cutter-engine/actions/pouchEyemarkZones"
import { refreshFittedSafeZones } from "../../../../packages/cutter-engine/actions/safeZoneFit"

import { plainFilmPack } from "./amends7Packs"

export const packModules = [
  plainFilmPack,
  flowwrapPack,
  paperStripPack,
  pillowPack,
  kSealPouchPack,
  doyPouchPack,
  sachet4SidePack,
  sachetPack
].filter(pack => isBetaPackEnabled(pack.id)).map(pack => ({...pack, render: (spec: Parameters<typeof pack.render>[0], options?: Parameters<typeof pack.render>[1]) => {
  const migrated=refreshFittedSafeZones(spec,spec)
  const svg=pack.render(migrated, options)
  applyObjectAppearance(svg,migrated)
  embedReadyFonts(svg)
  if (pack.id === "paper-strip" && options?.paperStripView === "pre-slit") return svg
  const placements=pouchEyemarkPlacements(migrated)
  placements?.placements.forEach(p=>svg.querySelectorAll(`[data-role="eye-mark"][data-eye-index="${p.index}"]`).forEach(el=>el.setAttribute("data-eye-outside-safe",String(!p.allowed))))
  return renderCustomMeasures(renderCutterLegend(svg, migrated, pack.name),migrated)
}}))

export function getPackModule(id: string) {
  return isBetaPackEnabled(id) ? packModules.find(pack => pack.id === id) : undefined
}
