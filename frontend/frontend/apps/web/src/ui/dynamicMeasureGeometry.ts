export type MeasureRect = { x: number; y: number; width: number; height: number }
export type MeasureDirection = "left" | "right" | "top" | "bottom"
export type DynamicDimension = { x1: number; y1: number; x2: number; y2: number; distance: number; label?: string; direction?: MeasureDirection; aligned?:boolean }

/** Optional visual feedback only: never snaps or changes coordinates. */
export function alignmentDimensions(object:MeasureRect,references:MeasureRect[],centre=true,squared=true,tolerance=.25):DynamicDimension[] {
  const result:DynamicDimension[]=[]
  for(const ref of references){
    if(centre && object.x>=ref.x && object.y>=ref.y && object.x+object.width<=ref.x+ref.width && object.y+object.height<=ref.y+ref.height){
      const horizontal=Math.abs(object.x+object.width/2-ref.x-ref.width/2)<=tolerance
      const vertical=Math.abs(object.y+object.height/2-ref.y-ref.height/2)<=tolerance
      result.push(...directionalDimensions(object,[ref],0,0,true).filter(d=>(horizontal && ["left","right"].includes(d.direction!)) || (vertical && ["top","bottom"].includes(d.direction!))).map(d=>({...d,aligned:true})))
    }
    if(squared){
      for(const [a,b] of [[object.x,ref.x],[object.x+object.width,ref.x+ref.width]])if(Math.abs(a-b)<=tolerance && ref.height>0)
        result.push({x1:a,y1:Math.min(object.y,ref.y),x2:a,y2:Math.max(object.y+object.height,ref.y+ref.height),distance:0,label:"Aligned",aligned:true})
      for(const [a,b] of [[object.y,ref.y],[object.y+object.height,ref.y+ref.height]])if(Math.abs(a-b)<=tolerance && ref.width>0)
        result.push({x1:Math.min(object.x,ref.x),y1:a,x2:Math.max(object.x+object.width,ref.x+ref.width),y2:a,distance:0,label:"Aligned",aligned:true})
    }
  }
  const seen=new Set<string>()
  return result.filter(d=>{const key=[d.x1,d.y1,d.x2,d.y2].join(",");if(seen.has(key))return false;seen.add(key);return true}).slice(0,8)
}

/** Keep temporary labels legible at fitted and precision zoom, without moving their measured lines. */
export function separateMeasureLabel(box: MeasureRect, occupied: MeasureRect[], gap: number): MeasureRect {
  let result = {x:box.x,y:box.y,width:box.width,height:box.height}
  for (let i=0;i<64;i++) {
    const collisions = occupied.filter(other=>result.x<other.x+other.width+gap && result.x+result.width+gap>other.x && result.y<other.y+other.height+gap && result.y+result.height+gap>other.y)
    if (!collisions.length) return result
    result = {...result,y:Math.max(...collisions.map(other=>other.y+other.height))+gap}
  }
  return result
}

/** Display-only distances between rendered bounds; never modifies cutter geometry. */
export function directionalDimensions(object: MeasureRect, references: MeasureRect[], dx: number, dy: number, all = false): DynamicDimension[] {
  const sides: MeasureDirection[] = all ? ["left", "right", "top", "bottom"] : [
    ...(Math.abs(dx) > 0.001 ? [dx < 0 ? "left" as const : "right" as const] : []),
    ...(Math.abs(dy) > 0.001 ? [dy < 0 ? "top" as const : "bottom" as const] : [])
  ]
  return sides.flatMap(direction => {
    const horizontal = direction === "left" || direction === "right"
    const negative = direction === "left" || direction === "top"
    const start = horizontal ? object.x + (negative ? 0 : object.width) : object.y + (negative ? 0 : object.height)
    const crossStart = horizontal ? object.y : object.x
    const crossEnd = crossStart + (horizontal ? object.height : object.width)
    const candidates = references.flatMap(ref => {
      const low = horizontal ? ref.y : ref.x, high = low + (horizontal ? ref.height : ref.width)
      const overlapStart = Math.max(low, crossStart), overlapEnd = Math.min(high, crossEnd)
      if (overlapStart > overlapEnd + 0.001) return []
      const edges = horizontal ? [ref.x, ref.x + ref.width] : [ref.y, ref.y + ref.height]
      return edges.filter(edge => negative ? edge <= start + 0.001 : edge >= start - 0.001).map(edge => ({ edge, cross: (overlapStart + overlapEnd) / 2, distance: Math.abs(edge - start) }))
    }).sort((a, b) => a.distance - b.distance)
    const nearest = candidates[0]
    if (!nearest) return []
    return [{
      x1: horizontal ? start : nearest.cross, y1: horizontal ? nearest.cross : start,
      x2: horizontal ? nearest.edge : nearest.cross, y2: horizontal ? nearest.cross : nearest.edge,
      distance: nearest.distance, direction
    }]
  })
}

/** Perf distances use marker centres (pitch), not marker diameter or hit boxes. */
export function perfDimensions(points: { x: number; y: number }[], pack: MeasureRect, otherLanes: number[] = []): DynamicDimension[] {
  const unique = points.filter((p, i) => !points.slice(0, i).some(q => Math.abs(p.x-q.x)<0.001 && Math.abs(p.y-q.y)<0.001)).sort((a,b) => a.y-b.y)
  const first = unique[0]
  if (!first) return []
  const x = first.x, y = first.y
  const dims: DynamicDimension[] = [
    {x1:pack.x,y1:y,x2:x,y2:y,distance:Math.abs(x-pack.x),label:"From left"},
    {x1:x,y1:y,x2:pack.x+pack.width,y2:y,distance:Math.abs(pack.x+pack.width-x),label:"From right"},
    {x1:x,y1:pack.y,x2:x,y2:y,distance:Math.abs(y-pack.y),label:"First perf from top"}
  ]
  if (unique.length > 1) dims.push({x1:x,y1:y,x2:x,y2:unique[1].y,distance:unique[1].y-y,label:"Perf pitch"})
  const nearest = otherLanes.filter(v => Math.abs(v-x)>0.001).sort((a,b)=>Math.abs(a-x)-Math.abs(b-x))[0]
  if (nearest !== undefined) dims.push({x1:x,y1:y+4,x2:nearest,y2:y+4,distance:Math.abs(nearest-x),label:"Lane spacing"})
  return dims
}
