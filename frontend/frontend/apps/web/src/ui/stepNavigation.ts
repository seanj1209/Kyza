import type { FlowwrapSpec } from "../types/flowwrap"
import { activatePaperStripStep, paperStripSynced, setPaperStripSync, setPaperStripStepCount } from "../../../../packages/cutter-engine/actions/paperStripSteps"
import { activateSachetStep, sachetSynced, setSachetSync, setSachetStepCount, sachetStepCount } from "../../../../packages/cutter-engine/actions/sachetSteps"
import "./stepNavigation.css"
import "./packDockSync.css"

export const STEP_TAG_OFFSET_PX = 30

/** Pouch seals share the compact DOY/K-Seal tray, without sachet stepping. */
function attachSideSealPouchDock(container:HTMLElement,spec:FlowwrapSpec,commit:(next:FlowwrapSpec)=>void){
  const pouch=spec.sideSealPouch!
  const dock=document.createElement("nav");dock.className="step-navigation has-pouch-seals pouch-seal-dock";dock.setAttribute("aria-label",`${pouch.sides}SS seal dock`)
  const title=document.createElement("strong");title.textContent=`${pouch.sides}SS`;dock.append(title)
  const synced=pouch.sides===3 && pouch.sealSync!==false
  const current=spec.seals??{top:0,bottom:pouch.sides===3?spec.seal:0,left:spec.seal,right:spec.seal}
  const updateSeals=(seals:NonNullable<FlowwrapSpec["seals"]>)=>commit({...spec,seals,seal:((seals.left??0)+(seals.right??0)+(seals.bottom??0))/4})
  if(pouch.sides===3){
    const sync=document.createElement("button");sync.type="button";sync.className="pack-dock-sync";sync.textContent=synced?"SYNC ON":"SYNC OFF";sync.setAttribute("aria-label","Sync side seals");sync.setAttribute("aria-pressed",String(synced))
    sync.addEventListener("click",()=>{
      const seals=synced?current:{...current,right:current.left}
      commit({...spec,seals,seal:((seals.left??0)+(seals.right??0)+(seals.bottom??0))/4,sideSealPouch:{...pouch,sealSync:!synced}})
    });dock.append(sync)
  }
  const toggle=document.createElement("button");toggle.type="button";toggle.setAttribute("aria-label","Expand pouch seal tray");dock.append(toggle)
  const tray=document.createElement("div");tray.className="pouch-seal-dock-tray";dock.append(tray)
  const key=`kyza.pouch-seal-tray.${pouch.sides}ss`;let open=false
  try{open=sessionStorage.getItem(key)==="true"}catch{}
  const refresh=()=>{tray.hidden=!open;toggle.textContent=open?"⌃":"⌄";toggle.setAttribute("aria-expanded",String(open));toggle.setAttribute("aria-label",open?"Collapse pouch seal tray":"Expand pouch seal tray")}
  toggle.addEventListener("click",()=>{open=!open;try{sessionStorage.setItem(key,String(open))}catch{}refresh()});refresh()
  const field=(label:string,value:number,max:number,apply:(value:number)=>void)=>{
    const row=document.createElement("label");row.textContent=label
    const input=document.createElement("input");input.type="number";input.min="0";input.max=String(max);input.step="0.5";input.value=String(value);input.setAttribute("aria-label",label)
    input.addEventListener("change",()=>{if(!Number.isFinite(input.valueAsNumber)||!input.validity.valid){input.value=String(value);return}apply(input.valueAsNumber)})
    row.append(input);tray.append(row)
  }
  if(synced||pouch.sides===2)field("Side Seals",current.left??0,spec.width/2,value=>updateSeals({...current,top:0,left:value,right:value}))
  else{
    field("Left Seal",current.left??0,spec.width/2,value=>updateSeals({...current,top:0,left:value}))
    field("Right Seal",current.right??0,spec.width/2,value=>updateSeals({...current,top:0,right:value}))
  }
  if(pouch.sides===3)field("Bottom Seals",current.bottom??0,spec.height/2,value=>updateSeals({...current,top:0,bottom:value}))
  ;(container.parentElement??container).append(dock)
  return ()=>dock.remove()
}

