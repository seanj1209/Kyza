import type { SelectionStore } from "../state/selectionStore"
import { collectMeasureEdges, visibleEdge, transformPoint } from "./measureSnapping"
import { directionalDimensions, alignmentDimensions, type MeasureRect, type MeasureDirection, type DynamicDimension } from "./dynamicMeasureGeometry"
import { clearMeasurementAnnotations, renderDynamicDimensions, renderElementReadout } from "./measurementAnnotations"
import { formatMeasurement } from "./canvasViewport"

const identityAttributes = [
  ["data-zone-id","safe-zone:"], ["data-box-id","attribute-box:"], ["data-window-id","window:"],
  ["data-eye-index","eye-mark:"], ["data-line-id","fold-line:"], ["data-lane-index","perf-lane:"],
  ["data-slot-id","hanger-slot:"], ["data-cutout-id","half-moon:"], ["data-seal-side","seal:"]
] as const

function identity(node: Element): string | null {
  for (const [attribute,prefix] of identityAttributes) {
    const value = node.getAttribute(attribute)
    if (value !== null) return prefix+value
  }
  return node.getAttribute("data-selectable-id") ?? node.closest("[data-selection-id]")?.getAttribute("data-selection-id") ?? null
}

/** Convert actual rendered geometry to root SVG millimetres, including stepped groups/rotation. */
export function renderedBounds(svg: SVGSVGElement, node: SVGGraphicsElement): MeasureRect | null {
  try {
    const box = node.getBBox(), matrix = node.getScreenCTM(), root = svg.getScreenCTM()
    if (!matrix || !root) return null
    const local = root.inverse().multiply(matrix)
    const points = [[box.x,box.y],[box.x+box.width,box.y],[box.x,box.y+box.height],[box.x+box.width,box.y+box.height]].map(([x,y])=>transformPoint({x,y},local))
    const x = Math.min(...points.map(p=>p.x)), y = Math.min(...points.map(p=>p.y))
    return {x,y,width:Math.max(...points.map(p=>p.x))-x,height:Math.max(...points.map(p=>p.y))-y}
  } catch { return null }
}

/** Measure to a visible contour at the moving object's centre-line, not the
 * empty corners of an arc/diagonal path's bounding box. */
export function contourDimension(svg:SVGSVGElement,node:SVGGeometryElement,object:MeasureRect,direction:MeasureDirection):DynamicDimension|null {
  try {
    const matrix=node.getScreenCTM(),root=svg.getScreenCTM(),length=node.getTotalLength()
    if(!matrix||!root||!length)return null
    const local=root.inverse().multiply(matrix)
    const horizontal=direction==='left'||direction==='right'
    const cross=horizontal?object.y+object.height/2:object.x+object.width/2
    const start=horizontal?object.x+(direction==='right'?object.width:0):object.y+(direction==='bottom'?object.height:0)
    const negative=direction==='left'||direction==='top'
    const count=Math.min(512,Math.max(64,Math.ceil(length)))
    const points=Array.from({length:count+1},(_,i)=>transformPoint(node.getPointAtLength(length*i/count),local))
    const intersections:number[]=[]
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],from=horizontal?a.y:a.x,to=horizontal?b.y:b.x
      // Separate SVG subpaths have no physical segment between them. Sampling
      // across a move-to would otherwise invent a straight measurement edge.
      if(Math.hypot(b.x-a.x,b.y-a.y)>2*length/count)continue
      if((cross-from)*(cross-to)>0)continue
      const t=Math.abs(to-from)<1e-9?0:(cross-from)/(to-from)
      intersections.push(horizontal?a.x+(b.x-a.x)*t:a.y+(b.y-a.y)*t)
    }
    const stroke=Math.max(0,Number(node.getAttribute('stroke-width')??0))/2
    const edges=intersections.map(value=>value+(negative?stroke:-stroke)).filter(value=>negative?value<=start+.001:value>=start-.001)
    if(!edges.length)return null
    const edge=negative?Math.max(...edges):Math.min(...edges)
    return {x1:horizontal?start:cross,y1:horizontal?cross:start,x2:horizontal?edge:cross,y2:horizontal?cross:edge,distance:Math.abs(edge-start),direction}
  }catch{return null}
}

