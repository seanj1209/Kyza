import type { FlowwrapSpec } from "../types/flowwrap"
import { customMeasureTarget, resolveAppearance } from "./elementAppearance"
import { measureLength, measureName, validCustomMeasures, type CustomMeasure } from "../geometry/customMeasures"

const NS="http://www.w3.org/2000/svg"
/** One renderer for preview and vector/PDF exports. Interaction handles are separate. */
export function drawCustomMeasure(group:SVGGElement,m:CustomMeasure,spec:FlowwrapSpec) {
  group.replaceChildren()
  const a=resolveAppearance(customMeasureTarget(m,spec),spec.elementAppearance?.[`custom-measure:${m.id}`])
  const length=measureLength(m),number=measureName(m),withUnit=number+"mm",font=a.fontSize
  const unitWidth=withUnit.length*font*.62+font,numberWidth=number.length*font*.62+font
  const mode=length>=unitWidth?"inline":length>=numberWidth?"number":"callout"
  const label=mode==="inline"?withUnit:number,mid=length/2,cap=Math.max(1.5,font*.5)
  let angle=Math.atan2(m.end.y-m.start.y,m.end.x-m.start.x)*180/Math.PI
  let start=m.start
  // Keep labels upright while preserving the same two physical endpoints.
  if(angle>90||angle< -90){start=m.end;angle=angle>90?angle-180:angle+180}
  group.setAttribute("transform",`translate(${start.x} ${start.y}) rotate(${angle})`)
  group.setAttribute("data-length-mm",String(length));group.setAttribute("data-label-mode",mode)
  group.setAttribute("data-measure-label",number)
  const make=(tag:"path"|"text",attrs:Record<string,string|number>)=>{const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));group.append(n);return n}
  let d=`M0 ${-cap}V${cap}M${length} ${-cap}V${cap}`
  if(mode==="callout")d+=`M0 0H${length}M${mid} 0V${-font*2.5}H${length+font*1.2}`
  else {const gap=label.length*font*.62/2+font*.35;d+=`M0 0H${Math.max(0,mid-gap)}M${Math.min(length,mid+gap)} 0H${length}`}
  make("path",{d,fill:"none",stroke:a.color,"stroke-width":a.thickness,opacity:a.opacity,"data-role":"custom-measure-dimension"})
  const text=make("text",{x:mode==="callout"?length+font*1.4:mid,y:mode==="callout"?-font*2.5:0,
    "dominant-baseline":"central","text-anchor":mode==="callout"?"start":"middle","font-size":font,"font-family":"Arial, sans-serif",fill:a.color,opacity:a.opacity,"data-role":"custom-measure-label"})
  text.textContent=label
}
export function renderCustomMeasures(svg:SVGSVGElement,spec:FlowwrapSpec) {
  const measures=validCustomMeasures(spec);if(!measures.length)return svg
  const layer=document.createElementNS(NS,"g");layer.id="custom_dimensions";layer.setAttribute("data-layer-id","custom-measures")
  for(const m of measures){const group=document.createElementNS(NS,"g");group.setAttribute("data-role","custom-measure");group.setAttribute("data-custom-measure-id",m.id);group.setAttribute("data-selectable-id",`custom-measure:${m.id}`);drawCustomMeasure(group,m,spec);layer.append(group)}
  svg.append(layer)
  // Extend only the sheet bounds; never scale or change construction geometry.
  const vb=svg.viewBox.baseVal,old={x:vb.x,y:vb.y,width:vb.width,height:vb.height}
  let left=old.x,top=old.y,right=old.x+old.width,bottom=old.y+old.height
  for(const m of measures){const font=resolveAppearance(customMeasureTarget(m,spec),spec.elementAppearance?.[`custom-measure:${m.id}`]).fontSize
    const pad=(measureName(m).length+4)*font
    left=Math.min(left,m.start.x-pad,m.end.x-pad);top=Math.min(top,m.start.y-pad,m.end.y-pad)
    right=Math.max(right,m.start.x+pad,m.end.x+pad);bottom=Math.max(bottom,m.start.y+pad,m.end.y+pad)
  }
  svg.setAttribute("viewBox",`${left} ${top} ${right-left} ${bottom-top}`)
  if(svg.getAttribute("width")?.endsWith("mm"))svg.setAttribute("width",`${right-left}mm`)
  if(svg.getAttribute("height")?.endsWith("mm"))svg.setAttribute("height",`${bottom-top}mm`)
  return svg
}
