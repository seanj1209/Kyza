import { resolveFlowwrapGeometry } from "../../../apps/web/src/geometry/flowwrapGeometry"
import { buildFoldLines } from "../../../apps/web/src/geometry/foldLines"
import { DEFAULT_SEAL_CLEARANCE_MM } from "../../../apps/web/src/constraints/flowwrap"
import { resolveDoyLayout } from "../../../apps/web/src/core/geometry/resolvers/resolveDoyLayout"
import { resolveKSealPouchGeometry } from "../../../apps/web/src/geometry/kSealPouchGeometry"
import type { FlowwrapSpec, SafeZoneSpec } from "../../../apps/web/src/types/flowwrap"
import { pouchSafeZoneContour, zoneFromContour } from "./safeZoneContours"
import { fitPaperSafeZone } from "./paperSafeZones"

type Boundary = {position: number; kind: "seal" | "fold" | "open"}
export type SafeZoneFitResult = {enabled: true; zone: SafeZoneSpec; clearance: number} | {enabled: false; reason: string}

function fitDoySafeZone(spec: FlowwrapSpec, zone: SafeZoneSpec, clearance: number): SafeZoneFitResult {
  const flow = resolveFlowwrapGeometry(spec)
  const layout = resolveDoyLayout(spec, 0, flow.liveRect.x, flow.liveRect.width, spec.width)
  if (!layout) return {enabled: false, reason: "DOY working-area geometry is unavailable."}
  const zoneCenter = flow.liveRect.x + zone.x + zone.width / 2
  const leftPanel = zoneCenter <= layout.rectCenterX
  const fitted = zoneFromContour(zone, pouchSafeZoneContour(spec, leftPanel, clearance))
  return fitted ? {enabled:true, clearance, zone:{...fitted, fitContour:leftPanel ? "doy-left" : "doy-right"}} : {enabled:false,reason:"This working area is too small for the current clearance."}
}

function fitKSealSafeZone(spec: FlowwrapSpec, zone: SafeZoneSpec, clearance: number): SafeZoneFitResult {
  const geometry = resolveKSealPouchGeometry(spec)
  const leftArm = geometry.armLines.find(line => line.side === "top-left" && line.position === "outer")!
  const rightArm = geometry.armLines.find(line => line.side === "top-right" && line.position === "outer")!
  const panels = [
    {left: geometry.leftPanelX, right: leftArm.startX, contour: "kseal-left" as const},
    {left: rightArm.startX, right: geometry.rightPanelX + geometry.pouchHeight, contour: "kseal-right" as const}
  ].map(panel => ({
    left: panel.left - geometry.liveX,
    right: panel.right - geometry.liveX,
    center: (panel.left + panel.right) / 2,
    contour: panel.contour
  }))
  const zoneCenter = geometry.liveX + zone.x + zone.width / 2
  const panel = panels.reduce((closest, candidate) =>
    Math.abs(candidate.center - zoneCenter) < Math.abs(closest.center - zoneCenter)
      ? candidate
      : closest
  )
  const fitted = zoneFromContour(zone, pouchSafeZoneContour(spec, panel.contour === "kseal-left", clearance))
  return fitted ? {enabled:true, clearance, zone:{...fitted, fitContour:panel.contour}} : {enabled:false,reason:"This working area is too small for the current clearance."}
}

