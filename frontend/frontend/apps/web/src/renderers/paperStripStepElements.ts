import type { FlowwrapSpec, RenderMode } from "../types/flowwrap"
import { resolveFlowwrapGeometry } from "../geometry/flowwrapGeometry"
import { buildFoldLines } from "../geometry/foldLines"
import { renderAttributeBoxes } from "./svgAttributeBoxes"
import { renderEyeMarks } from "./svgEyeMarks"
import { renderFoldLines } from "./svgFoldLines"
import { renderPerfs } from "./svgPerfs"
import { renderSafeZones } from "./svgSafeZones"
import { renderWindows } from "./svgWindows"
import { renderHangerSlots } from "./svgHangerSlots"
import { renderHalfMoonCutouts } from "./svgHalfMoonCutouts"

const NS="http://www.w3.org/2000/svg"
/** One normal cutter coordinate system per repeat. Its editor never includes
 * geometry from a neighbour, so selection/measurement bounds remain local. */
export function renderPaperStripStepElements(spec:FlowwrapSpec,index:number,active:boolean,renderMode:RenderMode,packId="paper-strip"):SVGSVGElement {
  const root=document.createElementNS(NS,"svg"),g=resolveFlowwrapGeometry(spec),live=g.liveRect
  root.setAttribute("data-paper-step-index",String(index));root.setAttribute("data-paper-step-active",String(active))
  root.setAttribute("data-repeat-index",String(index));root.setAttribute("data-repeat-active",String(active))
  if(packId!=="paper-strip")root.removeAttribute("data-paper-step-index")
  root.setAttribute("viewBox",`0 0 ${spec.width} ${spec.height}`);root.setAttribute("width",String(spec.width));root.setAttribute("height",String(spec.height));root.style.overflow="visible"
  // Studio CSS sizes "#preview svg" to the canvas; pin nested step svgs to their own size so per-step
  // content (labels, folds, safe zones, step tags) shares the cutter scale (px = user units here).
  root.style.width=`${spec.width}px`;root.style.height=`${spec.height}px`
  const group=(id:string,layer:string,meta:Record<string,string|number>={})=>{
    const node=document.createElementNS(NS,"g");node.id=id;node.setAttribute("data-layer-id",layer)
    Object.entries(meta).forEach(([k,v])=>node.setAttribute(k,String(v)));root.appendChild(node);return node
  }
  const liveMeta={"data-live-origin-x":live.x,"data-live-origin-y":live.y,"data-live-width":live.width,"data-live-height":live.height}
  const packMeta={"data-cutter-origin-x":0,"data-cutter-origin-y":0,"data-cutter-width":spec.width,"data-cutter-height":spec.height}
  const surface=document.createElementNS(NS,"rect")
  Object.entries({x:0,y:0,width:spec.width,height:spec.height,fill:"transparent","pointer-events":"all","data-role":"paper-step-surface"}).forEach(([key,value])=>surface.setAttribute(key,String(value)))
  root.appendChild(surface)
  group("seal_areas","seal-areas",{"data-origin-x":0,"data-origin-y":0,"data-live-width":live.width,"data-live-height":live.height,...packMeta})
  const folds=group("fold_lines","fold-lines")
  const perf=group("perf_layer","perf-lines")
  const windows=group("window_layer","windows",liveMeta)
  const hangers=group("hanger_slots","hanger-slots",liveMeta)
  const moons=group("half_moon_cutouts","half-moon-cutouts")
  const eyes=group("eyemark_track","eyemarks",{...packMeta,"data-seal-top":g.seals.top,"data-seal-bottom":g.seals.bottom,"data-seal-left":g.seals.left,"data-seal-right":g.seals.right})
  const safe=group("safe_zones","safe-zones",liveMeta)
  const notes=group("attribute_boxes","notes",{...liveMeta,...packMeta,"data-pack-id":packId,"data-sachet-step-enabled":"false","data-sachet-step-count":1,"data-sachet-step-span":0})
  if(spec.foldLines?.length){const min=live.x+Math.max(0,spec.bleed??0),max=live.x+live.width-Math.max(0,spec.bleed??0);renderFoldLines(folds,buildFoldLines(spec.foldLines,live.x,0,0,spec.width,spec.height,min,max),live.x,min,max)}
  if(spec.perfs)renderPerfs(perf,spec.perfs,live.x,live.y,live.width,live.height,0,0,spec.width,spec.height)
  renderWindows(windows,spec.windows??[],live.x,live.y)
  renderHangerSlots(hangers,spec.hangerSlots??[],live.x,live.y,live.width,{cutterOriginX:0,cutterWidth:spec.width})
  renderHalfMoonCutouts(moons,spec,spec.halfMoonCutouts??[],0,0)
  if(spec.eyeMarks)renderEyeMarks(eyes,spec.eyeMarks,0,0,spec.width,spec.height,g.seals)
  renderSafeZones(safe,spec.safeZones??[],live.x,live.y)
  renderAttributeBoxes(notes,(spec.attributeBoxes??[]).map(b=>b.kind==="clear-strip"?{...b,laneIndex:0}:b),live.x,live.y,0,undefined,renderMode)
  group("annotations","annotations")
  // Native resize/rotate helpers on inactive repeats must not intercept the
  // first click used to activate that repeat. The repeat SVG still receives it.
  if(!active)root.querySelectorAll<SVGElement>('[data-role]').forEach(node=>{if(/handle|move|rotate|drag|adjust/.test(node.getAttribute("data-role")??""))node.setAttribute("pointer-events","none")})
  return root
}
