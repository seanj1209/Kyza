import type { FlowwrapSpec } from "../types/flowwrap"
import type { SelectionStore } from "../state/selectionStore"
import { fitSafeZone, getSafeZoneFit } from "../../../../packages/cutter-engine/actions/safeZoneFit"
import { positionEyemarks, eyemarkPositionActions } from "../../../../packages/cutter-engine/actions/eyemarkPosition"
import { transformSelectedElements } from "../../../../packages/cutter-engine/actions/selectionTransforms"
import { renderedBounds } from "./dynamicElementMeasures"
import { sizeSelectedElement } from "./selectionSizing"
import { getTextDirectionPlacement, placeTextDirection, setTextDirectionPifa, PIFA_ROTATIONS } from "../../../../packages/cutter-engine/actions/textDirection"
import { createStudioIcon } from "./studioIcons"
import { isPlaceableLabel, placeLabels } from "../../../../packages/cutter-engine/actions/labelPlacement"

const NS="http://www.w3.org/2000/svg"
export const SELECTION_ACTION_DELAY_MS=1500

/** Compact, visible feedback for labels Place leaves unmoved (full reason stays in the title). */
export function shortPlacementReason(reason:string){
  if(/All four seals/.test(reason))return "All 4 seals taken"
  if(/already (has|have) an? (FOP|BOP)/.test(reason))return "Panel taken"
  if(/already (has|have) a label/.test(reason))return "Seal taken"
  if(/two vertical fold/.test(reason))return "Needs 2 folds"
  if(/straight-sided/.test(reason))return "Not on this pack"
  if(/has no/.test(reason))return "No such seal"
  return "No clear space"
}

