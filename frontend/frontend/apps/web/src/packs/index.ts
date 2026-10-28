import { doyPouchPack } from "./doyPouchPack"
import { flowwrapPack } from "./flowwrapPack"
import { pillowPack } from "./pillowPack"
import { kSealPouchPack } from "./kSealPouchPack"
import { paperStripPack } from "./paperStripPack"
import { plainWebPack } from "./plainWebPack"
import { sachetPack } from "./sachetPack"
import { sachet4SidePack } from "./sachet4SidePack"
import { twoSideSealPouchPack, threeSideSealPouchPack, plainFilmPack } from "./amends7Packs"
import { liddingPack } from "./liddingPack"
import { renderCutterLegend } from "../renderers/cutterLegend"
import { pouchEyemarkPlacements } from "../../../../packages/cutter-engine/actions/pouchEyemarkZones"
import { refreshFittedSafeZones } from "../../../../packages/cutter-engine/actions/safeZoneFit"

export const packModules = [
  flowwrapPack,
  paperStripPack,
  pillowPack,
  kSealPouchPack,
  doyPouchPack,
  sachet4SidePack,
  sachetPack,
  twoSideSealPouchPack,
  threeSideSealPouchPack,
  plainFilmPack,
  liddingPack
].map(pack => ({...pack, render: (spec: Parameters<typeof pack.render>[0], options?: Parameters<typeof pack.render>[1]) => {
  const migrated=refreshFittedSafeZones(spec,spec)
  const svg=pack.render(migrated, options)
  const placements=pouchEyemarkPlacements(migrated)
  placements?.placements.forEach(p=>svg.querySelectorAll(`[data-role="eye-mark"][data-eye-index="${p.index}"]`).forEach(el=>el.setAttribute("data-eye-outside-safe",String(!p.allowed))))
  return renderCutterLegend(svg, migrated, pack.name)
}}))

const hiddenPackModules = [plainWebPack]
const allPackModules = [...packModules, ...hiddenPackModules]

export function getPackModule(id: string) {
  return allPackModules.find(pack => pack.id === id)
}