export function attachDynamicElementMeasures(svg: SVGSVGElement, store: SelectionStore) {
  svg.setAttribute("data-dynamic-measures","true")
  let held = false, drag: {id:string; mode:"move"|"resize"|"rotate"; x:number; y:number; dx:number; dy:number; pointerId:number; stepX:number} | null = null
  let destroyed = false
  const editable = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('input,textarea,select,[contenteditable="true"]'))
  const stop = () => { held = false; drag = null; clearMeasurementAnnotations(svg) }
  const draw = () => {
    if (destroyed || !svg.isConnected) return
    if (!store.getState().selectionMode || svg.getAttribute("data-pan-enabled")==="true" || svg.getAttribute("data-measure-enabled")==="true") { stop(); return }
    const ids = drag ? [drag.id] : held ? store.getState().selectedElementIds : []
    const edges = collectMeasureEdges(svg).filter(visibleEdge)
    let readout: {box:MeasureRect; value:string} | null = null
    const dimensions = ids.flatMap(id => {
      // Perf annotations belong exclusively to the Base > Perf measures toggle.
      if (id.startsWith("perf-lane:") || id === "layer:perf-lines" || /^layer:(gusset-|kseal-)/.test(id)) return []
      const nodes = edges.filter(node => identity(node)===id || (id.startsWith("layer:") && node.closest("[data-layer-id]")?.getAttribute("data-layer-id")===id.slice(6)))
      if (!nodes.length) return []
      // Pick the rendered instance that started the drag; don't merge stepped copies into one box.
      const candidates = nodes.map(node=>({node,box:renderedBounds(svg,node)})).filter(item=>item.box !== null)
      if (!candidates.length) return []
      const anchor = drag ? candidates.reduce((a,b)=>Math.abs(b.box!.x-drag!.stepX)<Math.abs(a.box!.x-drag!.stepX)?b:a) : candidates[0]
      const object = anchor.box!
      if (drag && drag.mode !== "move") {
        // The hanger editor owns its single model-dimension label. Its SVG path
        // uses normalized coordinates, so getBBox() is not a physical size.
        if (id.startsWith("hanger-slot:") && drag.mode === "resize") return []
        const box = anchor.node.getBBox()
        const zoom = Number(svg.getAttribute("data-canvas-zoom") ?? 1)
        if (drag.mode === "resize") {
          readout = {box:object,value:`${formatMeasurement(box.width,zoom)} × ${formatMeasurement(box.height,zoom)} mm`}
        } else {
          const matrix = anchor.node.getScreenCTM(), root = svg.getScreenCTM()
          const local = matrix && root ? root.inverse().multiply(matrix) : null
          const degrees = local ? (Math.atan2(local.b,local.a)*180/Math.PI+360)%360 : 0
          readout = {box:object,value:`${degrees.toFixed(1)}°`}
        }
        return []
      }
      const otherEdges=edges.filter(node=>!ids.includes(identity(node)??"") && !nodes.includes(node))
      const contours=otherEdges.filter(node=>['gusset-arc','kseal-arm'].includes(node.getAttribute('data-role')??''))
      const references = otherEdges.filter(node=>!contours.includes(node)).map(node=>renderedBounds(svg,node)).filter((box):box is MeasureRect=>box!==null)
      // A Paper Strip editor is one repeat, not the enclosing multi-step sheet.
      // Construction lives in the outer SVG; bring only this repeat's bounds in.
      if(svg.getAttribute("data-paper-step-index")!==null || svg.getAttribute("data-repeat-index")!==null){
        const meta=svg.querySelector('#attribute_boxes')
        const n=(key:string)=>Number(meta?.getAttribute(key)??0)
        references.push({x:0,y:0,width:n("data-cutter-width"),height:n("data-cutter-height")})
        references.push({x:n("data-live-origin-x"),y:n("data-live-origin-y"),width:n("data-live-width"),height:n("data-live-height")})
      }
      const preference=(attribute:string)=>typeof document==="undefined" || document.documentElement.getAttribute(attribute)!=="false"
      const aligned=alignmentDimensions(object,references,preference("data-centre-guides"),preference("data-squared-guides"))
      const directions=new Set(aligned.map(d=>d.direction).filter(Boolean))
      const normal=directionalDimensions(object,references,drag?.dx??0,drag?.dy??0,held).filter(d=>!directions.has(d.direction))
      const requested:MeasureDirection[]=held?['left','right','top','bottom']:[...(Math.abs(drag?.dx??0)>.001?[drag!.dx<0?'left' as const:'right' as const]:[]),...(Math.abs(drag?.dy??0)>.001?[drag!.dy<0?'top' as const:'bottom' as const]:[])]
      const direct=requested.flatMap(direction=>{
        const best=contours.map(node=>contourDimension(svg,node,object,direction)).filter((item):item is DynamicDimension=>item!==null).sort((a,b)=>a.distance-b.distance)[0]
        return best?[best]:[]
      })
      const directDirections=new Set(direct.map(item=>item.direction))
      return [...normal.filter(item=>!directDirections.has(item.direction)),...aligned.filter(item=>!directDirections.has(item.direction)),...direct]
    })
    if (readout) renderElementReadout(svg,readout.box,readout.value)
    else renderDynamicDimensions(svg,dimensions)
  }
  const onDown = (event: PointerEvent) => {
    if (destroyed || !svg.isConnected || event.altKey || event.button!==0 || !store.getState().selectionMode || svg.getAttribute("data-pan-enabled")==="true" || svg.getAttribute("data-measure-enabled")==="true") return
    const target = event.target instanceof Element ? event.target.closest("[data-role]") : null
    if (!target) return
    const id = identity(target)
    if (!id) return
    const root = svg.getScreenCTM()
    const point = root ? transformPoint({x:event.clientX,y:event.clientY},root.inverse()) : {x:0,y:0}
    const role = target.getAttribute("data-role") ?? ""
    const mode = role.includes("rotate") ? "rotate" : role.includes("handle") && !role.includes("move") ? "resize" : "move"
    drag = {id,mode,x:event.clientX,y:event.clientY,dx:0,dy:0,pointerId:event.pointerId,stepX:point.x}
    if (mode !== "move") queueMicrotask(draw)
  }
  const onMove = (event: PointerEvent) => {
    if (!drag || drag.pointerId!==event.pointerId) return
    const dx = event.clientX-drag.x, dy = event.clientY-drag.y
    if (Math.abs(dx)+Math.abs(dy)>0.1) {
      drag.dx = dx; drag.dy = dy; drag.x = event.clientX; drag.y = event.clientY
    }
    // Existing interaction listeners update rendered geometry first, then this reads it.
    queueMicrotask(draw)
  }
  const onUp = () => { drag = null; clearMeasurementAnnotations(svg); if (held) queueMicrotask(draw) }
  const onKeyDown = (event: KeyboardEvent) => {
    if (editable(event.target)) return
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==="m") {event.preventDefault();held=true;draw()}
    if (event.key==="Escape") stop()
  }
  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key.toLowerCase()==="m" || event.key==="Control" || event.key==="Meta") {held=false;if(!drag)clearMeasurementAnnotations(svg)}
  }
  const unsubscribe = store.subscribe(()=>{if(held)draw();else if(!store.getState().selectedElementIds.length)stop()})
  svg.addEventListener("pointerdown",onDown)
  svg.addEventListener("pointermove",onMove)
  window.addEventListener("pointerup",onUp)
  window.addEventListener("pointercancel",stop)
  window.addEventListener("blur",stop)
  window.addEventListener("keydown",onKeyDown)
  window.addEventListener("keyup",onKeyUp)
  svg.addEventListener("canvasviewportchange",draw)
  return {destroy(){destroyed=true;stop();unsubscribe();svg.removeAttribute("data-dynamic-measures");svg.removeEventListener("pointerdown",onDown);svg.removeEventListener("pointermove",onMove);svg.removeEventListener("canvasviewportchange",draw);window.removeEventListener("pointerup",onUp);window.removeEventListener("pointercancel",stop);window.removeEventListener("blur",stop);window.removeEventListener("keydown",onKeyDown);window.removeEventListener("keyup",onKeyUp)}}
}
