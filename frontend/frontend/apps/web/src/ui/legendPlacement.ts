import type { FlowwrapSpec } from "../types/flowwrap"
import { legendScale } from "../renderers/cutterLegend"

/** Presentation-only controls. The saved preference never changes pack geometry. */
export function attachLegendPlacement(svg: SVGSVGElement, spec: FlowwrapSpec, commit: (next: FlowwrapSpec) => void) {
  const legend = svg.querySelector<SVGGElement>("#cutter_legend")
  if (!legend) return
  const NS = "http://www.w3.org/2000/svg"
  const controls = document.createElementNS(NS, "g")
  controls.setAttribute("data-export-ui", "true")
  controls.setAttribute("data-role", "legend-placement-controls")
  controls.style.display = "none"
  const landscape = spec.cutterLegendOrientation === "landscape"
  const face = legend.querySelector<SVGRectElement>("rect")!
  const width = Number(face.getAttribute("width")), height = Number(face.getAttribute("height"))
  const border = document.createElementNS(NS, "rect")
  for (const [k,v] of Object.entries({width,height,fill:"none",stroke:"#a71920","stroke-width":1,"pointer-events":"none"})) border.setAttribute(k,String(v))
  const button = document.createElementNS(NS, "g")
  button.setAttribute("role", "button"); button.setAttribute("aria-label", "Legend actions"); button.setAttribute("aria-expanded", "false"); button.setAttribute("tabindex", "0"); button.style.cursor = "pointer"
  button.innerHTML = '<rect x="0" y="2" width="12" height="11" rx="3" fill="#a71920"/><text x="6" y="9.8" text-anchor="middle" font-size="8" fill="#fff">⋮</text>'
  const menu = document.createElementNS(NS, "g")
  menu.setAttribute("data-role", "legend-action-menu")
  menu.style.display = "none"
  menu.setAttribute("role", "menu")
  menu.innerHTML = '<g data-legend-action="switch" role="menuitem" aria-label="Switch legend position" tabindex="0"><rect x="0" y="14" width="44" height="11" rx="3" fill="#fff" stroke="#a71920" stroke-width=".4"/><text x="22" y="21.6" text-anchor="middle" font-size="4" fill="#302d2c">Switch position</text></g><g data-legend-action="resize" role="menuitem" aria-label="Resize legend" tabindex="0"><rect x="0" y="26" width="44" height="11" rx="3" fill="#fff" stroke="#a71920" stroke-width=".4"/><text x="22" y="33.6" text-anchor="middle" font-size="4" fill="#302d2c">Resize</text></g>'
  menu.style.cursor = "pointer"
  const handle = document.createElementNS(NS,"circle")
  for(const [key,value] of Object.entries({cx:width-1,cy:height-1,r:3,fill:"#a71920",stroke:"#fff","stroke-width":.6}))handle.setAttribute(key,String(value))
  handle.setAttribute("data-role","legend-resize-handle")
  handle.setAttribute("role","slider")
  handle.setAttribute("aria-label","Resize legend proportionally")
  handle.setAttribute("aria-valuemin","70")
  handle.setAttribute("aria-valuemax","250")
  handle.setAttribute("aria-valuenow",String(Math.round(legendScale(spec)*100)))
  handle.setAttribute("tabindex","0")
  handle.style.display="none"
  handle.style.cursor="nwse-resize"
  const change = () => {
    const positions: NonNullable<FlowwrapSpec["cutterLegendPosition"]>[] = landscape ? ["right", "top", "bottom"] : ["right", "top", "left"]
    const current = spec.cutterLegendPosition ?? positions[0]
    commit({ ...spec, cutterLegendPosition: positions[(positions.indexOf(current) + 1) % positions.length] })
  }
  const toggleMenu=()=>{const open=menu.style.display==="none";menu.style.display=open?"":"none";button.setAttribute("aria-expanded",String(open))}
  button.addEventListener("click", e => { e.stopPropagation(); toggleMenu() })
  button.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){e.preventDefault();toggleMenu()} })
  const choose=(target:Element|null)=>{
    const action=target?.closest('[data-legend-action]')?.getAttribute('data-legend-action')
    if(action==='switch')change()
    if(action==='resize'){handle.style.display='';handle.focus()}
    menu.style.display='none';button.setAttribute('aria-expanded','false')
  }
  menu.addEventListener("click", e => { e.stopPropagation(); choose(e.target as Element) })
  menu.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){e.preventDefault();choose(e.target as Element)} })
  const originX=Number(svg.getAttribute('data-legend-left')??0),originY=Number(svg.getAttribute('data-legend-top')??0)
  const point=(event:PointerEvent)=>{const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform(svg.getScreenCTM()!.inverse())}
  let drag:{pointerId:number;startX:number;startScale:number;scale:number}|null=null
  handle.addEventListener('pointerdown',event=>{
    event.preventDefault();event.stopPropagation()
    drag={pointerId:event.pointerId,startX:point(event).x,startScale:legendScale(spec),scale:legendScale(spec)}
    svg.setPointerCapture(event.pointerId)
  })
  svg.addEventListener('pointermove',event=>{
    if(!drag||drag.pointerId!==event.pointerId)return
    drag.scale=Math.max(.7,Math.min(2.5,drag.startScale+(point(event).x-drag.startX)/width))
    legend.setAttribute('transform',`translate(${originX} ${originY}) scale(${drag.scale})`)
    handle.setAttribute('aria-valuenow',String(Math.round(drag.scale*100)))
  })
  svg.addEventListener('pointerup',event=>{
    if(!drag||drag.pointerId!==event.pointerId)return
    const scale=drag.scale;drag=null;svg.releasePointerCapture(event.pointerId)
    if(Math.abs(scale-legendScale(spec))>.001)commit({...spec,cutterLegendScale:scale})
  })
  svg.addEventListener('pointercancel',()=>{drag=null;legend.setAttribute('transform',`translate(${originX} ${originY}) scale(${legendScale(spec)})`)})
  handle.addEventListener('keydown',event=>{
    if(event.key!=="ArrowRight"&&event.key!=="ArrowLeft")return
    event.preventDefault()
    commit({...spec,cutterLegendScale:Math.max(.7,Math.min(2.5,legendScale(spec)+(event.key==="ArrowRight"?.1:-.1)))})
  })
  controls.append(border, button, menu, handle); legend.appendChild(controls)
  svg.addEventListener("click", e => {
    if (svg.getAttribute("data-select-enabled") !== "true") return
    const target = e.target as Element
    controls.style.display = target.closest('#cutter_legend, [data-layer-id="cutter-outline"]') ? "" : "none"
    if (controls.style.display === "none") { menu.style.display="none";handle.style.display="none";button.setAttribute("aria-expanded","false") }
  })
}
