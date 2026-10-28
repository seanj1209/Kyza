import type { FlowwrapSpec } from "../types/flowwrap"
import { resolveKSealPouchGeometry } from "../geometry/kSealPouchGeometry"
import { updateGussetControl, type GussetControl } from "../../../../packages/cutter-engine/actions/gussetControls"
import { DOY_CENTER_GAP_MM } from "../core/geometry/resolvers/doyBounds"
import "./gussetDock.css"
import "./packDockSync.css"
/** Inputs dispatch engine actions; all geometry stays in the existing resolvers. */
export function attachGussetDock(container:HTMLElement,spec:FlowwrapSpec,commit:(next:FlowwrapSpec)=>void){
  if(!spec.kSealPouch && !spec.doyPouch)return
  const dock=document.createElement("section");dock.className="gusset-dock";dock.setAttribute("aria-label","Gusset dock")
  const title=document.createElement("span");title.textContent=spec.kSealPouch?"K Seal":"DOY";dock.append(title)
  const sync=document.createElement("button");sync.type="button";sync.className="pack-dock-sync";sync.setAttribute("aria-label","Sync gusset controls")
  const synced=spec.kSealPouch?spec.kSealPouch.gussetSync===true:spec.doyPouch?.gussetSync!==false
  sync.textContent=synced?"SYNC ON":"SYNC OFF"
  sync.setAttribute("aria-pressed",String(synced));sync.title=spec.kSealPouch?"Link side seals, bottom seals and arm width; derive arm angle from gusset size":"Link gusset size, centre oval and side arcs"
  sync.addEventListener("click",()=>commit(updateGussetControl(spec,"sync",!synced)));dock.append(sync)
  const toggle=document.createElement("button");toggle.type="button";toggle.setAttribute("aria-label","Expand gusset tray");dock.append(toggle)
  const tray=document.createElement("div");tray.className="gusset-dock-tray";dock.append(tray)
  const storageKey=`klyro.gusset-tray.${spec.kSealPouch?"kseal":"doy"}`;let open=false
  try{open=sessionStorage.getItem(storageKey)==="true"}catch{}
  const refresh=()=>{tray.hidden=!open;toggle.textContent=open?"⌃":"⌄";toggle.setAttribute("aria-expanded",String(open));toggle.setAttribute("aria-label",open?"Collapse gusset tray":"Expand gusset tray")}
  toggle.addEventListener("click",()=>{open=!open;try{sessionStorage.setItem(storageKey,String(open))}catch{}refresh()});refresh()
  const input=(key:GussetControl,label:string,value:number,min:number,max?:number)=>{
    const field={field:document.createElement("label"),input:document.createElement("input")}
    field.field.append(document.createTextNode(label),field.input);field.input.type="number";field.input.value=String(value);field.input.min=String(min);field.input.step="any"
    field.input.addEventListener("change",()=>{if(field.input.validity.valid && Number.isFinite(field.input.valueAsNumber))commit(updateGussetControl(spec,key,field.input.valueAsNumber));else field.input.value=String(value)})
    if(max!==undefined)field.input.max=String(max)
    if(key==="armDegree" && synced){field.input.disabled=true;field.input.title="Derived from gusset size while Sync is active"}
    tray.append(field.field)
  }
  if(spec.kSealPouch){const g=resolveKSealPouchGeometry(spec);input("sideSeal","Side Seals (mm)",g.sideSeal,5,20);input("bottomSeal","Bottom Seals (mm)",g.bottomSeal,.1);input("gussetSize","Gusset (mm)",g.gussetSize,0);input("armDegree","Arm Degree (°)",g.armDegree,30,60);input("armWidth","Arm Width (mm)",g.armWidth,5,20)}
  else {
    input("bottomSeal","Bottom Seal (mm)",spec.doyPouch!.bottomSeal??7.5,0)
    input("gussetSize","Gusset (mm)",(spec.doyPouch!.panelWidths.center??DOY_CENTER_GAP_MM)/2,5)
    input("sideSeal","Side Seals (mm)",spec.seals?.top??spec.seal,0)
  }
  ;(container.parentElement??container).append(dock)
  return ()=>dock.remove()
}
