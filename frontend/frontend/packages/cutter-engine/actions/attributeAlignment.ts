import type { FlowwrapSpec,AttributeBoxSpec } from "../types"
import { resolveFlowwrapGeometry } from "../../../apps/web/src/geometry/flowwrapGeometry"
import { rotatedRect } from "../../../apps/web/src/geometry/annotationPlacement"

/** Explicit editor snapping, not a manufacturing tolerance. Disabled toggles leave input untouched. */
export function alignAttributePlacement(spec:FlowwrapSpec,box:AttributeBoxSpec,centre:boolean,squared:boolean,tolerance:number):AttributeBoxSpec {
  if((!centre && !squared) || !Number.isFinite(tolerance) || tolerance<=0)return box
  const {liveRect}=resolveFlowwrapGeometry(spec)
  const refs=[{x:0,y:0,width:liveRect.width,height:liveRect.height},...(spec.safeZones??[]),...(spec.windows??[]),...(spec.attributeBoxes??[])]
    .filter(r=>!("id" in r) || r.id!==box.id)
    .filter(r=>!("enabled" in r) || r.enabled!==false)
    .map(r=>rotatedRect(r,"rotation" in r?r.rotation??0:0))
  const bounds=rotatedRect(box,box.rotation??0)
  const choose=(axis:"x"|"y",size:"width"|"height")=>{
    const candidates:number[]=[]
    for(const ref of refs){
      const fits=bounds.width<=ref.width && bounds.height<=ref.height &&
        bounds.x+bounds.width/2>=ref.x && bounds.x+bounds.width/2<=ref.x+ref.width &&
        bounds.y+bounds.height/2>=ref.y && bounds.y+bounds.height/2<=ref.y+ref.height
      if(centre && fits)candidates.push(ref[axis]+ref[size]/2-bounds[size]/2)
      if(squared)candidates.push(ref[axis],ref[axis]+ref[size]-bounds[size])
    }
    const candidate=candidates.filter(n=>Math.abs(n-bounds[axis])<=tolerance).sort((a,b)=>Math.abs(a-bounds[axis])-Math.abs(b-bounds[axis]))[0]
    return candidate===undefined?0:candidate-bounds[axis]
  }
  return {...box,x:box.x+choose("x","width"),y:box.y+choose("y","height")}
}
