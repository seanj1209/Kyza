import { collectMeasureEdges, findMeasureEdge, type EdgeHit, type Point } from "./measureSnapping"
import { formatMeasurement, measurementReadout, referenceGridDpi } from "./canvasViewport"
import "./measureTool.css"

const NS = "http://www.w3.org/2000/svg"
const HIGHLIGHT = "#1684df"
export function attachMeasureTool(svg: SVGSVGElement, onMeasure: (value: number | null) => void) {
  let enabled=false,active=false,pointerId:number|null=null
  let start:Point={x:0,y:0},current=start,startHit:EdgeHit|null=null
  let hoverFrame=0,hoverEvent:PointerEvent|null=null
  let refreshFrame=0
  const edges=collectMeasureEdges(svg)
  const make=<K extends keyof SVGElementTagNameMap>(tag:K,attributes:Record<string,string>={})=>{
    const element=document.createElementNS(NS,tag)
    Object.entries(attributes).forEach(([key,value])=>element.setAttribute(key,value))
    return element
  }
  // Existing export sanitisation removes the entire temporary interaction layer.
  const overlay=make("g",{"data-export-ui":"true","data-role":"measure-tool-overlay","pointer-events":"none"})
  const grid=make("g",{"data-role":"measure-reference-grid"}),pinned=make("g",{"data-role":"measure-start-edge"}),hover=make("g",{"data-role":"measure-hover-edge"}),drawing=make("g",{"data-role":"measure-drawing"})
  overlay.append(grid,pinned,hover,drawing);svg.appendChild(overlay)
  const readout=document.createElement("div")
  readout.className="cutter-measure-readout";readout.hidden=true;document.body.appendChild(readout)
  const gridHost=svg.closest?.("#preview")??svg.parentElement
  const gridNote=document.createElement("div")
  gridNote.className="cutter-measure-grid-note";gridNote.hidden=true;gridHost?.appendChild(gridNote)
  const canvasGrid=document.createElement("div")
  canvasGrid.setAttribute("data-export-ui","true");canvasGrid.setAttribute("data-role","canvas-dpi-grid")
  canvasGrid.style.cssText="position:absolute;inset:14px;border-radius:16px;pointer-events:none;z-index:1;background-image:linear-gradient(to right,#6f8fa815 1px,transparent 1px),linear-gradient(to bottom,#6f8fa815 1px,transparent 1px)"
  canvasGrid.hidden=true;gridHost?.appendChild(canvasGrid)
  let line:SVGLineElement|null=null,label:SVGTextElement|null=null
  const zoom=()=>Number(svg.getAttribute("data-canvas-zoom")) || 1
  const length=()=>Math.hypot(current.x-start.x,current.y-start.y)
  const toLocal=(point:Point):Point|null=>{
    const matrix=svg.getScreenCTM();if(!matrix)return null
    try{const p=svg.createSVGPoint();p.x=point.x;p.y=point.y;return p.matrixTransform(matrix.inverse())}catch{return null}
  }
  const pxToMm=()=>{const m=svg.getScreenCTM();return m?1/Math.max(.000001,Math.hypot(m.a,m.b)):1}
  const markEdge=(group:SVGGElement,hit:EdgeHit|null,dot=false)=>{
    group.replaceChildren();if(!hit)return
    const root=svg.getScreenCTM(),matrix=hit.element.getScreenCTM();if(!root||!matrix)return
    // Recreate clipping contexts, not the source layer tree or its behaviour.
    const clips:SVGGraphicsElement[]=[]
    for(let node:SVGGraphicsElement|null=hit.element;node&&node!==svg;node=node.parentElement as unknown as SVGGraphicsElement|null){if(node.getAttribute('clip-path')?.startsWith('url('))clips.unshift(node)}
    let container=group,parentMatrix=root
    for(const owner of clips){
      const ownerMatrix=owner.getScreenCTM();if(!ownerMatrix)continue
      const c=parentMatrix.inverse().multiply(ownerMatrix)
      const wrapper=make('g',{'clip-path':owner.getAttribute('clip-path')!,transform:`matrix(${c.a} ${c.b} ${c.c} ${c.d} ${c.e} ${c.f})`})
      container.appendChild(wrapper);container=wrapper;parentMatrix=ownerMatrix
    }
    const t=parentMatrix.inverse().multiply(matrix)
    let shape:SVGElement
    if(hit.segment){shape=make("line",{x1:String(hit.segment[0].x),y1:String(hit.segment[0].y),x2:String(hit.segment[1].x),y2:String(hit.segment[1].y)})}
    else{
      shape=document.createElementNS(NS,hit.element.tagName)
      // Geometry only: no source IDs, styles, behaviour or engine metadata.
      for(const name of ['d','points','x','y','width','height','rx','ry','cx','cy','r']){const value=hit.element.getAttribute(name);if(value!==null)shape.setAttribute(name,value)}
    }
    shape.setAttribute("transform",`matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.e} ${t.f})`)
    shape.setAttribute("fill","none");shape.setAttribute("stroke",HIGHLIGHT);shape.setAttribute("stroke-width","2");shape.setAttribute("vector-effect","non-scaling-stroke");container.appendChild(shape)
    if(dot){const p=toLocal(hit.screen);if(p)group.appendChild(make("circle",{cx:String(p.x),cy:String(p.y),r:String(4*pxToMm()),fill:"white",stroke:HIGHLIGHT,"stroke-width":String(1.5*pxToMm())}))}
  }
  const resolve=(event:PointerEvent)=>{const screen={x:event.clientX,y:event.clientY};const hit=event.altKey?null:findMeasureEdge(edges,screen);return{hit,point:toLocal(hit?.screen??screen)}}
  const resizeDrawing=()=>{
    const unit=pxToMm();line?.setAttribute("stroke-width",String(1.5*unit))
    if(label){label.textContent=`${formatMeasurement(length(),zoom())} mm`;label.setAttribute("font-size",String(13*unit));label.setAttribute("x",String((start.x+current.x)/2));label.setAttribute("y",String((start.y+current.y)/2-10*unit));label.setAttribute("stroke-width",String(3*unit))}
  }
  const refreshGrid=()=>{
    grid.replaceChildren();const show=svg.getAttribute("data-reference-grid")==="true";gridNote.hidden=!show;canvasGrid.hidden=!show;if(!show)return
    const dpi=referenceGridDpi(zoom()),cell=25.4/dpi
    // Subpixel cells are grouped at wide views; finer physical cells appear
    // automatically as zoom increases. Constant-size pattern, no huge path.
    const stride=Math.max(1,Math.ceil(3*pxToMm()/cell)),spacing=cell*stride
    gridNote.textContent=`${dpi} DPI reference · ${stride===1?"1 cell":`${stride} cells / line`} = ${spacing.toFixed(4)} mm · not artwork resolution`
    grid.setAttribute("data-grid-dpi",String(dpi));grid.setAttribute("data-grid-stride",String(stride))
    const screenSpacing=spacing/pxToMm(),matrix=svg.getScreenCTM(),host=gridHost?.getBoundingClientRect?.()
    canvasGrid.style.backgroundSize=`${screenSpacing}px ${screenSpacing}px`
    // Origin follows the cutter's mm coordinate system, including pan, zoom
    // and SVG letterboxing. HTML covers the full canvas, not just the SVG box.
    canvasGrid.style.backgroundPosition=`${(matrix?.e??0)-(host?.left??0)-14}px ${(matrix?.f??0)-(host?.top??0)-14}px`
    canvasGrid.setAttribute("data-grid-dpi",String(dpi));canvasGrid.setAttribute("data-grid-stride",String(stride))
  }
  const release=()=>{if(pointerId!==null&&svg.hasPointerCapture(pointerId))svg.releasePointerCapture(pointerId);pointerId=null}
  const clear=()=>{active=false;release();drawing.replaceChildren();pinned.replaceChildren();hover.replaceChildren();line=null;label=null;startHit=null;readout.hidden=true;onMeasure(null)}
  const update=(event:PointerEvent)=>{
    const resolved=resolve(event);markEdge(hover,resolved.hit,true);if(!active||!resolved.point)return
    current=resolved.point;const dx=current.x-start.x,dy=current.y-start.y,length=Math.hypot(dx,dy);onMeasure(length)
    readout.textContent=measurementReadout(length,dx,dy,zoom())
    readout.style.left=`${Math.max(8,Math.min(event.clientX,innerWidth-460))}px`;readout.style.top=`${Math.max(65,event.clientY)}px`;readout.hidden=false
    line?.setAttribute("x2",String(current.x));line?.setAttribute("y2",String(current.y));resizeDrawing()
  }
  const down=(event:PointerEvent)=>{
    if(!enabled||event.button!==0)return
    const resolved=resolve(event);if(!resolved.point)return
    event.preventDefault();event.stopImmediatePropagation();clear();active=true;pointerId=event.pointerId;start=resolved.point;current=start;startHit=resolved.hit;markEdge(pinned,startHit,true)
    line=make("line",{x1:String(start.x),y1:String(start.y),x2:String(start.x),y2:String(start.y),stroke:HIGHLIGHT})
    label=make("text",{fill:HIGHLIGHT,"font-weight":"600","text-anchor":"middle","paint-order":"stroke",stroke:"white"});label.style.display="none"
    drawing.append(line,label);svg.setPointerCapture(event.pointerId);update(event)
  }
  const move=(event:PointerEvent)=>{if(!enabled)return;hoverEvent=event;if(!hoverFrame)hoverFrame=requestAnimationFrame(()=>{hoverFrame=0;if(hoverEvent&&enabled)update(hoverEvent)})}
  const up=(event:PointerEvent)=>{
    if(!active||event.pointerId!==pointerId)return
    // Resolve release too: the last coordinate may arrive without a move event.
    update(event);active=false;release();readout.hidden=true
    if(label){label.textContent=`${formatMeasurement(length(),zoom())} mm`;label.style.display="block"}
  }
  const cancel=()=>{if(active)clear()}
  const leave=()=>{if(!active){cancelAnimationFrame(hoverFrame);hoverFrame=0;hoverEvent=null;hover.replaceChildren()}}
  const refresh=()=>{refreshGrid();resizeDrawing();markEdge(pinned,startHit,true);hover.replaceChildren()}
  const queueRefresh=()=>{if(!refreshFrame)refreshFrame=requestAnimationFrame(()=>{refreshFrame=0;refresh()})}
  const observer=new MutationObserver(queueRefresh)
  observer.observe(svg,{attributes:true,attributeFilter:["viewBox","data-reference-grid","data-canvas-zoom"]})
  svg.addEventListener("pointerdown",down,true);svg.addEventListener("pointermove",move);svg.addEventListener("pointerup",up);svg.addEventListener("pointercancel",cancel);svg.addEventListener("lostpointercapture",cancel);svg.addEventListener("pointerleave",leave);window.addEventListener("resize",refresh);refreshGrid()
  return{
    setEnabled(next:boolean){enabled=next;svg.setAttribute("data-measure-enabled",String(next));if(!next)clear()},
    destroy(){enabled=false;clear();observer.disconnect();cancelAnimationFrame(hoverFrame);cancelAnimationFrame(refreshFrame);svg.removeEventListener("pointerdown",down,true);svg.removeEventListener("pointermove",move);svg.removeEventListener("pointerup",up);svg.removeEventListener("pointercancel",cancel);svg.removeEventListener("lostpointercapture",cancel);svg.removeEventListener("pointerleave",leave);window.removeEventListener("resize",refresh);overlay.remove();readout.remove();gridNote.remove();canvasGrid.remove()}
  }
}
