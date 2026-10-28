import type { FlowwrapSpec } from "../types/flowwrap"
const NS="http://www.w3.org/2000/svg"
/** Deterministic, lightweight paper grain. No bitmap or animated SVG filter. */
export function applySubstrateAppearance(svg:SVGSVGElement,spec:FlowwrapSpec) {
  const substrate=spec.substrate??"clear",paper=["paper","white-paper","black-paper"].includes(substrate)
  const fill=substrate==="black-paper"?"#343230":substrate==="white-paper"?"#f3f0e9":substrate==="paper"?(["#8b5a2b", "#cdb89c"].includes((spec.paperStrip?.paperColor??"").toLowerCase())?"#d6c3a6":spec.paperStrip?.paperColor??"#d6c3a6"):substrate==="white"?"#f5f5f5":"#b9dfe8"
  if(substrate==="black-paper"){
    // Lift the default dark BBE/barcode/QR ink against black paper. Explicit
    // element appearance is applied later and still wins over this default.
    svg.querySelectorAll<SVGElement>('[data-layer-id="notes"] [stroke="#1a2a49"],[data-layer-id="notes"] [fill="#1a2a49"]').forEach(node=>{
      for(const attribute of ["stroke","fill"])if(node.getAttribute(attribute)==="#1a2a49")node.setAttribute(attribute,"#f3f0e9")
    })
  }
  svg.querySelectorAll<SVGRectElement>('[data-layer-id="substrate"] > rect:not([data-paper-grain])').forEach(rect=>{
    rect.setAttribute("fill",fill);rect.setAttribute("opacity",paper?".9":substrate==="clear"?".6":".35")
    if(!paper)return
    let pattern=svg.querySelector<SVGPatternElement>("#paper-grain-pattern")
    if(!pattern){
      const defs=document.createElementNS(NS,"defs");pattern=document.createElementNS(NS,"pattern")
      pattern.id="paper-grain-pattern";pattern.setAttribute("patternUnits","userSpaceOnUse");pattern.setAttribute("width","8");pattern.setAttribute("height","8")
      pattern.innerHTML='<path d="M1 2h.7m3 3h.9m-4 2h.6m5-6h.5" stroke="'+(substrate==="black-paper"?"#fff":"#655648")+'" stroke-opacity=".04" stroke-width=".18"/>'
      defs.appendChild(pattern);svg.insertBefore(defs,svg.firstChild)
    }
    const grain=rect.cloneNode(false) as SVGRectElement
    grain.setAttribute("data-paper-grain","true");grain.setAttribute("fill","url(#paper-grain-pattern)");grain.setAttribute("opacity","1");grain.setAttribute("pointer-events","none")
    rect.after(grain)
  })
}
