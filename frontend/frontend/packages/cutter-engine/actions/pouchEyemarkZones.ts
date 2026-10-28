import type { FlowwrapSpec } from "../../../apps/web/src/types/flowwrap"
import { resolveKSealPouchGeometry, buildKSealEyeMarkRects } from "../../../apps/web/src/geometry/kSealPouchGeometry"
import { buildEyeMarkRects } from "../../../apps/web/src/geometry/eyeMarks"
import { resolveDoyBounds } from "../../../apps/web/src/core/geometry/resolvers/doyBounds"
type Rect={x:number;y:number;width:number;height:number}
const inside=(r:Rect,b:Rect)=>r.x>=b.x-1e-6 && r.y>=b.y-1e-6 && r.x+r.width<=b.x+b.width+1e-6 && r.y+r.height<=b.y+b.height+1e-6
/** Shared rendering/validation evidence: single central mark, or marks wholly in outer trim. */
export function pouchEyemarkPlacements(spec:FlowwrapSpec){
  if(!spec.eyeMarks || !(spec.doyPouch || spec.kSealPouch))return null
  const k=spec.kSealPouch?resolveKSealPouchGeometry(spec):null
  const trim=k?k.trimWidth:spec.doyPouch?.trimEnabled?spec.doyPouch.trim??15:0
  const width=k?k.width:spec.width+2*trim,height=k?k.height:spec.height
  const left=spec.seals?.left??spec.seal,right=spec.seals?.right??spec.seal
  const doy=k?null:resolveDoyBounds(spec,{originX:trim,liveOriginX:trim+left,liveWidth:spec.width-left-right,cutterWidth:spec.width})
  const center:Rect=k?{x:k.gussetLeftX,y:k.sideSeal,width:k.gussetWidth,height:k.height-2*k.sideSeal}:
    {x:doy!.gussetLeftX,y:0,width:doy!.gussetWidth,height}
  const cutter={x:0,y:0,width,height}
  const bands=trim>0?[{x:0,y:0,width:trim,height},{x:width-trim,y:0,width:trim,height}]:[]
  const rects=k?buildKSealEyeMarkRects(spec,k):buildEyeMarkRects(spec.eyeMarks,0,0,width,height)
  return {cutter,center,bands,placements:rects.map((rect,index)=>({
    rect,index,inside:inside(rect,cutter),
    allowed:inside(rect,cutter) && ((spec.eyeMarks!.count===1 && inside(rect,center)) || bands.some(b=>inside(rect,b)))
  }))}
}
