import type { FlowwrapSpec, SachetStepElements } from "../types"
import { commitPaperStripStepEdit, type PaperStripMoveIntent } from "./paperStripSteps"

const keys = ["attributeBoxes", "safeZones", "windows", "hangerSlots", "halfMoonCutouts", "foldLines", "perfs"] as const
const clone = <T>(value:T):T => value === undefined ? value : JSON.parse(JSON.stringify(value))
export const sachetSynced = (spec:FlowwrapSpec) => spec.sachet?.syncMirror !== false
export function sachetStepCount(spec:FlowwrapSpec, requested?:number) {
  const pair = spec.sachet?.stepPair === true
  const value = requested ?? (spec.sachet?.stepEnabled ? spec.sachet.stepCount : pair ? 2 : 1) ?? 1
  const count = Math.max(pair ? 2 : 1, Math.round(Number.isFinite(value) ? value : 1))
  return pair ? Math.ceil(count / 2) * 2 : count
}
/** Physical layout remains centred: 3A 2A 1A | 1B 2B 3B.
 * IDs stay stable when pairs are added or removed. */
export function sachetStepIds(spec:FlowwrapSpec):string[] {
  const count = sachetStepCount(spec), half = count / 2
  return Array.from({length:count}, (_,i) => spec.sachet?.stepPair
    ? i < half ? `${half-i}A` : `${i-half+1}B`
    : String(i+1))
}
export const sachetSourceId = (spec:FlowwrapSpec,id:string) => spec.sachet?.stepPair ? `1${id.endsWith("B") ? "B" : "A"}` : "1"
export function sachetActiveId(spec:FlowwrapSpec):string {
  const ids = sachetStepIds(spec), fallback = spec.sachet?.stepPair ? "1A" : "1"
  const id = ids.includes(spec.sachet?.activeStepId ?? "") ? spec.sachet!.activeStepId! : fallback
  return sachetSynced(spec) ? sachetSourceId(spec,id) : id
}
export function sachetElements(spec:FlowwrapSpec):SachetStepElements {
  const result = Object.fromEntries(keys.map(key => [key,clone(spec[key])])) as SachetStepElements
  for (const key of ["attributeBoxes","safeZones","windows","hangerSlots","halfMoonCutouts"] as const) result[key]?.forEach(item => {item.selected=false})
  // Face ownership replaces the old laneSide filter for every attribute type.
  result.attributeBoxes?.forEach(box => {delete box.laneSide; delete box.laneIndex})
  return result
}
function complete(elements:SachetStepElements):SachetStepElements {
  return Object.fromEntries(keys.map(key => [key,clone(elements[key])])) as SachetStepElements
}
export function initialiseSachetSteps(spec:FlowwrapSpec):FlowwrapSpec {
  if (!spec.sachet || spec.sachet.activeStepId) return spec
  const activeStepId = spec.sachet.stepPair ? "1A" : "1"
  const first = sachetElements(spec), states:Record<string,SachetStepElements> = {}
  if (spec.sachet.stepPair) {
    // Existing explicit back-face presets remain on B. Unassigned objects get
    // one owner (A), never duplicated onto the opposite face.
    first.attributeBoxes = sachetElements({...spec,attributeBoxes:spec.attributeBoxes?.filter(b=>b.laneSide!=="B")}).attributeBoxes
    states["1B"] = {attributeBoxes:sachetElements({...spec,attributeBoxes:spec.attributeBoxes?.filter(b=>b.laneSide==="B")}).attributeBoxes,
      safeZones:[],windows:[],hangerSlots:[],halfMoonCutouts:[],foldLines:clone(spec.foldLines)}
  }
  states[activeStepId] = first
  const next = {...spec,...first,sachet:{...spec.sachet,activeStepId,elementsByStep:states,stepCount:sachetStepCount(spec)}}
  for (const id of sachetStepIds(next)) if (!states[id]) states[id] = complete(states[sachetSourceId(next,id)])
  return next
}
export function getSachetStepSpec(input:FlowwrapSpec,id:string):FlowwrapSpec {
  const spec=initialiseSachetSteps(input), active=sachetActiveId(spec)
  const owner=sachetSynced(spec)?sachetSourceId(spec,id):id
  const elements=owner===active?sachetElements(spec):complete(spec.sachet?.elementsByStep?.[owner]??{})
  if (id===active) return {...spec,...elements,attributeBoxes:clone(spec.attributeBoxes),safeZones:clone(spec.safeZones),windows:clone(spec.windows),hangerSlots:clone(spec.hangerSlots),halfMoonCutouts:clone(spec.halfMoonCutouts)}
  return {...spec,...elements}
}
export function activateSachetStep(input:FlowwrapSpec,id:string):FlowwrapSpec {
  const spec=initialiseSachetSteps(input)
  if (!sachetStepIds(spec).includes(id)) return spec
  const target=sachetSynced(spec)?sachetSourceId(spec,id):id, active=sachetActiveId(spec)
  if(target===active)return spec
  const states={...spec.sachet?.elementsByStep,[active]:sachetElements(spec)}
  return {...spec,...complete(states[target]??{}),sachet:{...spec.sachet,activeStepId:target,elementsByStep:states}}
}
export function setSachetSync(input:FlowwrapSpec,syncMirror:boolean):FlowwrapSpec {
  const spec=initialiseSachetSteps(input)
  if(sachetSynced(spec)===syncMirror)return spec
  const active=sachetActiveId(spec), states={...spec.sachet?.elementsByStep,[active]:sachetElements(spec)}
  // Unlink freezes exactly what is visible. No stale hidden snapshots can
  // overwrite changes made while linked.
  if(!syncMirror)for(const id of sachetStepIds(spec))states[id]=sachetElements(getSachetStepSpec(spec,id))
  const target=syncMirror?sachetSourceId(spec,active):active
  return {...spec,...complete(states[target]??{}),sachet:{...spec.sachet,syncMirror,activeStepId:target,elementsByStep:states}}
}
export function setSachetStepCount(input:FlowwrapSpec,requested:number):FlowwrapSpec {
  let spec=initialiseSachetSteps(input)
  const count=sachetStepCount(spec,requested), active=sachetActiveId(spec)
  const states={...spec.sachet?.elementsByStep,[active]:sachetElements(spec)}
  const next={...spec,sachet:{...spec.sachet,stepCount:count,stepEnabled:count>1,elementsByStep:states}}
  const ids=sachetStepIds(next)
  for(const id of ids)if(!states[id])states[id]=complete(states[sachetSourceId(next,id)]??{})
  if(!ids.includes(active))spec={...next,...complete(states[sachetSourceId(next,active)]??{}),sachet:{...next.sachet,activeStepId:sachetSourceId(next,active)}}
  else spec=next
  return spec
}
/** Reuse the established cutter-local movement constraints, then resolve the
 * destination's face owner. A->B changes ownership, never duplicates it. */
