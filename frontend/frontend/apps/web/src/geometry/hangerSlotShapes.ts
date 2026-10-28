import type { HangerSlotSpec, HangerSlotSubtype } from "../types/flowwrap"

/** Silhouettes transcribed from Updates V2's six illustrated types; not tooling certification. */
export const HANGER_SLOT_STYLES: {id:HangerSlotSubtype;name:string}[] = [
  {id:"standard-euro-slot",name:"Standard Euro Slot"},{id:"round-hole",name:"Round Hole"},
  {id:"keyhole-slot",name:"Keyhole Slot"},{id:"keyhole-euro-slot",name:"Keyhole Euro Slot"},
  {id:"delta-slot",name:"Delta Slot"},{id:"sombrero-slot",name:"Sombrero Slot"}
]
// Normalized, centred paths. Geometry, hit target, drag preview and menu share these.
const paths:Record<Exclude<HangerSlotSubtype,"round-hole">,string> = {
  "standard-euro-slot":"M -.4 .5 A .1 .24 0 0 1 -.4 .02 H -.15 C -.13 -.68 .13 -.68 .15 .02 H .4 A .1 .24 0 0 1 .4 .5 Z",
  "keyhole-euro-slot":"M -.42 .5 A .08 .22 0 0 1 -.42 .06 H -.15 V -.04 C -.15 -.65 .15 -.65 .15 -.04 V .06 H .42 A .08 .22 0 0 1 .42 .5 Z",
  "sombrero-slot":"M -.42 .5 A .08 .21 0 0 1 -.42 .08 H -.22 C -.18 -.68 .18 -.68 .22 .08 H .42 A .08 .21 0 0 1 .42 .5 Z",
  "keyhole-slot":"M -.22 .05 A .44 .3 0 1 1 .22 .05 V .35 A .22 .15 0 0 1 -.22 .35 Z",
  "delta-slot":"M -.45 .5 Q -.58 .43 -.45 .28 L -.08 -.46 Q 0 -.54 .08 -.46 L .45 .28 Q .58 .43 .45 .5 Z"
}
export function hangerSlotPath(type:HangerSlotSubtype) {return type==="round-hole"?"":paths[type]}

// Authored path bounds are kept separately from size controls. Rotation maps
// authored Y into cutter X, and authored X into cutter Y; the asymmetric
// silhouettes must not be treated as centred rectangles after rotation.
const fallbackBounds: Record<Exclude<HangerSlotSubtype,"round-hole">,{x:number;y:number;width:number;height:number}> = {
  "standard-euro-slot": {x:-.5,y:-.68,width:1,height:1.18},
  "keyhole-euro-slot": {x:-.5,y:-.65,width:1,height:1.15},
  "sombrero-slot": {x:-.5,y:-.68,width:1,height:1.18},
  "keyhole-slot": {x:-.44,y:-.25,width:.88,height:.75},
  "delta-slot": {x:-.58,y:-.54,width:1.16,height:1.04}
}
const measuredBounds=new Map<HangerSlotSubtype,{x:number;y:number;width:number;height:number}>()

export function getHangerSlotDisplayBounds(slot:HangerSlotSpec) {
  const width=slot.width??slot.diameter,height=slot.height??slot.diameter
  if(slot.subtype==='round-hole')return {left:-slot.diameter/2,right:slot.diameter/2,top:-slot.diameter/2,bottom:slot.diameter/2}
  let bounds=measuredBounds.get(slot.subtype)
  if(!bounds && typeof document!=='undefined'){
    try {
      const path=document.createElementNS('http://www.w3.org/2000/svg','path')
      path.setAttribute('d',hangerSlotPath(slot.subtype))
      const box=path.getBBox()
      if(box.width>0 && box.height>0){bounds={x:box.x,y:box.y,width:box.width,height:box.height};measuredBounds.set(slot.subtype,bounds)}
    } catch { /* Use the conservative authored envelope outside a rendered SVG. */ }
  }
  bounds??=fallbackBounds[slot.subtype]
  return {left:bounds.y*height,right:(bounds.y+bounds.height)*height,top:-(bounds.x+bounds.width)*width,bottom:-bounds.x*width}
}

/**
 * Hanger silhouettes are authored in their production orientation, then
 * displayed sideways on the cutter. Keep rotation before the non-uniform
 * scale so the scale is applied in the silhouette's own coordinate space.
 */
export function getHangerSlotTransform(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  mirror = false
) {
  return `translate(${centerX} ${centerY}) rotate(-90) scale(${width} ${mirror ? -height : height})`
}
