import type { FlowwrapSpec, LiddingSpec } from "../types/flowwrap"

type Elements = NonNullable<LiddingSpec["elementsByLane"]>[string]
const clone = <T>(value: T): T => value === undefined ? value : JSON.parse(JSON.stringify(value))
const keys = ["safeZones", "attributeBoxes", "windows"] as const

export const liddingSynced = (spec: FlowwrapSpec) => spec.lidding?.syncMirror !== false
export const liddingActiveLane = (spec: FlowwrapSpec) =>
  liddingSynced(spec) ? 0 : Math.max(0, Math.min((spec.lidding?.across ?? 1) - 1, Number.parseInt(spec.lidding?.activeStep ?? "1A", 10) - 1 || 0))

export function liddingElements(spec: FlowwrapSpec): Elements {
  return Object.fromEntries(keys.map(key => [key, clone(spec[key])])) as Elements
}

const unselect = (elements: Elements): Elements => {
  const next = clone(elements)
  for (const key of keys) {
    if (!(key in next)) (next as Record<string, unknown>)[key] = undefined
    next[key]?.forEach(item => { item.selected = false })
  }
  return next
}

export function liddingLaneElements(spec: FlowwrapSpec, column: number): Elements {
  if (liddingSynced(spec) || column === liddingActiveLane(spec)) return liddingElements(spec)
  return clone(spec.lidding?.elementsByLane?.[column] ?? spec.lidding?.elementsByLane?.[0] ?? unselect(liddingElements(spec)))
}

/** The top-level collections are the currently edited lane; rows B/C repeat it. */
export function activateLiddingLane(spec: FlowwrapSpec, column: number): FlowwrapSpec {
  if (!spec.lidding || liddingSynced(spec)) return spec
  const target = Math.max(0, Math.min(spec.lidding.across - 1, Math.round(column)))
  const active = liddingActiveLane(spec)
  if (target === active) return spec
  const elementsByLane = { ...spec.lidding.elementsByLane, [active]: unselect(liddingElements(spec)) }
  const elements = unselect(elementsByLane[target] ?? elementsByLane[0])
  return { ...spec, ...elements, lidding: { ...spec.lidding, activeStep: `${target + 1}A`, elementsByLane } }
}

export function setLiddingSync(spec: FlowwrapSpec, synced: boolean): FlowwrapSpec {
  if (!spec.lidding || liddingSynced(spec) === synced) return spec
  const source = synced ? activateLiddingLane(spec, 0) : spec
  const first = unselect(liddingElements(source))
  const elementsByLane: NonNullable<LiddingSpec["elementsByLane"]> = {}
  for (let column = 0; column < spec.lidding.across; column++) elementsByLane[column] = clone(first)
  return { ...source, lidding: { ...source.lidding!, syncMirror: synced, activeStep: "1A", elementsByLane } }
}

export function commitLiddingLaneElements(before: FlowwrapSpec, edited: FlowwrapSpec): FlowwrapSpec {
  if (!before.lidding || liddingSynced(before)) return edited
  if (keys.every(key => JSON.stringify(before[key]) === JSON.stringify(edited[key]))) return edited
  const active = liddingActiveLane(before)
  return {
    ...edited,
    lidding: {
      ...edited.lidding!,
      elementsByLane: { ...edited.lidding?.elementsByLane, [active]: unselect(liddingElements(edited)) },
    },
  }
}
