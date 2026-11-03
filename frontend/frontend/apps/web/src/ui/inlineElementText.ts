import { fontAlias } from "../typography/fontLibrary"
import type { FlowwrapSpec } from "../types/flowwrap"
import { resolveText, textReference } from "../renderers/attributeText"

/** Inline input shares the parent's SVG transform, including rotation and canvas zoom. */
export function attachInlineElementText(svg:SVGSVGElement,getSpec:()=>FlowwrapSpec,onChange:(spec:FlowwrapSpec)=>void) {
  let selectionTimer: ReturnType<typeof setTimeout> | undefined
  const open=(id:string,key:string)=>{
    clearTimeout(selectionTimer)
    const spec=getSpec(),box=spec.attributeBoxes?.find(b=>b.id===id)
    const node=[...svg.querySelectorAll<SVGTextElement>('text[data-text-key]')].find(n=>n.getAttribute("data-box-id")===id&&n.getAttribute("data-text-key")===key&&n.getAttribute("display")!=="none")
    if(!box||!node||svg.querySelector('[data-inline-text-editor]'))return
    const layer=node.closest('[data-layer-id]')
    if(layer?.getAttribute("data-layer-locked")==="true"||svg.getAttribute("data-pan-enabled")==="true"||svg.getAttribute("data-measure-enabled")==="true")return
    const value=resolveText(box,key),ns=svg.namespaceURI,foreign=document.createElementNS(ns,"foreignObject")
    const width=Math.max(box.width,35),height=Math.max(value.size*2.2,box.height*.6,8),x=Number(node.getAttribute("x")),y=Number(node.getAttribute("data-text-centre-y") ?? node.getAttribute("y"))
    const left=value.align==="centre"?x-width/2:value.align==="right"?x-width:x
    foreign.setAttribute("x",String(left));foreign.setAttribute("y",String(y-height/2));foreign.setAttribute("width",String(width));foreign.setAttribute("height",String(height))
    if(node.getAttribute("transform"))foreign.setAttribute("transform",node.getAttribute("transform")!)
    foreign.setAttribute("data-inline-text-editor","true");foreign.setAttribute("data-ui-only","true")
    const input=document.createElementNS("http://www.w3.org/1999/xhtml","input") as HTMLInputElement
    input.type="text";input.maxLength=2000;input.value=value.content;input.setAttribute("aria-label",`Edit ${key} text`)
    input.style.cssText=`box-sizing:border-box;width:100%;height:100%;margin:0;padding:0;border:.25px solid #c21e28;border-radius:1px;background:#fffef5;color:${value.color};font:${value.weight} ${value.size}px "${fontAlias(value.family)}";text-align:${value.align==="centre"?"center":value.align};outline:none;`
    foreign.append(input);node.parentNode!.appendChild(foreign);node.style.visibility="hidden"
    let finished=false
    const finish=(save:boolean)=>{
      if(finished)return;finished=true
      const content=input.value;foreign.remove();node.style.visibility=""
      if(save&&content!==value.content){
        const current=getSpec(),target=current.attributeBoxes?.find(b=>b.id===id)
        if(target)onChange({...current,attributeBoxes:current.attributeBoxes!.map(b=>b.id===id?{...b,textReference:textReference(b),texts:{...b.texts,[key]:{...b.texts?.[key],content}}}:b)})
      }
      window.dispatchEvent(new CustomEvent("kyza:select-text",{detail:{id,key}}))
    }
    for(const event of ["pointerdown","pointerup","click","dblclick","wheel"])input.addEventListener(event,e=>e.stopPropagation())
    input.addEventListener("keydown",e=>{e.stopPropagation();if(e.key==="Escape"){e.preventDefault();finish(false)}else if(e.key==="Enter"){e.preventDefault();finish(true)}})
    input.addEventListener("blur",()=>finish(true),{once:true})
    input.focus();input.select()
  }
  svg.addEventListener("pointerdown",event=>{
    const node=(event.target as Element).closest?.('text[data-text-key]')
    if(node&&!svg.querySelector('[data-inline-text-editor]'))event.stopImmediatePropagation()
  },true)
  svg.addEventListener("click",event=>{
    const node=(event.target as Element).closest?.('text[data-text-key]')
    if(!node)return;event.stopImmediatePropagation();clearTimeout(selectionTimer)
    if(event.detail===1)selectionTimer=setTimeout(()=>window.dispatchEvent(new CustomEvent("kyza:select-text",{detail:{id:node.getAttribute("data-box-id"),key:node.getAttribute("data-text-key")}})),230)
  },true)
  svg.addEventListener("dblclick",event=>{
    const node=(event.target as Element).closest?.('text[data-text-key]')
    if(!node)return;event.preventDefault();event.stopImmediatePropagation()
    open(node.getAttribute("data-box-id")!,node.getAttribute("data-text-key")!)
  },true)
  return {open}
}