export function commitSachetStepEdit(before:FlowwrapSpec,edited:FlowwrapSpec,intent?:PaperStripMoveIntent):FlowwrapSpec {
  if(!intent || intent.id.startsWith("eye-mark:"))return edited
  const ids=sachetStepIds(before),active=sachetActiveId(before),index=ids.indexOf(active)
  const states=Object.fromEntries(ids.map((id,i)=>[i,sachetElements(getSachetStepSpec(before,id))]))
  const stepping={stepCount:ids.length,gap:0,syncMirror:false,activeStep:index,elementsByStep:states}
  const proxy={...before,paperStrip:{stepping}}
  const result=commitPaperStripStepEdit(proxy,{...edited,paperStrip:{stepping}},intent)
  // A transfer is identified by an item leaving the active collection.
  const removed=keys.some(key=>Array.isArray(before[key]) && (result[key] as unknown[]|undefined)?.length!==(before[key] as unknown[]).length)
  if(!removed && !(before.perfs && !result.perfs))return edited
  const nextStates={...before.sachet?.elementsByStep,[active]:sachetElements(result)}
  for(let i=0;i<ids.length;i++)if(i!==index && JSON.stringify(result.paperStrip?.stepping?.elementsByStep?.[i])!==JSON.stringify(states[i])){
    const owner=sachetSynced(before)?sachetSourceId(before,ids[i]):ids[i]
    // Moving to a linked copy of this same face is just a local reposition.
    if(owner===active){
      const target=result.paperStrip!.stepping!.elementsByStep![i]
      const local={...edited}
      for(const key of ["attributeBoxes","safeZones","windows","hangerSlots","halfMoonCutouts","foldLines"] as const){
        const old=before[key]??[],arr=target[key]??[]
        if(arr.length>old.length){const moved=arr[arr.length-1];(local as unknown as Record<string,unknown>)[key]=old.map(item=>item.id===intent.id.split(":").slice(1).join(":")?{...moved,id:item.id}:item)}
      }
      return local
    }
    nextStates[owner]=complete(result.paperStrip!.stepping!.elementsByStep![i])
  }
  const {paperStrip:_,...next}=result
  return {...next,sachet:{...edited.sachet,elementsByStep:nextStates}}
}
