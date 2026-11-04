import type { FlowwrapSpec } from "../types/flowwrap"
import type { SelectionStore } from "../state/selectionStore"
import { drawCustomMeasure } from "../renderers/customMeasures"
import { validCustomMeasures, type CustomMeasure, type MeasurePoint } from "../geometry/customMeasures"
import { collectMeasureEdges, findMeasureEdge } from "./measureSnapping"

const NS="http://www.w3.org/2000/svg"
/** Drag either endpoint to resize/angle/re-anchor; drag the dimension to move it. */
export function attachCustomMeasureInteractions(svg:SVGSVGElement,getSpec:()=>FlowwrapSpec|null,selection:SelectionStore,commit:(spec:FlowwrapSpec)=>void,onSelect:()=>void) {
  const handles=document.createElementNS(NS,"g");handles.setAttribute("data-export-ui","true");handles.setAttribute("data-role","custom-measure-handles");svg.append(handles)
  let drag:{original:CustomMeasure;next:CustomMeasure;end:"start"|"end"|"move";origin:MeasurePoint;pointer:number;group:SVGGElement}|null=null
  const local=(screen:MeasurePoint)=>{const m=svg.getScreenCTM();if(!m)return null;const p=svg.createSVGPoint();p.x=screen.x;p.y=screen.y;return p.matrixTransform(m.inverse())}
  const refresh=()=>{
    handles.replaceChildren();const spec=getSpec();if(!spec)return
    const selected=selection.getState().selectedElementIds
    const matrix=svg.getScreenCTM(),unit=1/Math.max(.001,matrix?Math.hypot(matrix.a,matrix.b):1)
    for(const m of validCustomMeasures(spec)){
      const hit=document.createElementNS(NS,"line")
      for(const [key,value] of Object.entries({x1:m.start.x,y1:m.start.y,x2:m.end.x,y2:m.end.y,stroke:"transparent","stroke-width":10*unit,"data-custom-measure-id":m.id,"data-selectable-id":`custom-measure:${m.id}`,"data-role":"custom-measure-hit"}))hit.setAttribute(key,String(value))
      hit.style.cursor="move";handles.append(hit)
      if(!selected.includes(`custom-measure:${m.id}`))continue
      for(const end of ["start","end"] as const){const p=drag?.next.id===m.id?drag.next[end]:m[end],c=document.createElementNS(NS,"circle")
        for(const [key,value] of Object.entries({cx:p.x,cy:p.y,r:5*unit,fill:"white",stroke:"#9e1316","stroke-width":1.5*unit,"data-custom-measure-id":m.id,"data-measure-end":end,"data-role":"custom-measure-endpoint-handle"}))c.setAttribute(key,String(value))
        c.style.cursor="crosshair";handles.append(c)
      }
    }
  }
  const down=(e:PointerEvent)=>{
    if(e.button!==0||svg.getAttribute("data-measure-enabled")==="true")return
    const target=e.target instanceof Element?e.target.closest('[data-custom-measure-id]'):null
    const id=target?.getAttribute("data-custom-measure-id"),spec=getSpec(),m=spec&&validCustomMeasures(spec).find(m=>m.id===id)
    if(!m)return
    const origin=local({x:e.clientX,y:e.clientY}),group=[...svg.querySelectorAll<SVGGElement>('[data-role="custom-measure"]')].find(g=>g.getAttribute("data-custom-measure-id")===id)
    if(!origin||!group)return
    e.preventDefault();e.stopImmediatePropagation();onSelect();selection.setSelectedElementIds([`custom-measure:${id}`])
    if(!svg.isConnected)return
    drag={original:m,next:m,end:(target?.getAttribute("data-measure-end") as "start"|"end")??"move",origin,pointer:e.pointerId,group};svg.setPointerCapture(e.pointerId);refresh()
  }
  const move=(e:PointerEvent)=>{
    if(!drag||e.pointerId!==drag.pointer)return
    const spec=getSpec();if(!spec)return
    const hit=e.altKey||drag.end==="move"?null:findMeasureEdge(collectMeasureEdges(svg),{x:e.clientX,y:e.clientY})
    const p=local(hit?.screen??{x:e.clientX,y:e.clientY});if(!p)return
    if(drag.end==="move"){const dx=p.x-drag.origin.x,dy=p.y-drag.origin.y;drag.next={...drag.original,start:{x:drag.original.start.x+dx,y:drag.original.start.y+dy},end:{x:drag.original.end.x+dx,y:drag.original.end.y+dy}}}
    else drag.next={...drag.original,[drag.end]:{x:p.x,y:p.y}}
    drawCustomMeasure(drag.group,drag.next,spec);refresh();e.stopImmediatePropagation()
  }
  const finish=(e:PointerEvent)=>{
    if(!drag||e.pointerId!==drag.pointer)return
    move(e);const result=drag;drag=null;if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId)
    const spec=getSpec();if(spec&&validCustomMeasures({...spec,customMeasures:[result.next]}).length&&JSON.stringify(result.next)!==JSON.stringify(result.original))commit({...spec,customMeasures:spec.customMeasures!.map(m=>m.id===result.next.id?result.next:m)})
    else if(spec){drawCustomMeasure(result.group,result.original,spec);refresh()}
    e.stopImmediatePropagation()
  }
  const cancel=()=>{const old=drag;drag=null;if(old){if(svg.hasPointerCapture(old.pointer))svg.releasePointerCapture(old.pointer);const spec=getSpec();if(spec)drawCustomMeasure(old.group,old.original,spec)}refresh()}
  const key=(e:KeyboardEvent)=>{if(e.key==="Escape"&&drag){e.preventDefault();e.stopImmediatePropagation();cancel()}}
  const unsubscribe=selection.subscribe(refresh)
  const lost=()=>{if(drag)cancel()}
  svg.addEventListener("pointerdown",down,true);svg.addEventListener("pointermove",move,true);svg.addEventListener("pointerup",finish,true);svg.addEventListener("pointercancel",cancel);svg.addEventListener("lostpointercapture",lost);document.addEventListener("keydown",key,true)
  const observer=new MutationObserver(refresh);observer.observe(svg,{attributes:true,attributeFilter:["viewBox","data-canvas-zoom"]});refresh()
  return {destroy(){cancel();unsubscribe();observer.disconnect();document.removeEventListener("keydown",key,true);svg.removeEventListener("pointerdown",down,true);svg.removeEventListener("pointermove",move,true);svg.removeEventListener("pointerup",finish,true);svg.removeEventListener("pointercancel",cancel);svg.removeEventListener("lostpointercapture",lost);handles.remove()}}
}
