import type { FlowwrapSpec } from "../types/flowwrap"

export type MeasurePoint = { x:number; y:number }
/** Endpoints live in root SVG millimetres, independent of the viewport transform. */
export type CustomMeasure = { id:string; start:MeasurePoint; end:MeasurePoint; repeatMode?:"mono"|"all" }
export const measureLength = (m:CustomMeasure) => Math.hypot(m.end.x-m.start.x,m.end.y-m.start.y)
export const measureName = (m:CustomMeasure) => String(Number(measureLength(m).toFixed(2)))
export function validCustomMeasures(spec:FlowwrapSpec):CustomMeasure[] {
  return (Array.isArray(spec.customMeasures)?spec.customMeasures:[]).slice(0,100).filter(m=>
    m && typeof m.id==="string" && /^[a-zA-Z0-9_-]{1,100}$/.test(m.id) &&
    [m.start?.x,m.start?.y,m.end?.x,m.end?.y].every(n=>typeof n==="number"&&Number.isFinite(n)&&Math.abs(n)<=100000) && measureLength(m)>=.001)
}