/** Canvas-local navigation. Tags are editing helpers and never enter exports. */
export function attachStepNavigation(container:HTMLElement,root:SVGSVGElement,spec:FlowwrapSpec,activate:(next:FlowwrapSpec,id:string|null)=>void,updatePouchSeals?:(next:FlowwrapSpec)=>void) {
  if(spec.sideSealPouch && updatePouchSeals)return attachSideSealPouchDock(container,spec,updatePouchSeals)
  const steps=Array.from(root.querySelectorAll<SVGSVGElement>('svg[data-repeat-id]'))
  if(!steps.length || (!spec.sachet && !spec.paperStrip))return
  steps.sort((a,b)=>{const x=a.getAttribute("data-repeat-id")!,y=b.getAttribute("data-repeat-id")!;return parseInt(x)-parseInt(y)||x.localeCompare(y)})
  const host=container.parentElement??container
  const ns="http://www.w3.org/2000/svg", synced=spec.sachet?sachetSynced(spec):paperStripSynced(spec)
  const nav=document.createElement("nav");nav.className="step-navigation";nav.setAttribute("aria-label","Working cutter")
  const sync=document.createElement("button");sync.type="button";sync.className="step-navigation-sync pack-dock-sync";sync.textContent=synced?"SYNC ON":"SYNC OFF";sync.title="Sync steps / edit individually";sync.setAttribute("aria-label","Sync steps");sync.setAttribute("aria-pressed",String(synced))
  sync.addEventListener("click",()=>activate(spec.sachet?setSachetSync(spec,!synced):setPaperStripSync(spec,!synced),null));nav.append(sync)
  const countLabel=document.createElement("label");countLabel.className="step-navigation-count";countLabel.textContent="Steps"
  const count=document.createElement("input");count.type="number";count.setAttribute("aria-label","Step count");count.min=spec.sachet?.stepPair?"2":"1";count.step=spec.sachet?.stepPair?"2":"1";count.value=String(spec.sachet?sachetStepCount(spec):spec.paperStrip?.stepping?.stepCount??1)
  count.addEventListener("change",()=>{if(!Number.isFinite(count.valueAsNumber)||count.valueAsNumber<Number(count.min)){count.value=String(spec.sachet?sachetStepCount(spec):spec.paperStrip?.stepping?.stepCount??1);return}activate(spec.sachet?setSachetStepCount(spec,count.valueAsNumber):setPaperStripStepCount(spec,count.valueAsNumber),null)})
  countLabel.append(count);nav.append(countLabel)
  const list=document.createElement("div");list.className="step-navigation-list";nav.append(list)
  const select=(step:SVGSVGElement,focusTab:boolean)=>{
    if(root.querySelector('[data-dragging="true"]'))return
    const id=step.getAttribute("data-repeat-id")!,source=step.getAttribute("data-repeat-source")!
    const target=synced?source:id
    const next=spec.sachet?activateSachetStep(spec,target):activatePaperStripStep(spec,Number(target)-1)
    activate(next,null)
    if(focusTab)queueMicrotask(()=>host.querySelector<HTMLButtonElement>(`button[data-step-tab="${target}"]`)?.focus({preventScroll:true}))
  }
  for(const step of steps){
    const id=step.getAttribute("data-repeat-id")!,source=step.getAttribute("data-repeat-source")!,active=step.getAttribute("data-repeat-active")==="true"
    const label=synced && source!==id?`Cutter ${id}, linked to ${source}. Edit source ${source}`:`Edit cutter ${id}${spec.sachet?.stepPair?(id.endsWith("A")?", front":", back"):""}`
    const button=document.createElement("button");button.type="button";button.textContent=id;button.dataset.stepTab=id;button.title=label;button.setAttribute("aria-label",label);button.setAttribute("aria-pressed",String(active));button.className=active?"is-active":"";button.dataset.linked=String(synced && source!==id)
    button.addEventListener("click",()=>select(step,true));if(!synced || source===id)list.append(button)
    const width=Number(step.getAttribute("width")),height=Number(step.getAttribute("height"))
    const tag=document.createElementNS(ns,"g");tag.setAttribute("class",`step-canvas-tag${active?" is-active":""}`);tag.setAttribute("data-export-ui","true");tag.setAttribute("data-step-tag",id);tag.setAttribute("role","button");tag.setAttribute("tabindex","0");tag.setAttribute("aria-label",label);tag.setAttribute("aria-pressed",String(active));tag.setAttribute("transform",`translate(${width/2} ${height+STEP_TAG_OFFSET_PX})`)
    const pill=document.createElementNS(ns,"rect");Object.entries({x:-9,y:-4,width:18,height:8,rx:3}).forEach(([k,v])=>pill.setAttribute(k,String(v)))
    const text=document.createElementNS(ns,"text");text.setAttribute("text-anchor","middle");text.setAttribute("dominant-baseline","central");text.textContent=id
    tag.append(pill,text)
    if(spec.sachet?.showLaneLabels!==false)step.append(tag)
    tag.addEventListener("pointerdown",event=>{event.stopPropagation();event.preventDefault()})
    tag.addEventListener("click",event=>{event.stopPropagation();select(step,false)})
    tag.addEventListener("keydown",event=>{if(event.key==="Enter" || event.key===" "){event.preventDefault();event.stopPropagation();select(step,true)}})
    // Amends v11: no keyline around any step's cutter; the active tab below it marks selection.
  }
  const expandedKey=`kyza.step-tray.${spec.sachet?(spec.sachet.stepPair?"4ss":"3ss"):"paper-strip"}`
  let expanded=false
  try{expanded=sessionStorage.getItem(expandedKey)==="true"}catch{}
  if(!synced && list.children.length>4){
    const tray=document.createElement("button");tray.type="button";tray.className="step-navigation-tray";tray.setAttribute("aria-label","Expand step tray")
    const refresh=()=>{list.classList.toggle("is-expanded",expanded);tray.textContent=expanded?"⌃":"⌄";tray.setAttribute("aria-expanded",String(expanded));tray.setAttribute("aria-label",expanded?"Collapse step tray":"Expand step tray")}
    tray.addEventListener("click",()=>{expanded=!expanded;try{sessionStorage.setItem(expandedKey,String(expanded))}catch{}refresh()});refresh();nav.append(tray)
    queueMicrotask(()=>list.querySelector('.is-active')?.scrollIntoView({block:"nearest"}))
  }
  if(spec.sachet?.stepPair){
    const refs=document.createElement("button");refs.type="button";refs.className="step-navigation-refs";refs.textContent="Refs";refs.setAttribute("aria-label","Show step references");refs.setAttribute("aria-pressed",String(spec.sachet.showLaneLabels!==false))
    refs.addEventListener("click",()=>activate({...spec,sachet:{...spec.sachet,showLaneLabels:spec.sachet!.showLaneLabels===false}},null));nav.append(refs)
  }
  list.addEventListener("keydown",event=>{
    if(!["ArrowDown","ArrowUp","Home","End"].includes(event.key))return
    event.preventDefault();event.stopPropagation()
    const buttons=Array.from(list.querySelectorAll("button")),index=buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next=event.key==="Home"?0:event.key==="End"?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+(event.key==="ArrowDown"?1:-1)))
    buttons[next].focus()
  })
  host.append(nav)
  // Keep IDs readable while fitting a wide strip or zooming into artwork.
  const positionTags=()=>steps.forEach(step=>{
    const matrix=step.getScreenCTM();if(!matrix)return
    const zoom=Math.hypot(matrix.a,matrix.b);if(!zoom)return
    const width=Number(step.getAttribute("width")),height=Number(step.getAttribute("height"))
    step.querySelector('[data-step-tag]')?.setAttribute("transform",`translate(${width/2} ${height+STEP_TAG_OFFSET_PX/zoom}) scale(${Math.min(3/zoom,width/24)})`)
  })
  const observer=new MutationObserver(positionTags)
  observer.observe(root,{attributes:true,attributeFilter:["viewBox"]})
  root.addEventListener("canvasviewportchange",positionTags)
  positionTags()
  return ()=>{nav.remove();observer.disconnect();root.removeEventListener("canvasviewportchange",positionTags)}
}