/** Transient HTML buttons in SVG space: screen-sized, engine-owned actions, no exported UI. */
export function attachSelectionContextActions(svg:SVGSVGElement,store:SelectionStore,getSpec:()=>FlowwrapSpec|null,commit:(spec:FlowwrapSpec)=>void,getPackId:()=>string=()=>"") {
  const layer=document.createElementNS(NS,"g")
  layer.id="selection_context_actions";layer.setAttribute("data-export-ui","true")
  svg.appendChild(layer)
  let timer:ReturnType<typeof setTimeout>|null=null, destroyed=false, menu=false, submenu=false, sizing=false, sizingId:string|null=null
  const hide=()=>{
    if(timer!==null)clearTimeout(timer)
    timer=null;menu=false;submenu=false;sizing=false;sizingId=null;layer.replaceChildren()
  }
  const ready=()=>!destroyed && svg.isConnected && store.getState().selectionMode &&
    svg.getAttribute("data-dragging")!=="true" && svg.getAttribute("data-pan-enabled")!=="true" && svg.getAttribute("data-measure-enabled")!=="true"
  const show=()=>{
    if(!ready())return
    const ids=store.getState().selectedElementIds
    const spec=getSpec()
    if(!spec)return
    // Amends v12: one or more selected seal/FOP/BOP labels share a single Place action.
    const boxId=(item:string)=>item.startsWith("attribute-box:")?item.slice("attribute-box:".length):null
    const labelIds=ids.map(boxId).filter((item):item is string=>item!==null && isPlaceableLabel(spec.attributeBoxes?.find(b=>b.id===item)))
    const isLabelGroup=labelIds.length>0 && labelIds.length===ids.length && ids.every(item=>!store.getElement(item)?.locked)
    const id=ids.length===1?ids[0]:ids.every(id=>id.startsWith("eye-mark:"))||isLabelGroup?ids[0]:null
    if(!id || store.getElement(id)?.locked)return
    const isSafe=id.startsWith("safe-zone:"),isEye=id.startsWith("eye-mark:"),isWindow=id.startsWith("window:")
    if(isEye && !eyemarkPositionActions(spec,getPackId()).length)return
    const value=id.slice(id.indexOf(":")+1)
    const isDirection=id.startsWith("attribute-box:") && spec.attributeBoxes?.some(b=>b.id===value && b.labelKey==="text-direction")
    const isLabel=!isDirection && isLabelGroup
    const isSizeBox=id.startsWith("attribute-box:") && spec.attributeBoxes?.some(b=>b.id===value && ["barcode","qr","bbe"].includes(b.kind))
    if(!isSafe && !isEye && !isDirection && !isLabel && !isWindow && !isSizeBox)return
    const attribute=isSafe?"data-zone-id":isWindow?"data-window-id":isDirection||isLabel||isSizeBox?"data-box-id":"data-eye-index"
    const role=isSafe?"safe-zone":isWindow?"window-shape":isDirection||isLabel||isSizeBox?"attribute-box":"eye-mark"
    const target=Array.from(svg.querySelectorAll<SVGGraphicsElement>(`[data-role="${role}"]`)).find(node=>node.getAttribute(attribute)===value)
    const bounds=target?renderedBounds(svg,target):null
    if(!bounds)return
    const matrix=svg.getScreenCTM(),px=1/Math.max(.001,matrix?Math.hypot(matrix.a,matrix.b):1)
    layer.replaceChildren()
    const labelPreview=isLabel?placeLabels(spec,labelIds):null
    const labelNote=labelPreview?.skipped.length?shortPlacementReason(labelPreview.skipped[0].reason):""
    const width=sizing?204:menu?(isDirection?220:200):34,height=sizing?128:menu?(isDirection||isLabel?65:48):30
    const foreign=document.createElementNS(NS,"foreignObject")
    // Small marks keep their centre free for dragging. Clamp to the visible
    // viewport so screen-sized controls remain reachable when zoomed out.
    const view=svg.viewBox?.baseVal
    const clamp=(value:number,start:number,size:number,extent:number)=>Math.max(start+2*px,Math.min(value,start+size-extent-2*px))
    const x=bounds.x+bounds.width/2-width*px/2
    const y=isEye?bounds.y-(height+7)*px:bounds.y+bounds.height/2-height*px/2
    foreign.setAttribute("x",String(view?clamp(x,view.x,view.width,width*px):x))
    foreign.setAttribute("y",String(view?clamp(y,view.y,view.height,height*px):y))
    foreign.setAttribute("width",String(width*px));foreign.setAttribute("height",String(height*px))
    foreign.setAttribute("data-context-action","true")
    foreign.style.overflow="visible"
    const shell=document.createElement("div")
    shell.style.cssText=`width:${width}px;min-height:${height}px;transform:scale(${px});transform-origin:0 0;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px;padding:3px;box-sizing:border-box;border-radius:12px;background:var(--klyro-panel-raised,#fff);border:1px solid var(--klyro-border,#ddd);box-shadow:0 3px 12px #0002;color:var(--klyro-text,#333);font:600 11px system-ui`
    const button=(label:string,title:string,action:()=>void,disabled=false)=>{
      const node=document.createElement("button")
      node.type="button";node.textContent=label;node.title=title;node.setAttribute("aria-label",title);node.disabled=disabled
      node.style.cssText="border:0;background:transparent;color:inherit;font:inherit;padding:4px;border-radius:8px;cursor:pointer;white-space:nowrap"
      node.addEventListener("click",event=>{event.stopPropagation();action()})
      shell.appendChild(node)
      return node
    }
    if(sizing){
      const current=isSafe?spec.safeZones?.find(item=>item.id===value):isWindow?spec.windows?.find(item=>item.id===value):spec.attributeBoxes?.find(item=>item.id===value)
      if(!current)return
      const form=document.createElement("form")
      form.style.cssText="display:grid;grid-template-columns:1fr 1fr;gap:4px;width:100%;padding:3px"
      const field=(name:string,initial:number)=>{
        const label=document.createElement("label");label.textContent=name;label.style.cssText="display:grid;gap:2px;font-size:10px"
        const input=document.createElement("input");input.type="number";input.step="any";input.min=isWindow?"5":"1";input.required=true;input.value=String(initial)
        input.style.cssText="width:100%;box-sizing:border-box;padding:3px;border:1px solid #aaa;border-radius:4px;color:inherit;background:var(--klyro-panel-raised,#fff)"
        label.appendChild(input);form.appendChild(label);return input
      }
      const inputWidth=field("Width mm",current.width),inputHeight=field("Height mm",current.height)
      let linked=false,ratio=current.width/Math.max(.001,current.height)
      const link=document.createElement("button");link.type="button";link.textContent="Link W:H";link.setAttribute("aria-label","Link width and height");link.setAttribute("aria-pressed","false")
      link.style.cssText="grid-column:1/-1;padding:3px;border:1px solid #aaa;border-radius:5px;color:inherit;background:transparent;cursor:pointer"
      link.addEventListener("click",event=>{event.stopPropagation();linked=!linked;link.setAttribute("aria-pressed",String(linked));if(linked)ratio=inputWidth.valueAsNumber/Math.max(.001,inputHeight.valueAsNumber)})
      form.appendChild(link)
      inputWidth.addEventListener("input",()=>{inputWidth.setCustomValidity("");if(linked&&Number.isFinite(inputWidth.valueAsNumber))inputHeight.value=String(Number((inputWidth.valueAsNumber/ratio).toFixed(3)))})
      inputHeight.addEventListener("input",()=>{inputWidth.setCustomValidity("");if(linked&&Number.isFinite(inputHeight.valueAsNumber))inputWidth.value=String(Number((inputHeight.valueAsNumber*ratio).toFixed(3)))})
      const submit=document.createElement("button");submit.type="submit";submit.textContent="Apply size";submit.style.cssText="grid-column:1/-1;padding:4px;border:1px solid #aaa;border-radius:5px;color:inherit;background:transparent;cursor:pointer"
      form.appendChild(submit)
      form.addEventListener("submit",event=>{
        event.preventDefault();event.stopPropagation()
        const before=getSpec(),next=before?sizeSelectedElement(before,id,inputWidth.valueAsNumber,inputHeight.valueAsNumber):null
        if(next){hide();commit(next)}else{inputWidth.setCustomValidity("Enter a valid size within this element's constraints");inputWidth.reportValidity()}
      })
      shell.appendChild(form)
      foreign.appendChild(shell);layer.appendChild(foreign);return
    }
    if(!menu){
      button("⋮","Element actions",()=>{menu=true;show()}).setAttribute("data-context-menu-trigger","true")
      foreign.appendChild(shell);layer.appendChild(foreign);return
    }
    if(isSafe||isWindow||isSizeBox)button("Size","Enter exact width and height in millimetres",()=>{sizing=true;sizingId=id;show()}).setAttribute("data-context-size","true")
    if(isLabel){
      // Dry run first so the button explains exactly what will and will not move.
      const preview=labelPreview!
      const skipped=preview.skipped.map(item=>item.reason)
      const label=labelIds.length===1?"Place":preview.placed.length===labelIds.length?`Place ${labelIds.length}`:`Place ${preview.placed.length}/${labelIds.length}`
      const title=preview.placed.length===0
        ?(skipped[0]??"These labels cannot be placed.")
        :skipped.length?`Places ${preview.placed.length} of ${labelIds.length}. Not moved: ${[...new Set(skipped)].join(" ")}`
        :labelIds.length===1?"Place label in its seal or panel":`Place ${labelIds.length} labels in their seals or panels`
      const node=button(label,title,()=>{
        const current=getSpec(),result=current?placeLabels(current,labelIds):null
        if(result && result.placed.length){hide();commit(result.spec)}
      },preview.placed.length===0)
      node.setAttribute("data-label-place","true")
      if(skipped.length){
        node.dataset.skipped=String(skipped.length);node.setAttribute("aria-description",title)
        const note=document.createElement("span");note.setAttribute("role","status");note.dataset.labelPlaceNote="true";note.title=title
        note.textContent=labelNote;note.style.cssText="padding:0 6px 0 2px;font-size:11px;opacity:.78;white-space:nowrap"
        shell.appendChild(note)
      }
    }else if(isSafe){
      const fit=getSafeZoneFit(spec,value)
      button("Fit",fit.enabled===true?`Fit safe zone · ${fit.clearance} mm clearance · resets rotation`:fit.reason,()=>{
        const current=getSpec(),next=current?fitSafeZone(current,value):null
        if(next){hide();commit(next)}
      },!fit.enabled)
    }else if(isDirection){
      const placement=getTextDirectionPlacement(spec,value)
      button("Place",placement.enabled===true?"Fit Text Direction into clear panel space":placement.reason,()=>{
        const current=getSpec(),next=current?placeTextDirection(current,value):null
        if(next){hide();commit(next)}
      },!placement.enabled)
      if(!submenu)button("PIFA","Choose PIFA text direction",()=>{submenu=true;show()})
      else for(const pifa of [1,2,3,4]){
        const node=button(String(pifa),"PIFA "+pifa+" · "+["upright","upside down","reads upwards","reads downwards"][pifa-1],()=>{
          const current=getSpec(),next=current?setTextDirectionPifa(current,value,pifa):null
          if(next){hide();commit(next)}
        })
        const icon=createStudioIcon("text-direction")
        if(icon){icon.style.cssText=`width:20px;height:20px;display:block;transform:rotate(${PIFA_ROTATIONS[pifa-1]}deg)`;node.prepend(icon)}
      }
    }else if(isEye && getPackId()==="sachet-4-side-seal"){
      const available=positionEyemarks(spec,"centre",getPackId())!==null
      button("Centre",available?"Centre the paired eyemark between 1A and 1B":"Eyemark is already centred between 1A and 1B",()=>{
        const current=getSpec(),next=current?positionEyemarks(current,"centre",getPackId()):null
        if(next){hide();commit(next)}
      },!available)
    }else if(isEye&&!submenu){
      button("↕ Position","Position eyemarks",()=>{submenu=true;show()})
    }else if(isEye){
      const options=eyemarkPositionActions(spec,getPackId())
      options.forEach(action=>{
        const available=positionEyemarks(spec,action,getPackId())!==null
        button(action[0].toUpperCase()+action.slice(1),available?`Position eyemarks: ${action}`:"Unavailable for this eyemark track",()=>{
          const current=getSpec(),next=current?positionEyemarks(current,action,getPackId()):null
          if(next){hide();commit(next)}
        },!available)
      })
    }
    foreign.appendChild(shell);layer.appendChild(foreign)
  }
  const schedule=()=>{
    if(sizing && ready() && store.getState().selectedElementIds.includes(sizingId??""))return
    hide();if(ready())timer=setTimeout(()=>{timer=null;show()},SELECTION_ACTION_DELAY_MS)
  }
  const down=(event:PointerEvent)=>{
    if(event.target instanceof Element && event.target.closest("[data-context-action]")){
      // Do not let object-selection/drag handlers treat these buttons as canvas clicks.
      event.stopImmediatePropagation();return
    }
    hide()
  }
  const key=(event:KeyboardEvent)=>{
    if(event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"]'))return
    if(event.key==="Escape"){hide();return}
    const direction=event.key.toLowerCase()
    if(!event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || !["r","l"].includes(direction) || !ready())return
    const selectedIds=store.getState().selectedElementIds.filter(id=>{const item=store.getElement(id);return item?.rotatable && !item.locked})
    const spec=getSpec()
    if(!spec || !selectedIds.length)return
    event.preventDefault();hide()
    const result=transformSelectedElements(spec,{kind:"rotate",selectedIds,degrees:direction==="r"?90:-90})
    if(result.changed)commit(result.spec)
  }
  const viewport=()=>{if(layer.childElementCount && !sizing)show()}
  const up=(event:PointerEvent)=>{
    if(event.target instanceof Element && event.target.closest("[data-context-action]"))return
    schedule()
  }
  const observer=new MutationObserver(records=>{
    if(records.some(record=>record.attributeName==="viewBox"))viewport()
    if(records.some(record=>record.attributeName!=="viewBox" && record.oldValue!==svg.getAttribute(record.attributeName!)))schedule()
  })
  observer.observe(svg,{attributes:true,attributeOldValue:true,attributeFilter:["data-dragging","data-pan-enabled","data-measure-enabled","viewBox"]})
  const unsubscribe=store.subscribe(schedule)
  svg.addEventListener("pointerdown",down,true)
  window.addEventListener("pointerup",up);window.addEventListener("pointercancel",schedule)
  window.addEventListener("keydown",key);window.addEventListener("blur",hide)
  svg.addEventListener("canvasviewportchange",viewport)
  window.addEventListener("resize",viewport)
  schedule()
  return {destroy(){destroyed=true;hide();observer.disconnect();unsubscribe();layer.remove();svg.removeEventListener("pointerdown",down,true);window.removeEventListener("pointerup",up);window.removeEventListener("pointercancel",schedule);window.removeEventListener("keydown",key);window.removeEventListener("blur",hide);svg.removeEventListener("canvasviewportchange",viewport);window.removeEventListener("resize",viewport)}}
}
