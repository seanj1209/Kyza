import type { PerfSpec } from "../../../apps/web/src/types/perfs"
/** Customer working trigger, not a certified machine minimum. Never blocks output. */
export const LASER_LANE_REVIEW_SPACING_MM = 150
export function laserLaneSpacingAdvice(perfs?:PerfSpec):string|null {
  if(!perfs?.lanes || perfs.lanes.length<2)return null
  const xs=perfs.lanes.map(l=>l.originX).filter(Number.isFinite).sort((a,b)=>a-b)
  const gap=Math.min(...xs.slice(1).map((x,i)=>x-xs[i]))
  if(gap>=LASER_LANE_REVIEW_SPACING_MM+1)return null
  return `Microperf lanes this close require two runs through the slitter. Increase spacing to at least 151 mm for single-pass processing.`
}
