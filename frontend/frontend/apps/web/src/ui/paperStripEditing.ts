import type { FlowwrapSpec } from "../types/flowwrap"
import { activatePaperStripStep, paperStripActiveStep, paperStripSynced, type PaperStripMoveIntent } from "../../../../packages/cutter-engine/actions/paperStripSteps"
import { activateSachetStep, sachetActiveId, sachetStepIds, sachetSynced } from "../../../../packages/cutter-engine/actions/sachetSteps"

export function attachPaperStripEditing(root:SVGSVGElement,spec:FlowwrapSpec,activate:(next:FlowwrapSpec,id:string|null)=>void) {
  const sachet=Boolean(spec.sachet), ids=sachet?sachetStepIds(spec):[]
  const synced=sachet?sachetSynced(spec):paperStripSynced(spec)
  const active=sachet?ids.indexOf(sachetActiveId(spec)):paperStripActiveStep(spec)
  const editor=root.querySelector<SVGSVGElement>(`svg[data-repeat-index="${active}"]`)??root
  const flags=["data-pan-enabled","data-measure-enabled","data-select-enabled","data-canvas-zoom"]
  const refreshFlags=()=>root.querySelectorAll<SVGSVGElement>('svg[data-repeat-index]').forEach(step=>flags.forEach(key=>step.setAttribute(key,root.getAttribute(key)??"false")))
  const viewport=()=>{refreshFlags();editor.dispatchEvent(new Event("canvasviewportchange"))}
  const observer=new MutationObserver(records=>{refreshFlags();if(records.some(r=>r.attributeName==="viewBox"))viewport()})
  observer.observe(root,{attributes:true,attributeFilter:[...flags,"viewBox"]})
  let mirrorFrame:number|null=null
  const mirrorPreview=()=>{
    mirrorFrame=null
    if(editor.getAttribute('data-dragging')!=='true')return
    for(const id of ['fold_lines','perf_layer','window_layer','hanger_slots','half_moon_cutouts','eyemark_track','safe_zones','attribute_boxes']){
      const source=editor.querySelector(`#${id}`);if(!source)continue
      const copy=source.cloneNode(true) as SVGGElement
      copy.querySelectorAll('[data-export-ui="true"],[data-role]').forEach(node=>{if(node.getAttribute('data-export-ui')==='true' || /handle|move|rotate|adjust|measure|diameter/.test(node.getAttribute('data-role')??''))node.remove()})
      copy.querySelectorAll('[data-selected]').forEach(node=>node.setAttribute('data-selected','false'))
      root.querySelectorAll('svg[data-repeat-index]').forEach(peer=>{if(peer!==editor && peer.getAttribute('data-repeat-source')===editor.getAttribute('data-repeat-id'))peer.querySelector(`#${id}`)?.replaceChildren(...Array.from(copy.childNodes).map(node=>node.cloneNode(true)))})
    }
  }
  const previewObserver=new MutationObserver(()=>{
    if(synced && editor.getAttribute('data-dragging')==='true' && mirrorFrame===null)mirrorFrame=requestAnimationFrame(mirrorPreview)
  })
  if(synced)previewObserver.observe(editor,{subtree:true,childList:true,attributes:true})
  let gesture:{id:string;x:number;y:number;dx:number;dy:number;pointerId:number}|null=null
  const identity=(node:Element|null)=>{
    for(const [attribute,prefix] of [["data-box-id","attribute-box"],["data-zone-id","safe-zone"],["data-window-id","window"],["data-eye-index","eye-mark"],["data-slot-id","hanger-slot"],["data-cutout-id","half-moon"],["data-line-id","fold-line"],["data-lane-index","perf-lane"]]){
      const value=node?.getAttribute(attribute);if(value!==null && value!==undefined)return `${prefix}:${value}`
    }
    return null
  }
  const point=(event:PointerEvent)=>{
    const p=editor.createSVGPoint();p.x=event.clientX;p.y=event.clientY
    return p.matrixTransform(editor.getScreenCTM()!.inverse())
  }
  const move=(event:PointerEvent)=>{
    if(!gesture || gesture.pointerId!==event.pointerId || !editor.getScreenCTM())return
    const p=point(event);gesture.dx=p.x-gesture.x;gesture.dy=p.y-gesture.y
  }
  const cancel=()=>{gesture=null}
  const down=(event:PointerEvent)=>{
    if(event.target instanceof Element && event.target.closest('[data-step-tag]'))return
    if(event.button!==0 || !(event.target instanceof Element) || root.getAttribute("data-pan-enabled")==="true" || root.getAttribute("data-measure-enabled")==="true" || event.altKey)return
    const step=event.target.closest('svg[data-repeat-index]')
    const index=Number(step?.getAttribute("data-repeat-index"))
    if(!step)return
    if(index===active){
      const node=event.target.closest('[data-role]'),role=node?.getAttribute('data-role')??'',id=identity(node)
      if((sachet || !synced) && root.getAttribute('data-select-enabled')==='true' && id && !/rotate|handle/.test(role) && editor.getScreenCTM()){
        const p=point(event);gesture={id,x:p.x,y:p.y,dx:0,dy:0,pointerId:event.pointerId}
      }
      return
    }
    event.preventDefault();event.stopImmediatePropagation()
    if(!sachet && synced)return
    const node=event.target.closest("[data-role],[data-line-id]")
    const id=identity(node)
    activate(sachet?activateSachetStep(spec,ids[index]):activatePaperStripStep(spec,index),id)
  }
  root.addEventListener("pointerdown",down,true);root.addEventListener("canvasviewportchange",viewport);refreshFlags()
  root.addEventListener("pointermove",move,true);root.addEventListener("pointerup",move,true);root.addEventListener("pointercancel",cancel,true)
  return {editor,consumeMove():PaperStripMoveIntent|undefined{const result=gesture?{id:gesture.id,dx:gesture.dx,dy:gesture.dy}:undefined;gesture=null;return result},destroy(){gesture=null;observer.disconnect();previewObserver.disconnect();if(mirrorFrame!==null)cancelAnimationFrame(mirrorFrame);root.removeEventListener("pointerdown",down,true);root.removeEventListener("canvasviewportchange",viewport);root.removeEventListener("pointermove",move,true);root.removeEventListener("pointerup",move,true);root.removeEventListener("pointercancel",cancel,true)}}
}
