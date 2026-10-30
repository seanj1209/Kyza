import { DEFAULT_PREFERENCES, loadMoveIncrementMm } from "../kyza/account/preferenceService"

/**
 * AMENDS 6.1 — mouse movement grid for selected objects/elements.
 *
 * The *resulting coordinate* is rounded to the grid (0.25 mm by default), not
 * the drag delta: an element starting at 9.4 mm lands on 9.5, never 9.65.
 * Only movement uses this; resize and rotation keep their own stepping.
 */
export const DEFAULT_MOVE_INCREMENT_MM: number = DEFAULT_PREFERENCES.moveIncrementMm
const TOLERANCE = 1e-9

export function getMoveIncrementMm(): number {
  try {
    return loadMoveIncrementMm()
  } catch {
    return DEFAULT_MOVE_INCREMENT_MM
  }
}

const clean = (value: number) => {
  const fixed = Number(value.toFixed(4))
  return Object.is(fixed, -0) ? 0 : fixed
}

export const isOnMoveGrid = (value: number, step = DEFAULT_MOVE_INCREMENT_MM) =>
  Math.abs(value / step - Math.round(value / step)) < 1e-6

/** Nearest grid coordinate (0.25 mm grid by default). */
export function snapMoveCoordinate(value: number, step = getMoveIncrementMm()): number {
  if (!Number.isFinite(value) || !(step > 0)) return value
  return clean(Math.round(value / step) * step)
}

/**
 * Snap a set of coordinates on an element, then let the element's own
 * constraint (bounds, seal clearance, lane rules) have its say. If the
 * constraint moved a coordinate off the grid, step onto the nearest grid point
 * back towards the previous position and keep it when the constraint accepts
 * it unchanged. Only when no grid point fits does the constraint's value stand.
 */
export function snapMovedElement<T extends object>(
  requested: T,
  keys: readonly (keyof T)[],
  constrain: (next: T) => T,
  previous: T,
  step = getMoveIncrementMm()
): T {
  const read = (item: T, key: keyof T) => item[key] as unknown as number
  const snapped = { ...requested }
  keys.forEach(key => { (snapped as Record<keyof T, unknown>)[key] = snapMoveCoordinate(read(requested, key), step) })
  const constrained = constrain(snapped)
  const unchanged = (a: T, b: T) => keys.every(key => Math.abs(read(a, key) - read(b, key)) < TOLERANCE)
  if (unchanged(constrained, snapped)) return constrained
  const inward = { ...constrained }
  keys.forEach(key => {
    const value = read(constrained, key)
    if (isOnMoveGrid(value, step)) return
    const towards = read(previous, key) < value ? Math.floor(value / step) * step : Math.ceil(value / step) * step
    ;(inward as Record<keyof T, unknown>)[key] = clean(towards)
  })
  const settled = constrain(inward)
  return unchanged(settled, inward) ? settled : constrained
}

/** One coordinate kept inside [min, max] while staying on the grid where the grid fits. */
export function snapMoveWithin(value: number, min: number, max: number, previous = value, step = getMoveIncrementMm()): number {
  const lo = Math.min(min, max), hi = Math.max(min, max)
  return snapMovedElement(
    { value },
    ["value"],
    next => ({ value: Math.min(hi, Math.max(lo, next.value)) }),
    { value: previous },
    step
  ).value
}
