import type { FlowwrapSpec, ElementTextStyle, ObjectAppearance } from "../types/flowwrap"
import { resolveText, textKeys, textReference, MM_PER_PT } from "../renderers/attributeText"
import { FONT_GROUPS } from "../typography/fontLibrary"

/** A selected-object section inside the existing Customise > Elements menu. */
export function createSelectedObjectCustomise(host:HTMLElement,getSpec:()=>FlowwrapSpec|null,onChange:(spec:FlowwrapSpec)=>void,getSvg?:()=>SVGSVGElement|null) {
  const root=document.createElement("div");root.className="customise-selected-object customise-target-content";host.appendChild(root)
  window.addEventListener("kyza:font-error",event=>{
    const status=root.querySelector('[data-font-status]')
    if(status)status.textContent=(event as CustomEvent<string>).detail
  })
  window.addEventListener("kyza:font-ready",()=>{const status=root.querySelector('[data-font-status]');if(status)status.textContent=""})
  let ids:string[]=[],part="parent",signature="",syncs:(()=>void)[]=[]
  const currentBox=()=>getSpec()?.attributeBoxes?.find(box=>`attribute-box:${box.id}`===ids[0])
  const appearance=():ObjectAppearance=>{
    const box=currentBox()
    const node=[...getSvg()?.querySelectorAll<SVGElement>('[data-selectable-id]')??[]].find(n=>n.getAttribute("data-selectable-id")===ids[0]&&!/hit|handle|move|rotate/.test(n.getAttribute("data-role")??"")&&n.getAttribute("fill")!=="transparent")
    const fill=node?.getAttribute("fill"),stroke=node?.getAttribute("stroke"),dash=node?.getAttribute("stroke-dasharray")
    const defaults:ObjectAppearance={fillEnabled:!!fill&&fill!=="none",fillColor:fill?.startsWith("#")?fill:"#ffffff",fillOpacity:Number(node?.getAttribute("fill-opacity")??1),
      strokeEnabled:stroke?stroke!=="none":box?.kind!=="label",strokeColor:stroke?.startsWith("#")?stroke:"#1a2a49",strokeOpacity:Number(node?.getAttribute("stroke-opacity")??1),strokeWidth:Number(node?.getAttribute("stroke-width")??.3),strokeStyle:dash&&dash!=="none"?(dash.startsWith(".5")?"dotted":"dashed"):"solid"}
    return {...defaults,...box?.appearance,...getSpec()?.objectAppearance?.[ids[0]]}
  }
  const text=()=>{const box=currentBox();return box?resolveText(box,part):null}
  const commitAppearance=(patch:ObjectAppearance)=>{
    const spec=getSpec();if(!spec||ids.length!==1)return
    onChange({...spec,objectAppearance:{...spec.objectAppearance,[ids[0]]:{...appearance(),...patch}}});syncs.forEach(f=>f())
  }
  const commitText=(patch:ElementTextStyle)=>{
    const spec=getSpec(),box=currentBox();if(!spec||!box)return
    const next={...box,textReference:textReference(box),texts:{...box.texts,[part]:{...box.texts?.[part],...patch}}}
    onChange({...spec,attributeBoxes:spec.attributeBoxes!.map(b=>b.id===box.id?next:b)});syncs.forEach(f=>f())
  }
  const card=(title:string)=>{const c=document.createElement("section");c.className="customise-card";const h=document.createElement("h3");h.textContent=title;c.append(h);root.append(c);return c}
  const row=(c:HTMLElement,label:string)=>{const r=document.createElement("label");r.className="customisation-row";const s=document.createElement("span");s.textContent=label;r.append(s);c.append(r);return r}
  const field=(c:HTMLElement,label:string,kind:string,get:()=>string,change:(value:string)=>void)=>{
    const r=row(c,label),i=document.createElement("input");i.type=kind;i.className="customisation-number";i.setAttribute("aria-label",label);r.append(i)
    i.addEventListener("change",()=>change(i.value));i.addEventListener("keydown",e=>{if(e.key==="Enter")i.blur()})
    syncs.push(()=>{if(document.activeElement!==i)i.value=get()});return i
  }
  const numeric=(c:HTMLElement,label:string,get:()=>number,change:(value:number)=>void,min:number,max:number,step=.1)=>{
    const i=field(c,label,"number",()=>String(Math.round(get()*1000)/1000),v=>{const n=Number(v);if(v.trim()&&Number.isFinite(n)&&n>=min&&n<=max)change(n);else {i.value=String(get())}},)
    i.min=String(min);i.max=String(max);i.step=String(step);return i
  }
  const check=(c:HTMLElement,label:string,get:()=>boolean,change:(value:boolean)=>void)=>{
    const r=row(c,label),i=document.createElement("input");i.type="checkbox";i.setAttribute("aria-label",label);r.append(i);i.addEventListener("change",()=>change(i.checked));syncs.push(()=>{i.checked=get()});return i
  }
  const colour=(c:HTMLElement,label:string,get:()=>string,change:(value:string)=>void)=>{
    const r=row(c,label),wrap=document.createElement("div");wrap.className="customisation-color-wrap";r.append(wrap)
    const hex=document.createElement("input"),picker=document.createElement("input");hex.className="customisation-color-text";hex.maxLength=7;hex.setAttribute("aria-label",`${label} HEX`)
    picker.type="color";picker.className="customise-colour-picker";picker.setAttribute("aria-label",`${label} picker`);wrap.append(hex,picker)
    hex.addEventListener("change",()=>{if(/^#[\da-f]{6}$/i.test(hex.value))change(hex.value);else hex.value=get()})
    picker.addEventListener("input",()=>change(picker.value))
    syncs.push(()=>{if(document.activeElement!==hex)hex.value=get();if(document.activeElement!==picker)picker.value=get()})
  }
  const select=(c:HTMLElement,label:string,options:{value:string;label:string;group?:string}[],get:()=>string,change:(v:string)=>void)=>{
    const r=row(c,label),s=document.createElement("select");s.className="customisation-select";s.setAttribute("aria-label",label);r.append(s)
    const groups=new Map<string,HTMLOptGroupElement>()
    options.forEach(o=>{const option=document.createElement("option");option.value=o.value;option.textContent=o.label;if(o.group){let group=groups.get(o.group);if(!group){group=document.createElement("optgroup");group.label=o.group;groups.set(o.group,group);s.append(group)}group.append(option)}else s.append(option)})
    s.addEventListener("change",()=>change(s.value));syncs.push(()=>{s.value=get()});return s
  }
  const draw=()=>{
    root.replaceChildren();syncs=[]
    if(ids.length!==1){root.hidden=true;return}root.hidden=false
    const box=currentBox(),keys=box?textKeys(box):[]
    const title=card(box?({bbe:"BBE box",qr:"QR guide",barcode:"Barcode guide",label:"Label","clear-strip":"Clear strip"})[box.kind]:"Selected object")
    const note=document.createElement("p");note.className="customisation-category-note";note.textContent="Changes apply to this object only.";title.append(note)
    if(keys.length)select(title,"Customise part",[{value:"parent",label:"Parent appearance"},...keys.map(key=>({value:key,label:({heading:"BBE heading",date:"Date / placeholder",caption:"Caption",label:"Text"} as Record<string,string>)[key]}))],()=>part,v=>{part=v;signature="";refresh()})
    if(part==="parent"||!keys.length){
      const fill=card("Fill"),stroke=card("Stroke")
      // Lines and eyemarks have no meaningful editable background fill.
      const lineOnly=/^(fold-line|perf-lane):/.test(ids[0])
      fill.hidden=lineOnly
      check(fill,"Enable fill",()=>appearance().fillEnabled ?? (box?.kind==="clear-strip"),v=>commitAppearance({fillEnabled:v}))
      colour(fill,"Fill colour",()=>appearance().fillColor??"#ffffff",v=>commitAppearance({fillColor:v}))
      numeric(fill,"Fill opacity (%)",()=>100*(appearance().fillOpacity??1),v=>commitAppearance({fillOpacity:v/100}),0,100,1)
      check(stroke,"Enable stroke",()=>appearance().strokeEnabled??box?.kind!=="label",v=>commitAppearance({strokeEnabled:v}))
      colour(stroke,"Stroke colour",()=>appearance().strokeColor??"#1a2a49",v=>commitAppearance({strokeColor:v}))
      numeric(stroke,"Stroke opacity (%)",()=>100*(appearance().strokeOpacity??1),v=>commitAppearance({strokeOpacity:v/100}),0,100,1)
      numeric(stroke,"Stroke thickness (mm)",()=>appearance().strokeWidth??.3,v=>commitAppearance({strokeWidth:v}),.01,20,.05)
      select(stroke,"Stroke style",["solid","dashed","dotted"].map(v=>({value:v,label:v[0].toUpperCase()+v.slice(1)})),()=>appearance().strokeStyle??"solid",v=>commitAppearance({strokeStyle:v as ObjectAppearance["strokeStyle"]}))
    }else{
      const c=card("Text")
      check(c,"Show text",()=>text()!.visible,v=>commitText({visible:v}))
      const r=row(c,"Content"),content=document.createElement("input");content.type="text";content.maxLength=2000;content.className="customisation-number";content.setAttribute("aria-label","Text content");r.append(content)
      content.addEventListener("input",()=>commitText({content:content.value.slice(0,2000)}));syncs.push(()=>{if(document.activeElement!==content)content.value=text()!.content})
      select(c,"Font family",[{value:"Arial",label:"Original (Arial)"},...Object.entries(FONT_GROUPS).flatMap(([group,fonts])=>fonts.map(f=>({value:f,label:f,group})))],()=>text()!.family,v=>commitText({fontFamily:v}))
      const fontStatus=document.createElement("p");fontStatus.className="customisation-category-note";fontStatus.setAttribute("data-font-status","true");fontStatus.setAttribute("role","status");c.append(fontStatus)
      select(c,"Font weight",[{value:"400",label:"Regular"},{value:"700",label:"Bold"}],()=>String(text()!.weight),v=>commitText({fontWeight:Number(v) as 400|700}))
      numeric(c,"Font size (pt)",()=>text()!.size/MM_PER_PT,v=>commitText({fontSizePt:v,sizeMode:"fixed"}),1,300,.25)
      const mode=document.createElement("p");mode.className="customisation-category-note";c.append(mode);syncs.push(()=>{mode.textContent=text()!.fixed?"Fixed size — parent resizing keeps this size.":"Auto scaling — follows parent size."})
      const reset=document.createElement("button");reset.type="button";reset.className="customise-reset";reset.textContent="Reset to Auto Scaling";reset.addEventListener("click",()=>commitText({sizeMode:"auto"}));c.append(reset)
      colour(c,"Text colour",()=>text()!.color,v=>commitText({color:v}))
      numeric(c,"Text opacity (%)",()=>100*text()!.opacity,v=>commitText({opacity:v/100}),0,100,1)
      select(c,"Text alignment",["left","centre","right"].map(v=>({value:v,label:v[0].toUpperCase()+v.slice(1)})),()=>text()!.align,v=>commitText({align:v as ElementTextStyle["align"]}))
      numeric(c,"Text X (%)",()=>text()!.x,v=>commitText({x:v}),-200,300,1)
      numeric(c,"Text Y (%)",()=>text()!.y,v=>commitText({y:v}),-200,300,1)
      const edit=document.createElement("button");edit.type="button";edit.className="customise-reset";edit.textContent="Edit text on canvas";edit.addEventListener("click",()=>window.dispatchEvent(new CustomEvent("kyza:edit-text",{detail:{id:box!.id,key:part}})));c.append(edit)
    }
    syncs.forEach(f=>f())
  }
  const refresh=()=>{
      const box=currentBox();const next=ids.join("|")+":"+part+":"+(box?.kind??"")
    if(signature!==next){signature=next;draw()}else syncs.forEach(f=>f())
  }
  return {element:root,refresh,setSelection(next:string[],key?:string){if(ids.join()!==next.join())part="parent";ids=next;if(key)part=key;refresh()}}
}
