import type { FlowwrapSpec } from "../types/flowwrap"
import type { SelectionStore } from "../state/selectionStore"
import { customMeasureOffsets, drawCustomMeasure, offsetCustomMeasure, type MeasureOffset } from "../renderers/customMeasures"
import { measureLength, validCustomMeasures, type CustomMeasure, type MeasurePoint } from "../geometry/customMeasures"
import { collectMeasureEdges, findMeasureEdge } from "./measureSnapping"

const NS="http://www.w3.org/2000/svg"
/** Drag either endpoint to resize/angle/re-anchor; drag the dimension to move it. */
export function attachCustomMeasureInteractions(svg:SVGSVGElement,getSpec:()=>FlowwrapSpec|null,selection:SelectionStore,commit:(spec:FlowwrapSpec)=>void,onSelect:()=>void) {
  const handles=document.createElementNS(NS,"g");handles.setAttribute("data-export-ui","true");handles.setAttribute("data-role","custom-measure-handles");svg.append(handles)
  const menu=document.createElement("div");menu.className="custom-measure-repeat-menu";menu.setAttribute("data-export-ui","true")
  const more=document.createElement("button");more.type="button";more.textContent="⋯";more.setAttribute("aria-label","Custom measure options")
  const choices=document.createElement("div");choices.className="custom-measure-repeat-choices";choices.hidden=true
  menu.append(more,choices);svg.parentElement?.append(menu)
  more.addEventListener("pointerdown",e=>e.stopPropagation());more.addEventListener("click",()=>{choices.hidden=!choices.hidden})
  let selectedOffset:MeasureOffset={x:0,y:0}
  let drag:{original:CustomMeasure;next:CustomMeasure;end:"start"|"end"|"move";origin:MeasurePoint;pointer:number;group:SVGGElement;offset:MeasureOffset;angleUnlocked:boolean}|null=null
  const local=(screen:MeasurePoint)=>{const m=svg.getScreenCTM();if(!m)return null;const p=svg.createSVGPoint();p.x=screen.x;p.y=screen.y;return p.matrixTransform(m.inverse())}
  const refresh=()=>{
    handles.replaceChildren();const spec=getSpec();if(!spec)return
    const selected=selection.getState().selectedElementIds
    const matrix=svg.getScreenCTM(),unit=1/Math.max(.001,matrix?Math.hypot(matrix.a,matrix.b):1)
    for(const m of validCustomMeasures(spec)){
      const offsets=customMeasureOffsets(svg,spec,m)
      offsets.forEach((offset,index)=>{
        const copy=offsetCustomMeasure(m,offset),hit=document.createElementNS(NS,"line")
        for(const [key,value] of Object.entries({x1:copy.start.x,y1:copy.start.y,x2:copy.end.x,y2:copy.end.y,stroke:"transparent","stroke-width":10*unit,"data-custom-measure-id":m.id,"data-selectable-id":`custom-measure:${m.id}`,"data-role":"custom-measure-hit","data-repeat-index":index,"data-repeat-dx":offset.x,"data-repeat-dy":offset.y}))hit.setAttribute(key,String(value))
        hit.style.cursor="move";handles.append(hit)
      })
      svg.querySelectorAll<SVGGElement>(`[data-role="custom-measure"][data-custom-measure-id="${m.id}"]`).forEach(group=>group.classList.toggle("is-selected",selected.includes(`custom-measure:${m.id}`)))
      if(!selected.includes(`custom-measure:${m.id}`))continue
      if(!offsets.some(offset=>offset.x===selectedOffset.x&&offset.y===selectedOffset.y))selectedOffset={x:0,y:0}
      for(const end of ["start","end"] as const){const p=drag?.next.id===m.id?drag.next[end]:m[end],c=document.createElementNS(NS,"circle")
        for(const [key,value] of Object.entries({cx:p.x+selectedOffset.x,cy:p.y+selectedOffset.y,r:5*unit,fill:"white",stroke:"#9e1316","stroke-width":1.5*unit,"data-custom-measure-id":m.id,"data-repeat-dx":selectedOffset.x,"data-repeat-dy":selectedOffset.y,"data-measure-end":end,"data-role":"custom-measure-endpoint-handle"}))c.setAttribute(key,String(value))
        c.style.cursor="crosshair";handles.append(c)
      }
    }
    const selectedMeasure=validCustomMeasures(spec).find(m=>selected.includes(`custom-measure:${m.id}`))
    menu.hidden=!selectedMeasure
    if(selectedMeasure&&matrix){
      const center={x:(selectedMeasure.start.x+selectedMeasure.end.x)/2+selectedOffset.x,y:(selectedMeasure.start.y+selectedMeasure.end.y)/2+selectedOffset.y}
      const screen=new DOMPoint(center.x,center.y).matrixTransform(matrix),parent=menu.parentElement?.getBoundingClientRect()
      if(parent){menu.style.left=`${screen.x-parent.left-15}px`;menu.style.top=`${screen.y-parent.top-65}px`}
      choices.replaceChildren()
      for(const mode of ["mono","all"] as const){const button=document.createElement("button");button.type="button";button.textContent=mode==="mono"?"Mono":"All";button.setAttribute("aria-pressed",String((selectedMeasure.repeatMode??"mono")===mode));button.addEventListener("pointerdown",e=>e.stopPropagation());button.addEventListener("click",()=>{const current=getSpec();if(!current)return;commit({...current,customMeasures:current.customMeasures?.map(item=>item.id===selectedMeasure.id?{...item,repeatMode:mode}:item)});choices.hidden=true;selectedOffset={x:0,y:0}});choices.append(button)}
      const form=document.createElement("form");form.className="custom-measure-exact-size"
      const label=document.createElement("label");label.textContent="Length (mm)"
      const input=document.createElement("input");input.type="number";input.min="0.001";input.max="100000";input.step="any";input.required=true;input.value=String(Number(measureLength(selectedMeasure).toFixed(3)))
      label.append(input)
      const apply=document.createElement("button");apply.type="submit";apply.textContent="Apply"
      form.append(label,apply);choices.append(form)
      form.addEventListener("pointerdown",event=>event.stopPropagation())
      form.addEventListener("submit",event=>{event.preventDefault();event.stopPropagation();const length=input.valueAsNumber,current=getSpec(),old=current?.customMeasures?.find(item=>item.id===selectedMeasure.id);if(!old||!Number.isFinite(length)||length<.001||length>100000)return;const original=measureLength(old),direction={x:(old.end.x-old.start.x)/original,y:(old.end.y-old.start.y)/original};const end={x:old.start.x+direction.x*length,y:old.start.y+direction.y*length};if(validCustomMeasures({...current!,customMeasures:[{...old,end}]}).length){commit({...current!,customMeasures:current!.customMeasures?.map(item=>item.id===old.id?{...item,end}:item)});choices.hidden=true}})
    }
  }
  const down=(e:PointerEvent)=>{
    if(e.button!==0||svg.getAttribute("data-measure-enabled")==="true")return
    const target=e.target instanceof Element?e.target.closest('[data-custom-measure-id]'):null
    const id=target?.getAttribute("data-custom-measure-id"),spec=getSpec(),m=spec&&validCustomMeasures(spec).find(m=>m.id===id)
    if(!m)return
    const origin=local({x:e.clientX,y:e.clientY}),offset={x:Number(target?.getAttribute("data-repeat-dx")??0),y:Number(target?.getAttribute("data-repeat-dy")??0)},group=[...svg.querySelectorAll<SVGGElement>('[data-role="custom-measure"]')].find(g=>g.getAttribute("data-custom-measure-id")===id&&Number(g.getAttribute("data-repeat-dx")??0)===offset.x&&Number(g.getAttribute("data-repeat-dy")??0)===offset.y)
    if(!origin||!group)return
    e.preventDefault();e.stopImmediatePropagation();onSelect();selectedOffset=offset;selection.setSelectedElementIds([`custom-measure:${id}`])
    if(!svg.isConnected)return
    drag={original:m,next:m,end:(target?.getAttribute("data-measure-end") as "start"|"end")??"move",origin,pointer:e.pointerId,group,offset,angleUnlocked:Math.abs(m.end.x-m.start.x)>1&&Math.abs(m.end.y-m.start.y)>1};svg.setPointerCapture(e.pointerId);refresh()
  }
  const move=(e:PointerEvent)=>{
    if(!drag||e.pointerId!==drag.pointer)return
    const spec=getSpec();if(!spec)return
    const hit=e.altKey||drag.end==="move"?null:findMeasureEdge(collectMeasureEdges(svg),{x:e.clientX,y:e.clientY})
    const physical=local(hit?.screen??{x:e.clientX,y:e.clientY});if(!physical)return
    const p={x:physical.x-drag.offset.x,y:physical.y-drag.offset.y}
    if(drag.end==="move"){const dx=physical.x-drag.origin.x,dy=physical.y-drag.origin.y;drag.next={...drag.original,start:{x:drag.original.start.x+dx,y:drag.original.start.y+dy},end:{x:drag.original.end.x+dx,y:drag.original.end.y+dy}}}
    else {
      const fixed = drag.original[drag.end === "start" ? "end" : "start"]
      const vertical = Math.abs(drag.original.end.y - drag.original.start.y) >= Math.abs(drag.original.end.x - drag.original.start.x)
      const matrix = svg.getScreenCTM()
      const pixelsPerUnit = matrix ? Math.hypot(matrix.a, matrix.b) : 1
      const lateralPx = Math.abs((vertical ? p.x - fixed.x : p.y - fixed.y) * pixelsPerUnit)
      if (lateralPx >= 24) drag.angleUnlocked = true
      drag.next = {...drag.original,[drag.end]:drag.angleUnlocked ? {x:p.x,y:p.y} : vertical ? {x:fixed.x,y:p.y} : {x:p.x,y:fixed.y}}
    }
    drawCustomMeasure(drag.group,offsetCustomMeasure(drag.next,drag.offset),spec);refresh();e.stopImmediatePropagation()
  }
  const finish=(e:PointerEvent)=>{
    if(!drag||e.pointerId!==drag.pointer)return
    move(e);const result=drag;drag=null;if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId)
    const spec=getSpec();if(spec&&validCustomMeasures({...spec,customMeasures:[result.next]}).length&&JSON.stringify(result.next)!==JSON.stringify(result.original))commit({...spec,customMeasures:spec.customMeasures!.map(m=>m.id===result.next.id?result.next:m)})
    else if(spec){drawCustomMeasure(result.group,offsetCustomMeasure(result.original,result.offset),spec);refresh()}
    e.stopImmediatePropagation()
  }
  const cancel=()=>{const old=drag;drag=null;if(old){if(svg.hasPointerCapture(old.pointer))svg.releasePointerCapture(old.pointer);const spec=getSpec();if(spec)drawCustomMeasure(old.group,offsetCustomMeasure(old.original,old.offset),spec)}refresh()}
  const key=(e:KeyboardEvent)=>{if(e.key==="Escape"&&drag){e.preventDefault();e.stopImmediatePropagation();cancel()}}
  const unsubscribe=selection.subscribe(refresh)
  const lost=()=>{if(drag)cancel()}
  svg.addEventListener("pointerdown",down,true);svg.addEventListener("pointermove",move,true);svg.addEventListener("pointerup",finish,true);svg.addEventListener("pointercancel",cancel);svg.addEventListener("lostpointercapture",lost);document.addEventListener("keydown",key,true)
  const observer=new MutationObserver(refresh);observer.observe(svg,{attributes:true,attributeFilter:["viewBox","data-canvas-zoom"]});refresh()
  return {destroy(){cancel();unsubscribe();observer.disconnect();document.removeEventListener("keydown",key,true);svg.removeEventListener("pointerdown",down,true);svg.removeEventListener("pointermove",move,true);svg.removeEventListener("pointerup",finish,true);svg.removeEventListener("pointercancel",cancel);svg.removeEventListener("lostpointercapture",lost);handles.remove();menu.remove()}}
}