/** Fits to the construction panel containing the zone centre; internal elements do not split panels. */
export function getSafeZoneFit(spec: FlowwrapSpec, zoneId: string): SafeZoneFitResult {
  const zone = spec.safeZones?.find(item=>item.id===zoneId)
  if (!zone || zone.enabled===false) return {enabled:false,reason:"Select an enabled safe zone."}
  const clearance = spec.sealClearance ?? DEFAULT_SEAL_CLEARANCE_MM
  if (![clearance,zone.x,zone.y,zone.width,zone.height,spec.width,spec.height].every(Number.isFinite) || clearance < 0) return {enabled:false,reason:"The panel and clearance must have valid dimensions."}
  if (spec.kSealPouch) return fitKSealSafeZone(spec, zone, clearance)
  if (spec.doyPouch) return fitDoySafeZone(spec, zone, clearance)
  if (spec.paperStrip) {
    const fitted=fitPaperSafeZone(spec,{...zone,paperFit:undefined})
    return fitted ? {enabled:true,clearance,zone:fitted} : {enabled:false,reason:"No paper area remains between the seals and clear strips at this clearance."}
  }
  const geometry = resolveFlowwrapGeometry(spec)
  const live = geometry.liveRect, seals = geometry.seals
  if (![live.width,live.height,clearance,zone.x,zone.y,zone.width,zone.height].every(Number.isFinite) || clearance<0 || live.width<=0 || live.height<=0) return {enabled:false,reason:"The panel and clearance must have valid dimensions."}
  const xs: Boundary[] = [{position:0,kind:seals.left>0?"seal":"open"},{position:live.width,kind:seals.right>0?"seal":"open"}]
  const ys: Boundary[] = [{position:0,kind:seals.top>0?"seal":"open"},{position:live.height,kind:seals.bottom>0?"seal":"open"}]
  // Use the same fold segments as the engine renderer, including its horizontal-fold placement.
  const folds = buildFoldLines(spec.foldLines??[],live.x,0,0,spec.width,spec.height,live.x,live.x+live.width)
  for (const fold of folds) {
    const vertical = Math.abs(fold.x2-fold.x1)<0.001
    const position = vertical ? fold.x1-live.x : fold.y1-live.y
    const limit = vertical ? live.width : live.height
    if (position>0.001 && position<limit-0.001) (vertical?xs:ys).push({position,kind:"fold"})
  }
  const enclosing = (boundaries: Boundary[],center: number) => {
    const sorted = boundaries.sort((a,b)=>a.position-b.position)
    for (let i=1;i<sorted.length;i++) if (center>sorted[i-1].position+0.001 && center<sorted[i].position-0.001) return [sorted[i-1],sorted[i]]
    return null
  }
  const x = enclosing(xs,zone.x+zone.width/2), y = enclosing(ys,zone.y+zone.height/2)
  if (!x || !y) return {enabled:false,reason:"Move the zone centre inside a seal/fold panel, not onto its boundary."}
  const boundaries = [...x,...y]
  const sealCount = boundaries.filter(b=>b.kind==="seal").length
  const foldCount = boundaries.filter(b=>b.kind==="fold").length
  if (!((sealCount===3 && foldCount===1)||(sealCount===2 && foldCount===2))) return {enabled:false,reason:"Fit needs 3 seals + 1 fold, or 2 seals + 2 folds."}
  const width = x[1].position-x[0].position-2*clearance, height = y[1].position-y[0].position-2*clearance
  if (width<1 || height<1) return {enabled:false,reason:"This panel is too small for the current clearance."}
  return {enabled:true,clearance,zone:{...zone,x:x[0].position+clearance,y:y[0].position+clearance,width,height,rotation:0}}
}

export function fitSafeZone(spec: FlowwrapSpec, zoneId: string): FlowwrapSpec | null {
  const result = getSafeZoneFit(spec,zoneId)
  if (!result.enabled) return null
  return {...spec,safeZones:spec.safeZones?.map(zone=>zone.id===zoneId?result.zone:zone)}
}

export function refreshFittedSafeZones(before: FlowwrapSpec | null | undefined, next: FlowwrapSpec): FlowwrapSpec {
  const geometryKey=(s:FlowwrapSpec)=>JSON.stringify([s.width,s.height,s.seals,s.seal,s.sealClearance,s.doyPouch,s.kSealPouch])
  const changed=!before || geometryKey(before)!==geometryKey(next)
  return {...next,safeZones:next.safeZones?.map(zone=>{
    if(!zone.fitContour || (!changed && zone.fitOutline))return zone
    const fit=getSafeZoneFit(next,zone.id)
    return fit.enabled?fit.zone:zone
  })}
}
