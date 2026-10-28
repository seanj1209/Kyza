import type { FlowwrapSpec } from "../types"
import { buildKSealEyeMarkRects, resolveKSealPouchGeometry } from "../../../apps/web/src/geometry/kSealPouchGeometry"
import { buildEyeMarkRects } from "../../../apps/web/src/geometry/eyeMarks"
import { DEFAULT_EYEMARK_EDGE_CLEARANCE_MM } from "../../../apps/web/src/geometry/eyemarkPlacement"

export type EyemarkPositionAction = "switch" | "top" | "mid" | "bottom" | "centre"
export function eyemarkPositionActions(source:FlowwrapSpec,packId?:string):EyemarkPositionAction[] {
  if(packId==="sachet-4-side-seal")return source.eyeMarks?.count?['centre']:[]
  return source.eyeMarks?.count===1 && packId!=="sachet-3-side-seal"?["switch","top","mid","bottom"]:["top","mid","bottom"]
}

/** Preserves both mark sizes/state; positioning always goes through engine geometry. */
export function positionEyemarks(source: FlowwrapSpec, action: EyemarkPositionAction, packId?:string): FlowwrapSpec | null {
  const eye = source.eyeMarks
  if (!eye || eye.count<1 || eye.count>2 || !eyemarkPositionActions(source,packId).includes(action)) return null
  if(packId==="sachet-4-side-seal"){
    if(action!=="centre" || (Math.abs(eye.offsetX??0)<.001 && Math.abs(eye.offsetY??0)<.001))return null
    return {...source,eyeMarks:{...eye,offsetX:0,offsetY:0,manualPositioned:false}}
  }
  // Position presets can be stale after a manual drag; preserve the actual side.
  const kSealGeometry = source.kSealPouch ? resolveKSealPouchGeometry(source) : null
  const currentRect = kSealGeometry
    ? buildKSealEyeMarkRects(source, kSealGeometry)[0]
    : buildEyeMarkRects(eye, 0, 0, source.width, source.height)[0]
  // Offsets are relative to the selected anchor; their sign alone does not
  // tell which side the mark is on. Compare the actual resolved mark position.
  const right = currentRect
    ? currentRect.x + currentRect.width / 2 >= (kSealGeometry?.width ?? source.width) / 2
    : eye.position.includes("right")
  const vertical = eye.position.includes("bottom") ? "bottom" : eye.position.includes("top") ? "top" : "centre"
  const side = action==="switch" ? (right ? "left" : "right") : (right ? "right" : "left")
  const position = eye.count===2 ? (action==="mid" ? "centre" : action==="switch" ? vertical : action)
    : `${action==="switch" ? vertical : action==="mid" ? "centre" : action}-${side}` as typeof eye.position
  let next = {...eye,position,offsetX:0,offsetY:0,offsetX2:0,offsetY2:0,manualPositioned:false,manualPositioned2:false}
  if (source.kSealPouch) {
    const geometry = kSealGeometry!
    const clearance = DEFAULT_EYEMARK_EDGE_CLEARANCE_MM
    // K-seal marks use the existing centre/trim-track renderer, so express vertical placement as offsets.
    if (action==="switch") {
      if (!geometry.trimEnabled || eye.width+2*clearance>geometry.trimWidth) return null
      const targetX = side==="left" ? geometry.trimWidth/2 : geometry.width-geometry.trimWidth/2
      next.offsetX = targetX-geometry.centerX
    } else {
      for (const index of [0,1]) {
        if (index>=eye.count) break
        const height = index===1 ? eye.height2 ?? eye.height : eye.height
        const y = action==="top" ? clearance : action==="bottom" ? geometry.height-height-clearance : (geometry.height-height)/2
        const offset = y-(geometry.height-height)/2
        if (index===0) next.offsetY=offset
        else next.offsetY2=offset
      }
      if (eye.count===1) next.offsetX=eye.offsetX ?? 0
    }
  }
  return {...source,eyeMarks:next}
}
