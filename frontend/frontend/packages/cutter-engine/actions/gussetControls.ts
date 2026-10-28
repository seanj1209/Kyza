import type { FlowwrapSpec } from "../types"
import { resolveKSealPouchGeometry } from "../../../apps/web/src/geometry/kSealPouchGeometry"
import { centreKSealTacHoles } from "../../../apps/web/src/rules/kSealTacHoleRules"
import { PARAMETER_CONSTRAINTS } from "../../../apps/web/src/core/model/parameterSchema"
import { constrainDoyGeometry, clampDoyGussetDepth, clampDoyOvalWidth, DOY_CENTER_GAP_MM, GUSSET_DEPTH_TO_ARC_RATIO, resolveDoyBounds, toDegrees } from "../../../apps/web/src/core/geometry/resolvers/doyBounds"
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n))
export type GussetControl = "sideSeal" | "bottomSeal" | "gussetSize" | "armDegree" | "armWidth" | "sync"
export function updateGussetControl(spec:FlowwrapSpec,key:GussetControl,value:number|boolean):FlowwrapSpec {
  if(typeof value==="number" && !Number.isFinite(value))return spec
  if(spec.kSealPouch){
    const geometry=resolveKSealPouchGeometry(spec),next={...spec.kSealPouch},limits=PARAMETER_CONSTRAINTS.kSeal
    if(key==="sync")next.gussetSync=Boolean(value)
    else if(key==="sideSeal" || key==="armWidth")next[key]=clamp(Number(value),limits[key].min,limits[key].max)
    else if(key==="bottomSeal")next.bottomSeal=Math.max(limits.bottomSeal.min,Number(value))
    else if(key==="gussetSize")next.gussetSize=next.gussetDepth=Math.max(limits.gussetSize.min,Number(value))
    else if(key==="armDegree"){next.armDegree=clamp(Number(value),30,60);next.customArmDegreeEnabled=true}
    if(next.gussetSync){
      if(["sideSeal","bottomSeal","armWidth","sync"].includes(key)){
        const size=clamp(key==="sync"?geometry.sideSeal:Number(value),Math.max(limits.sideSeal.min,limits.armWidth.min),Math.min(limits.sideSeal.max,limits.armWidth.max))
        next.sideSeal=next.sealWidth=next.bottomSeal=next.armWidth=size
      }
      if(key==="gussetSize" || key==="sync"){
        next.armDegree=clamp(toDegrees(Math.atan2(geometry.shoulderHeight,Math.max(.001,next.gussetSize??geometry.gussetSize))),30,60)
        next.customArmDegreeEnabled=true
      }
    }
    const result={...spec,kSealPouch:next},g=resolveKSealPouchGeometry(result)
    return centreKSealTacHoles({...result,width:g.renderedWidth,height:g.renderedHeight,seal:g.sideSeal,seals:{top:g.sideSeal,bottom:g.sideSeal,left:g.trimWidth,right:g.trimWidth}})
  }
  if(!spec.doyPouch)return spec
  const next={...spec.doyPouch}
  const previousCenterWidth=next.panelWidths.center??DOY_CENTER_GAP_MM
  if(key==="sync")next.gussetSync=Boolean(value)
  if(key==="bottomSeal"){
    next.bottomSeal=Math.max(0,Number(value))
    next.arcOffsetX=0
  }
  if(key==="sync" && next.gussetSync)next.arcOffsetX=0
  if(key==="sideSeal")return constrainDoyGeometry({...spec,seal:Math.max(0,Number(value)),seals:{...spec.seals,top:Math.max(0,Number(value)),bottom:Math.max(0,Number(value))}})
  if(key==="gussetSize")next.panelWidths={...next.panelWidths,center:Math.max(next.gussetSync===false?5:13.5,Number(value))*2}
  if(next.gussetSync!==false && ["gussetSize","bottomSeal","sync"].includes(key)){
    const sealAllowance=2*(next.bottomSeal??7.5)
    const requestedHalfWidth=Math.min(63,Math.max(13.5,(next.panelWidths.center??DOY_CENTER_GAP_MM)/2))
    const clearHalfWidth=Math.max(0,requestedHalfWidth-sealAllowance/2)
    next.panelWidths={...next.panelWidths,center:requestedHalfWidth*2}
    next.ovalWidth=clampDoyOvalWidth(clearHalfWidth*2,spec.width)
    next.gussetDepth=clampDoyGussetDepth(clearHalfWidth*2/GUSSET_DEPTH_TO_ARC_RATIO)
  }
  return constrainDoyGeometry({...spec,width:spec.width+(next.panelWidths.center-previousCenterWidth),doyPouch:next})
}
export function doySideAngle(spec:FlowwrapSpec){
  const left=spec.seals?.left??spec.seal,right=spec.seals?.right??spec.seal
  const layout=resolveDoyBounds(spec,{originX:0,liveOriginX:left,liveWidth:Math.max(1,spec.width-left-right),cutterWidth:spec.width})
  return layout?toDegrees(Math.atan2(layout.arcInsetDepth,Math.max(1,spec.height/2))):29
}
